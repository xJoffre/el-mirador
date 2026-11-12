package ec.elmirador.invoicing.domain;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import ec.elmirador.orders.domain.OrderRepository.IdType;
import ec.elmirador.orders.domain.OrderRepository.InvoiceDetails;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public interface InvoiceRepository {

	void request(long orderId, InvoiceDetails details);

	List<InvoiceRequest> requests(OffsetDateTime since);

	boolean issue(long id, String invoiceNumber, long staffId);

	List<Sale> sales(OffsetDateTime from, OffsetDateTime to);

	record InvoiceRequest(long id, long orderId, String orderStatus, IdType idType, String idNumber, String name, String email,
			@Nullable String address, @Nullable String invoiceNumber, BigDecimal total, String currency, OffsetDateTime createdAt) {
	}

	record Issue(@NotBlank @Size(max = 40) String invoiceNumber) {
	}

	record Sale(long orderId, OffsetDateTime closedAt, String customerName, @Nullable IdType idType, @Nullable String idNumber,
			@Nullable String invoiceName, @Nullable String email, BigDecimal total, BigDecimal cash, BigDecimal transfer,
			String currency, @Nullable String invoiceNumber) {
	}

}
