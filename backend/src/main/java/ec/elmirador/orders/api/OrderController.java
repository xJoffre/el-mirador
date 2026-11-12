package ec.elmirador.orders.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.orders.domain.OrderRepository.Cancellation;
import ec.elmirador.orders.domain.OrderRepository.Closing;
import ec.elmirador.orders.domain.OrderRepository.KitchenTicket;
import ec.elmirador.orders.domain.OrderRepository.NewOrder;
import ec.elmirador.orders.domain.OrderRepository.OrderView;
import ec.elmirador.orders.domain.OrderRepository.PaymentView;
import ec.elmirador.orders.domain.OrderRepository.Placed;
import ec.elmirador.orders.domain.OrderService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/orders")
class OrderController {

	private final OrderService orders;

	OrderController(OrderService orders) {
		this.orders = orders;
	}

	@PostMapping
	Placed placeOrder(@Valid @RequestBody NewOrder order) {
		return orders.place(order);
	}

	@GetMapping("/tracking/{token}")
	OrderView getTracking(@PathVariable String token) {
		return orders.track(token);
	}

	@GetMapping("/today")
	List<OrderView> getTodayOrders() {
		return orders.today();
	}

	@GetMapping("/kitchen")
	List<KitchenTicket> getKitchen() {
		return orders.kitchen();
	}

	@PutMapping("/rounds/{id}/start")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void startRound(@PathVariable long id) {
		orders.startRound(id);
	}

	@PutMapping("/rounds/{id}/ready")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void finishRound(@PathVariable long id) {
		orders.finishRound(id);
	}

	@PostMapping("/{id}/cancel")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void cancelOrder(@PathVariable long id, @Valid @RequestBody Cancellation cancellation,
			@AuthenticationPrincipal(expression = "id()") long staffId) {
		orders.cancel(id, cancellation.reason(), staffId);
	}

	@GetMapping("/payments/{day}")
	List<PaymentView> getPayments(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day) {
		return orders.payments(day);
	}

	@PutMapping("/payments/{id}/verified")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void verifyPayment(@PathVariable long id, @AuthenticationPrincipal(expression = "id()") long staffId) {
		orders.verifyPayment(id, staffId);
	}

	@PostMapping("/{id}/close")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void closeOrder(@PathVariable long id, @Valid @RequestBody Closing closing, @AuthenticationPrincipal(expression = "id()") long staffId) {
		orders.close(id, closing, staffId);
	}

}
