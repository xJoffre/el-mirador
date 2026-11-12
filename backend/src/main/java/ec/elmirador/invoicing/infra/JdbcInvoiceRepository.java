package ec.elmirador.invoicing.infra;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.invoicing.domain.InvoiceRepository;
import ec.elmirador.orders.domain.OrderRepository.InvoiceDetails;

@Repository
class JdbcInvoiceRepository implements InvoiceRepository {

	private final JdbcClient jdbc;

	JdbcInvoiceRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void request(long orderId, InvoiceDetails details) {
		jdbc.sql("""
				insert into invoice_request (customer_order_id, id_type, id_number, name, email, address)
				values (:order, :idType, :idNumber, :name, :email, :address)
				""")
			.param("order", orderId)
			.param("idType", details.idType().name())
			.param("idNumber", details.idNumber())
			.param("name", details.name())
			.param("email", details.email())
			.param("address", details.address() == null || details.address().isBlank() ? null : details.address().strip())
			.update();
	}

	@Override
	public List<InvoiceRequest> requests(OffsetDateTime since) {
		return jdbc.sql("""
				select i.id, i.customer_order_id as order_id, o.status as order_status, i.id_type, i.id_number, i.name, i.email,
				  i.address, i.invoice_number, o.total, o.currency, i.created_at
				from invoice_request i join customer_order o on o.id = i.customer_order_id
				where (i.status = 'pending' and o.status <> 'cancelled') or i.created_at >= :since
				order by i.status desc, i.created_at
				""").param("since", since).query(InvoiceRequest.class).list();
	}

	@Override
	public boolean issue(long id, String invoiceNumber, long staffId) {
		return jdbc.sql("""
				update invoice_request i set status = 'issued', invoice_number = :number, verified_by = :staff
				from customer_order o where i.id = :id and o.id = i.customer_order_id and o.status = 'closed'
				""")
			.param("id", id)
			.param("number", invoiceNumber)
			.param("staff", staffId)
			.update() == 1;
	}

	@Override
	public List<Sale> sales(OffsetDateTime from, OffsetDateTime to) {
		return jdbc.sql("""
				select o.id as order_id, c.created_at as closed_at, o.customer_name, i.id_type, i.id_number, i.name as invoice_name,
				  i.email, o.total, o.currency, i.invoice_number,
				  coalesce((select sum(amount) from payment p where p.customer_order_id = o.id and p.method = 'cash'), 0) as cash,
				  coalesce((select sum(amount) from payment p where p.customer_order_id = o.id and p.method = 'transfer'), 0) as transfer
				from customer_order o
				join order_status_change c on c.customer_order_id = o.id and c.status = 'closed'
				left join invoice_request i on i.customer_order_id = o.id
				where c.created_at >= :from and c.created_at < :to
				order by c.created_at
				""").param("from", from).param("to", to).query(Sale.class).list();
	}

}
