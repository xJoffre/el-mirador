package ec.elmirador.invoicing.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.context.MessageSource;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import ec.elmirador.invoicing.domain.InvoiceRepository.InvoiceRequest;
import ec.elmirador.invoicing.domain.InvoiceRepository.Sale;
import ec.elmirador.orders.domain.OrderRepository.IdType;
import ec.elmirador.orders.domain.OrderRepository.InvoiceDetails;
import ec.elmirador.orders.domain.OrderRepository.OrderPlaced;
import ec.elmirador.shared.ApiException;

@Service
public class InvoiceService {

	private static final Map<IdType, String> ID_FORMATS = Map.of(IdType.cedula, "[0-9]{10}", IdType.ruc, "[0-9]{13}",
			IdType.passport, "[A-Z0-9]{5,20}");

	private final InvoiceRepository invoices;

	private final Clock clock;

	private final MessageSource messages;

	public InvoiceService(InvoiceRepository invoices, Clock clock, MessageSource messages) {
		this.invoices = invoices;
		this.clock = clock;
		this.messages = messages;
	}

	@EventListener
	public void recordRequest(OrderPlaced placed) {
		var details = placed.invoice();
		var idNumber = details.idNumber().strip().toUpperCase(Locale.ROOT);
		if (!idNumber.matches(ID_FORMATS.get(details.idType()))) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "invoicing.invalidId");
		}
		invoices.request(placed.orderId(), new InvoiceDetails(details.idType(), idNumber,
				details.name().strip(), details.email().strip(), details.address()));
	}

	public List<InvoiceRequest> requests(LocalDate since) {
		return invoices.requests(since.atStartOfDay(clock.getZone()).toOffsetDateTime());
	}

	public void issue(long id, String invoiceNumber, long staffId) {
		if (!invoices.issue(id, invoiceNumber.strip(), staffId)) {
			throw new ApiException(HttpStatus.CONFLICT, "invoicing.notPaid");
		}
	}

	public List<Sale> sales(LocalDate from, LocalDate to) {
		if (to.isBefore(from)) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "invoicing.badRange");
		}
		return invoices.sales(from.atStartOfDay(clock.getZone()).toOffsetDateTime(),
				to.plusDays(1).atStartOfDay(clock.getZone()).toOffsetDateTime());
	}

	public String salesCsv(LocalDate from, LocalDate to, Locale locale) {
		return SalesCsv.render(sales(from, to), clock.getZone(), key -> messages.getMessage(key, null, locale));
	}

}
