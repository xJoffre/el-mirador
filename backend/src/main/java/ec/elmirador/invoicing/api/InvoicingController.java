package ec.elmirador.invoicing.api;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.invoicing.domain.InvoiceRepository.InvoiceRequest;
import ec.elmirador.invoicing.domain.InvoiceRepository.Issue;
import ec.elmirador.invoicing.domain.InvoiceRepository.Sale;
import ec.elmirador.invoicing.domain.InvoiceService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/invoicing")
class InvoicingController {

	private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

	private final InvoiceService invoices;

	InvoicingController(InvoiceService invoices) {
		this.invoices = invoices;
	}

	@GetMapping("/requests/{since}")
	List<InvoiceRequest> getInvoiceRequests(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate since) {
		return invoices.requests(since);
	}

	@PutMapping("/requests/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void issueInvoice(@PathVariable long id, @Valid @RequestBody Issue issue, @AuthenticationPrincipal(expression = "id()") long staffId) {
		invoices.issue(id, issue.invoiceNumber(), staffId);
	}

	@GetMapping("/sales")
	List<Sale> getSales(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return invoices.sales(from, to);
	}

	@GetMapping(path = "/sales.csv", produces = "text/csv")
	ResponseEntity<String> getSalesCsv(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to, Locale locale) {
		var file = ContentDisposition.attachment().filename("ventas-%s-a-%s.csv".formatted(from, to)).build();
		return ResponseEntity.ok()
			.contentType(CSV)
			.header(HttpHeaders.CONTENT_DISPOSITION, file.toString())
			.body(invoices.salesCsv(from, to, locale));
	}

}
