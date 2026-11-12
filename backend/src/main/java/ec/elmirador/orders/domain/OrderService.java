package ec.elmirador.orders.domain;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ec.elmirador.menu.domain.DishKind;
import ec.elmirador.menu.domain.Menu;
import ec.elmirador.menu.domain.MenuRepository.DailyDish;
import ec.elmirador.orders.domain.OrderRepository.Closing;
import ec.elmirador.orders.domain.OrderRepository.KitchenTicket;
import ec.elmirador.orders.domain.OrderRepository.NewLine;
import ec.elmirador.orders.domain.OrderRepository.NewOrder;
import ec.elmirador.orders.domain.OrderRepository.NewPayment;
import ec.elmirador.orders.domain.OrderRepository.OrderView;
import ec.elmirador.orders.domain.OrderRepository.Placed;
import ec.elmirador.schedule.domain.StoreStatus;
import ec.elmirador.shared.ApiException;
import ec.elmirador.shared.Changed;

@Service
public class OrderService {

	public static final Changed CHANGED = new Changed("orders");

	private static final SecureRandom RANDOM = new SecureRandom();

	private final OrderRepository orders;

	private final Offer offer;

	private final Clock clock;

	private final ApplicationEventPublisher events;

	public OrderService(OrderRepository orders, Offer offer, Clock clock, ApplicationEventPublisher events) {
		this.orders = orders;
		this.offer = offer;
		this.clock = clock;
		this.events = events;
	}

	@Transactional
	public Placed place(NewOrder order) {
		var schedule = offer.schedule();
		if (schedule.status().status() == StoreStatus.closed) {
			throw rejected("orders.storeClosed");
		}
		var menu = offer.menu();
		for (var line : order.lines()) {
			if (line.kind() == OrderRepository.LineKind.product) {
				checkProduct(menu, line);
			}
			else {
				checkLunch(menu, line, schedule.lunchNow());
			}
		}
		var placed = orders.place(order, schedule.date(), token());
		events.publishEvent(CHANGED);
		return placed;
	}

	public OrderView track(String trackingToken) {
		return orders.track(trackingToken).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "orders.notFound"));
	}

	public List<OrderView> today() {
		return orders.since(LocalDate.now(clock).atStartOfDay(clock.getZone()).toOffsetDateTime());
	}

	public List<KitchenTicket> kitchen() {
		return orders.kitchen();
	}

	public void startRound(long roundId) {
		found(orders.startRound(roundId));
		events.publishEvent(CHANGED);
	}

	public void finishRound(long roundId) {
		found(orders.finishRound(roundId));
		events.publishEvent(CHANGED);
	}

	@Transactional
	public void close(long orderId, Closing closing, long staffId) {
		var totals = orders.totals(orderId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "orders.notFound"));
		if (!totals.status().equals("open")) {
			throw new ApiException(HttpStatus.CONFLICT, "orders.notOpen");
		}
		var received = closing.payments().stream().map(NewPayment::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
		if (totals.paid().add(received).compareTo(totals.total()) < 0) {
			throw new ApiException(HttpStatus.CONFLICT, "orders.paymentShort");
		}
		orders.pay(orderId, closing.payments(), staffId);
		orders.changeStatus(orderId, "closed", null, staffId);
		events.publishEvent(CHANGED);
	}

	private static void checkProduct(Menu menu, NewLine line) {
		var product = menu.categories()
			.stream()
			.flatMap(category -> category.products().stream())
			.filter(candidate -> candidate.variants().stream().anyMatch(variant -> Objects.equals(variant.id(), line.productVariantId())))
			.findFirst()
			.orElseThrow(() -> rejected("orders.unavailable"));
		if (product.soldOut()) {
			throw rejected("orders.soldOut");
		}
		if (product.dineInOnly()) {
			throw rejected("orders.dineInOnly");
		}
		var chosen = line.optionItemIds() == null ? List.<Long>of() : line.optionItemIds();
		var items = product.optionGroups().stream().flatMap(group -> group.items().stream()).toList();
		for (var id : chosen) {
			var item = items.stream().filter(candidate -> candidate.id() == id).findFirst().orElseThrow(() -> rejected("orders.unavailable"));
			if (item.soldOut()) {
				throw rejected("orders.soldOut");
			}
		}
		for (var group : product.optionGroups()) {
			var count = group.items().stream().filter(item -> chosen.contains(item.id())).count();
			if (count < group.minChoices() || count > group.maxChoices()) {
				throw rejected("orders.missingChoice");
			}
		}
	}

	private static void checkLunch(Menu menu, NewLine line, boolean lunchNow) {
		if (!lunchNow) {
			throw rejected("orders.lunchClosed");
		}
		var soupNeeded = line.kind() != OrderRepository.LineKind.lunch_main;
		var mainNeeded = line.kind() != OrderRepository.LineKind.lunch_soup;
		if (soupNeeded != (line.soupDishId() != null) || mainNeeded != (line.mainDishId() != null)) {
			throw rejected("orders.unavailable");
		}
		if (soupNeeded) {
			checkDish(menu.lunch(), line.soupDishId(), DishKind.soup);
		}
		if (mainNeeded) {
			checkDish(menu.lunch(), line.mainDishId(), DishKind.main);
		}
	}

	private static void checkDish(List<DailyDish> lunch, long id, DishKind kind) {
		var dish = lunch.stream()
			.filter(candidate -> candidate.id() == id && candidate.kind() == kind)
			.findFirst()
			.orElseThrow(() -> rejected("orders.unavailable"));
		if (dish.soldOut()) {
			throw rejected("orders.soldOut");
		}
	}

	private static String token() {
		var bytes = new byte[16];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static void found(boolean changed) {
		if (!changed) {
			throw new ApiException(HttpStatus.NOT_FOUND, "orders.notFound");
		}
	}

	private static ApiException rejected(String code) {
		return new ApiException(HttpStatus.CONFLICT, code);
	}

}
