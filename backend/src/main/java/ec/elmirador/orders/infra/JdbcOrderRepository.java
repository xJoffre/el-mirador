package ec.elmirador.orders.infra;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.orders.domain.OrderRepository;
import ec.elmirador.orders.domain.OrderState;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Repository
class JdbcOrderRepository implements OrderRepository {

	private static final String LINES = """
			coalesce((
			  select json_agg(x order by x.id) from (
			    select l.id, l.kind, l.quantity, l.unit_price, l.currency, l.note,
			      p.name as product, v.name as variant, sd.name as soup, md.name as main,
			      coalesce((select json_agg(i.name order by i.sort_order, i.id) from order_line_option lo
			        join option_item i on i.id = lo.option_item_id where lo.order_line_id = l.id), '[]') as options
			    from order_line l
			    join order_round lr on lr.id = l.order_round_id
			    left join product_variant v on v.id = l.product_variant_id
			    left join product p on p.id = v.product_id
			    left join lunch_dish sd on sd.id = l.soup_dish_id
			    left join lunch_dish md on md.id = l.main_dish_id
			    where %s
			  ) x
			), '[]')
			""";

	private static final String ORDERS = """
			select coalesce(json_agg(o order by o.created_at desc), '[]') from (
			  select o.id, o.status, o.delivery_address, o.customer_name, o.customer_phone, o.note, o.total, o.currency, o.created_at,
			    coalesce((select sum(amount) from payment where customer_order_id = o.id), 0) as paid,
			    coalesce((select bool_and(r.ready_at is not null) from order_round r where r.customer_order_id = o.id), false) as all_ready,
			    coalesce((select bool_or(r.started_at is not null) from order_round r where r.customer_order_id = o.id), false) as any_started,
			    (select max(r.ready_at) from order_round r where r.customer_order_id = o.id) as ready_at,
			    (select reason from order_status_change c where c.customer_order_id = o.id and c.status = 'cancelled') as cancel_reason,
			    exists (select 1 from invoice_request i where i.customer_order_id = o.id) as invoice,
			    %s as lines
			  from customer_order o where %s
			) o
			""".formatted(LINES.formatted("lr.customer_order_id = o.id"), "%s");

	private final JdbcClient jdbc;

	private final JsonMapper json;

	JdbcOrderRepository(JdbcClient jdbc, JsonMapper json) {
		this.jdbc = jdbc;
		this.json = json;
	}

	@Override
	public int openOrders(String customerPhone) {
		return jdbc.sql("select count(*) from customer_order where customer_phone = :phone and status = 'open'")
			.param("phone", customerPhone)
			.query(Integer.class)
			.single();
	}

	@Override
	public Placed place(NewOrder order, LocalDate menuDate, String trackingToken) {
		var id = jdbc.sql("""
				insert into customer_order (tracking_token, kind, delivery_address, channel, customer_name, customer_phone, note)
				values (:token, 'takeaway', :address, 'web', :name, :phone, :note) returning id
				""")
			.param("token", trackingToken)
			.param("address", blankToNull(order.deliveryAddress()))
			.param("name", order.customerName().strip())
			.param("phone", order.customerPhone())
			.param("note", blankToNull(order.note()))
			.query(Long.class)
			.single();
		jdbc.sql("insert into order_status_change (customer_order_id, status) values (:id, 'open')").param("id", id).update();
		var round = jdbc.sql("insert into order_round (customer_order_id) values (:id) returning id").param("id", id).query(Long.class).single();
		for (var line : order.lines()) {
			var lineId = jdbc.sql("""
					insert into order_line (order_round_id, kind, product_variant_id, menu_date, soup_dish_id, main_dish_id, quantity, note)
					values (:round, :kind, :variant, :menuDate, :soup, :main, :quantity, :note) returning id
					""")
				.param("round", round)
				.param("kind", line.kind().name())
				.param("variant", line.productVariantId())
				.param("menuDate", line.kind() == LineKind.product ? null : menuDate)
				.param("soup", line.soupDishId())
				.param("main", line.mainDishId())
				.param("quantity", line.quantity())
				.param("note", blankToNull(line.note()))
				.query(Long.class)
				.single();
			if (line.optionItemIds() != null) {
				line.optionItemIds()
					.stream()
					.distinct()
					.forEach(item -> jdbc.sql("insert into order_line_option (order_line_id, option_item_id) values (:line, :item)")
						.param("line", lineId)
						.param("item", item)
						.update());
			}
		}
		return jdbc.sql("select id, tracking_token, total, currency from customer_order where id = :id").param("id", id).query(Placed.class).single();
	}

