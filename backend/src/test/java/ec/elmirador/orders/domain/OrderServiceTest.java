package ec.elmirador.orders.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import org.junit.jupiter.api.Test;

import ec.elmirador.menu.domain.DishKind;
import ec.elmirador.menu.domain.Menu;
import ec.elmirador.menu.domain.MenuRepository.DailyDish;
import ec.elmirador.menu.domain.MenuRepository.Variant;
import ec.elmirador.orders.domain.OrderRepository.Closing;
import ec.elmirador.orders.domain.OrderRepository.KitchenTicket;
import ec.elmirador.orders.domain.OrderRepository.LineKind;
import ec.elmirador.orders.domain.OrderRepository.NewLine;
import ec.elmirador.orders.domain.OrderRepository.NewOrder;
import ec.elmirador.orders.domain.OrderRepository.NewPayment;
import ec.elmirador.orders.domain.OrderRepository.OrderView;
import ec.elmirador.orders.domain.OrderRepository.PaymentMethod;
import ec.elmirador.orders.domain.OrderRepository.Placed;
import ec.elmirador.orders.domain.OrderRepository.Totals;
import ec.elmirador.schedule.domain.Schedule;
import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;
import ec.elmirador.schedule.domain.StoreStatus;
import ec.elmirador.shared.ApiException;

class OrderServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

	private static final Map<String, String> NAME = Map.of("es", "x");

	private static final Menu.OptionGroup SAUCE = new Menu.OptionGroup(1, NAME, 1, 1,
			List.of(new Menu.OptionItem(11, NAME, false), new Menu.OptionItem(12, NAME, true)));

	private static Menu.Product product(long id, boolean soldOut, boolean dineInOnly, List<Menu.OptionGroup> groups) {
		return new Menu.Product(id, NAME, null, dineInOnly, soldOut, null, List.of(new Variant(id * 10, null, BigDecimal.ONE, "USD")), groups);
	}

	private static final Menu MENU = new Menu(
			List.of(new Menu.Category(1, NAME, null, "utensils",
					List.of(product(1, false, false, List.of()), product(2, true, false, List.of()), product(3, false, true, List.of()),
							product(4, false, false, List.of(SAUCE))))),
			NAME,
			List.of(new DailyDish(7, DishKind.soup, NAME, null, BigDecimal.ONE, "USD", false),
					new DailyDish(8, DishKind.main, NAME, BigDecimal.TEN, BigDecimal.ONE, "USD", false),
					new DailyDish(9, DishKind.main, NAME, BigDecimal.TEN, BigDecimal.ONE, "USD", true)));

	private static Schedule schedule(StoreStatus status, boolean lunchNow) {
		var hours = new Hours(null, null, null, null);
		return new Schedule(TODAY, new StoreProfile("El Mirador", null, null, null, null), Map.of(), hours,
				new Status(status, null, null, null), lunchNow);
	}

	static class InMemoryOrders implements OrderRepository {

		final List<NewOrder> placed = new ArrayList<>();

		final List<String> statuses = new ArrayList<>();

		Totals totals = new Totals("open", new BigDecimal("12.50"), BigDecimal.ZERO, "USD");

		@Override
		public int openOrders(String customerPhone) {
			return (int) placed.stream().filter(order -> order.customerPhone().equals(customerPhone)).count();
		}

		@Override
		public Placed place(NewOrder order, LocalDate menuDate, String trackingToken) {
			placed.add(order);
			return new Placed(placed.size(), trackingToken, BigDecimal.ONE, "USD");
		}

		@Override
		public Optional<OrderView> track(String trackingToken) {
			return Optional.empty();
		}

		@Override
		public List<OrderView> since(OffsetDateTime since) {
			return List.of();
		}

		@Override
		public List<KitchenTicket> kitchen() {
			return List.of();
		}

		@Override
		public boolean startRound(long roundId) {
			return true;
		}

		@Override
		public boolean finishRound(long roundId) {
			return true;
		}

		@Override
		public Optional<Totals> totals(long orderId) {
			return Optional.of(totals);
		}

		@Override
		public void pay(long orderId, List<NewPayment> payments, long staffId) {
		}

		@Override
		public void changeStatus(long orderId, String status, String reason, long staffId) {
			statuses.add(status);
		}

		@Override
		public List<OrderRepository.PaymentView> payments(OffsetDateTime since) {
			return List.of();
		}

		@Override
		public boolean verifyPayment(long paymentId, long staffId) {
			return true;
		}

	}

	private final InMemoryOrders orders = new InMemoryOrders();

	private OrderService service(StoreStatus status, boolean lunchNow) {
		var offer = new Offer() {

			@Override
			public Menu menu() {
				return MENU;
			}

			@Override
			public Schedule schedule() {
				return OrderServiceTest.schedule(status, lunchNow);
			}

		};
		return new OrderService(orders, offer, Clock.system(ZoneId.of("America/Guayaquil")), event -> {
		});
	}

	private static NewOrder order(NewLine... lines) {
		return new NewOrder("Ana", "593999999999", null, null, List.of(lines), null);
	}

	private static NewLine product(long variant, Long... options) {
		return new NewLine(LineKind.product, variant, List.of(options), null, null, 1, null);
	}

	private static NewLine lunch(LineKind kind, Long soup, Long main) {
		return new NewLine(kind, null, null, soup, main, 1, null);
	}

	private String outcome(OrderService service, NewOrder order) {
		try {
			service.place(order);
			return "placed";
		}
		catch (ApiException error) {
			return (String) error.getBody().getProperties().get("code");
		}
	}

	@Test
	void everyReasonToRefuseAnOrderHasItsOwnCode() {
		var open = service(StoreStatus.open, true);

		assertThat(outcome(service(StoreStatus.closed, true), order(product(10)))).isEqualTo("orders.storeClosed");
		assertThat(outcome(service(StoreStatus.open, false), order(lunch(LineKind.lunch_full, 7L, 8L)))).isEqualTo("orders.lunchClosed");
		assertThat(outcome(open, order(product(20)))).isEqualTo("orders.soldOut");
		assertThat(outcome(open, order(lunch(LineKind.lunch_main, null, 9L)))).isEqualTo("orders.soldOut");
		assertThat(outcome(open, order(product(40, 12L)))).isEqualTo("orders.soldOut");
		assertThat(outcome(open, order(product(30)))).isEqualTo("orders.dineInOnly");
		assertThat(outcome(open, order(product(40)))).isEqualTo("orders.missingChoice");
		assertThat(outcome(open, order(product(999)))).isEqualTo("orders.unavailable");
		assertThat(outcome(open, order(lunch(LineKind.lunch_full, 8L, 7L)))).isEqualTo("orders.unavailable");
		assertThat(outcome(open, order(lunch(LineKind.lunch_soup, 7L, 8L)))).isEqualTo("orders.unavailable");
		assertThat(orders.placed).isEmpty();
	}

	@Test
	void onePhoneCannotKeepMoreThanThreeOrdersOpen() {
		var open = service(StoreStatus.open, true);
		for (int count = 0; count < OrderService.MAX_OPEN_ORDERS_PER_PHONE; count++) {
			assertThat(outcome(open, order(product(10)))).isEqualTo("placed");
		}

		assertThat(outcome(open, order(product(10)))).isEqualTo("orders.tooMany");
		assertThat(outcome(open, new NewOrder("Luis", "593988888888", null, null, List.of(product(10)), null))).isEqualTo("placed");
	}

	@Test
	void aValidOrderIsPlacedEvenWhenTheStoreIsBusy() {
		var busy = service(StoreStatus.delayed, true);

		var outcome = outcome(busy, order(product(10), product(40, 11L), lunch(LineKind.lunch_full, 7L, 8L), lunch(LineKind.lunch_soup, 7L, null)));

		assertThat(outcome).isEqualTo("placed");
		assertThat(orders.placed).hasSize(1);
	}

	@Test
	void anOrderClosesOnlyWhenItIsFullyPaid() {
		var service = service(StoreStatus.open, true);
		Function<String, Closing> cash = amount -> new Closing(List.of(new NewPayment(PaymentMethod.cash, new BigDecimal(amount))));

		assertThat(closeOutcome(service, cash.apply("12.49"))).isEqualTo("orders.paymentShort");
		assertThat(closeOutcome(service, new Closing(List.of(new NewPayment(PaymentMethod.cash, new BigDecimal("10.00")),
				new NewPayment(PaymentMethod.transfer, new BigDecimal("2.50")))))).isEqualTo("closed");
		orders.totals = new Totals("closed", new BigDecimal("12.50"), new BigDecimal("12.50"), "USD");
		assertThat(closeOutcome(service, cash.apply("12.50"))).isEqualTo("orders.notOpen");
	}

	@Test
	void onlyAnOpenOrderCanBeCancelled() {
		var service = service(StoreStatus.open, true);

		service.cancel(1, "Se acabó el seco", 1);
		orders.totals = new Totals("cancelled", new BigDecimal("12.50"), BigDecimal.ZERO, "USD");

		assertThat(orders.statuses).containsExactly("cancelled");
		try {
			service.cancel(1, "otra vez", 1);
		}
		catch (ApiException error) {
			assertThat(error.getBody().getProperties()).containsEntry("code", "orders.notOpen");
		}
		assertThat(orders.statuses).containsExactly("cancelled");
	}

	@Test
	void theStateOfAnOrderComesFromItsKitchenRounds() {
		assertThat(OrderState.of("open", false, false)).isEqualTo(OrderState.received);
		assertThat(OrderState.of("open", false, true)).isEqualTo(OrderState.preparing);
		assertThat(OrderState.of("open", true, true)).isEqualTo(OrderState.ready);
		assertThat(OrderState.of("closed", true, true)).isEqualTo(OrderState.delivered);
		assertThat(OrderState.of("cancelled", false, false)).isEqualTo(OrderState.cancelled);
	}

	private String closeOutcome(OrderService service, Closing closing) {
		try {
			service.close(1, closing, 1);
			return orders.statuses.getLast();
		}
		catch (ApiException error) {
			return (String) error.getBody().getProperties().get("code");
		}
	}

}
