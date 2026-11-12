package ec.elmirador.orders.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public interface OrderRepository {

	Placed place(NewOrder order, LocalDate menuDate, String trackingToken);

	int openOrders(String customerPhone);

	Optional<OrderView> track(String trackingToken);

	List<OrderView> since(OffsetDateTime since);

	List<KitchenTicket> kitchen();

	boolean startRound(long roundId);

	boolean finishRound(long roundId);

	Optional<Totals> totals(long orderId);

	void pay(long orderId, List<NewPayment> payments, long staffId);

	void changeStatus(long orderId, String status, @Nullable String reason, long staffId);

	List<PaymentView> payments(OffsetDateTime since);

	boolean verifyPayment(long paymentId, long staffId);

	enum LineKind {

		product, lunch_full, lunch_soup, lunch_main

	}

	enum PaymentMethod {

		cash, transfer

	}

	record NewOrder(@NotBlank @Size(max = 80) String customerName, @Pattern(regexp = "[0-9]{7,15}") String customerPhone,
			@Nullable @Size(max = 300) String deliveryAddress, @Nullable @Size(max = 300) String note,
			@NotEmpty @Size(max = 40) List<@Valid NewLine> lines, @Nullable @Valid InvoiceDetails invoice) {
	}

	enum IdType {

		cedula, ruc, passport

	}

	record InvoiceDetails(@NotNull IdType idType, @NotBlank @Size(max = 20) String idNumber, @NotBlank @Size(max = 120) String name,
			@NotBlank @Email @Size(max = 120) String email, @Nullable @Size(max = 300) String address) {
	}

	record OrderPlaced(long orderId, InvoiceDetails invoice) {
	}

	record Cancellation(@NotBlank @Size(max = 300) String reason) {
	}

	record PaymentView(long id, long orderId, String customerName, PaymentMethod method, BigDecimal amount, String currency,
			OffsetDateTime createdAt, boolean verified) {
	}

	record NewLine(@NotNull LineKind kind, @Nullable Long productVariantId, @Nullable List<Long> optionItemIds,
			@Nullable Long soupDishId, @Nullable Long mainDishId, @Min(1) @Max(50) int quantity, @Nullable @Size(max = 200) String note) {
	}

	record Placed(long id, String trackingToken, BigDecimal total, String currency) {
	}

	record LineView(long id, LineKind kind, int quantity, BigDecimal unitPrice, String currency, @Nullable String note,
			@Nullable Map<String, String> product, @Nullable Map<String, String> variant, List<Map<String, String>> options,
			@Nullable Map<String, String> soup, @Nullable Map<String, String> main) {
	}

	record OrderView(long id, OrderState state, @Nullable String deliveryAddress, String customerName, String customerPhone,
			@Nullable String note, BigDecimal total, String currency, BigDecimal paid, OffsetDateTime createdAt,
			@Nullable OffsetDateTime readyAt, @Nullable String cancelReason, boolean invoice, List<LineView> lines) {
	}

	record KitchenTicket(long roundId, long orderId, @Nullable String deliveryAddress, String customerName, @Nullable String note,
			OffsetDateTime createdAt, @Nullable OffsetDateTime startedAt, List<LineView> lines) {
	}

	record Totals(String status, BigDecimal total, BigDecimal paid, String currency) {
	}

	record NewPayment(@NotNull PaymentMethod method, @NotNull @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal amount) {
	}

	record Closing(@NotEmpty List<@Valid NewPayment> payments) {
	}

}