	@Override
	public Optional<OrderView> track(String trackingToken) {
		return orders("o.tracking_token = :token", Map.of("token", trackingToken)).stream().findFirst();
	}

	@Override
	public List<OrderView> since(OffsetDateTime since) {
		return orders("o.created_at >= :since or o.status = 'open'", Map.of("since", since));
	}

	@Override
	public List<KitchenTicket> kitchen() {
		var tickets = jdbc.sql("""
				select coalesce(json_agg(t order by t.created_at), '[]') from (
				  select r.id as round_id, o.id as order_id, o.delivery_address, o.customer_name, o.note, r.created_at, r.started_at,
				    %s as lines
				  from order_round r join customer_order o on o.id = r.customer_order_id
				  where r.ready_at is null and o.status = 'open'
				) t
				""".formatted(LINES.formatted("lr.id = r.id"))).query(String.class).single();
		return json.readValue(tickets, new TypeReference<List<KitchenTicket>>() {
		});
	}

	@Override
	public boolean startRound(long roundId) {
		return jdbc.sql("update order_round set started_at = coalesce(started_at, now()) where id = :id").param("id", roundId).update() == 1;
	}

	@Override
	public boolean finishRound(long roundId) {
		return jdbc.sql("update order_round set started_at = coalesce(started_at, now()), ready_at = coalesce(ready_at, now()) where id = :id")
			.param("id", roundId)
			.update() == 1;
	}

	@Override
	public Optional<Totals> totals(long orderId) {
		return jdbc.sql("""
				select status, total, currency, coalesce((select sum(amount) from payment where customer_order_id = o.id), 0) as paid
				from customer_order o where id = :id
				""").param("id", orderId).query(Totals.class).optional();
	}

	@Override
	public void pay(long orderId, List<NewPayment> payments, long staffId) {
		for (var payment : payments) {
			jdbc.sql("""
					insert into payment (customer_order_id, method, amount, currency, created_by)
					select id, :method, :amount, currency, :staff from customer_order where id = :id
					""")
				.param("id", orderId)
				.param("method", payment.method().name())
				.param("amount", payment.amount())
				.param("staff", staffId)
				.update();
		}
	}

	@Override
	public void changeStatus(long orderId, String status, String reason, long staffId) {
		jdbc.sql("insert into order_status_change (customer_order_id, status, reason, created_by) values (:id, :status, :reason, :staff)")
			.param("id", orderId)
			.param("status", status)
			.param("reason", reason)
			.param("staff", staffId)
			.update();
	}

	@Override
	public List<PaymentView> payments(OffsetDateTime since) {
		return jdbc.sql("""
				select p.id, p.customer_order_id as order_id, o.customer_name, p.method, p.amount, p.currency, p.created_at,
				  p.verified_at is not null as verified
				from payment p join customer_order o on o.id = p.customer_order_id
				where p.created_at >= :since or (p.method = 'transfer' and p.verified_at is null)
				order by p.created_at desc
				""").param("since", since).query(PaymentView.class).list();
	}

	@Override
	public boolean verifyPayment(long paymentId, long staffId) {
		return jdbc.sql("""
				update payment set verified_by = :staff, verified_at = now()
				where id = :id and method = 'transfer' and verified_at is null
				""").param("id", paymentId).param("staff", staffId).update() == 1;
	}

	private List<OrderView> orders(String filter, Map<String, ?> params) {
		var rows = jdbc.sql(ORDERS.formatted(filter)).params(params).query(String.class).single();
		return json.readValue(rows, new TypeReference<List<Map<String, Object>>>() {
		}).stream().map(this::view).toList();
	}

	private OrderView view(Map<String, Object> row) {
		var state = OrderState.of((String) row.get("status"), (Boolean) row.get("all_ready"), (Boolean) row.get("any_started"));
		var withState = new HashMap<>(row);
		withState.put("state", state.name());
		return json.convertValue(withState, OrderView.class);
	}

	private static String blankToNull(String text) {
		return text == null || text.isBlank() ? null : text.strip();
	}

}
