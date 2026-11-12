package ec.elmirador.invoicing.domain;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import ec.elmirador.invoicing.domain.InvoiceRepository.Sale;

public final class SalesCsv {

	static final String BOM = "\uFEFF";

	static final String LINE = "\r\n";

	private static final List<String> COLUMNS = List.of("date", "time", "order", "customer", "idType", "idNumber", "invoiceName",
			"email", "total", "cash", "transfer", "invoiceNumber");

	private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

	private SalesCsv() {
	}

	public static String render(List<Sale> sales, ZoneId zone, Function<String, String> text) {
		var header = COLUMNS.stream().map(column -> text.apply("csv." + column));
		var rows = sales.stream().map(sale -> {
			var closed = sale.closedAt().atZoneSameInstant(zone);
			return Stream.of(closed.format(DATE), closed.format(TIME), String.valueOf(sale.orderId()), sale.customerName(),
					sale.idType() == null ? "" : text.apply("idType." + sale.idType().name()), orEmpty(sale.idNumber()),
					orEmpty(sale.invoiceName()), orEmpty(sale.email()), amount(sale.total()), amount(sale.cash()),
					amount(sale.transfer()), orEmpty(sale.invoiceNumber()));
		});
		var totals = Stream.of(text.apply("csv.totals"), "", "", "", "", "", "", "", amount(sum(sales, Sale::total)),
				amount(sum(sales, Sale::cash)), amount(sum(sales, Sale::transfer)), "");
		return BOM + Stream.concat(Stream.of(header), Stream.concat(rows, Stream.of(totals)))
			.map(cells -> cells.map(SalesCsv::cell).collect(Collectors.joining(",")))
			.collect(Collectors.joining(LINE, "", LINE));
	}

	static String cell(String value) {
		var safe = !value.isEmpty() && "=+-@\t\r".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
		return safe.matches("(?s).*[\",\r\n].*") ? "\"" + safe.replace("\"", "\"\"") + "\"" : safe;
	}

	private static BigDecimal sum(List<Sale> sales, Function<Sale, BigDecimal> amount) {
		return sales.stream().map(amount).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private static String amount(BigDecimal value) {
		return value.setScale(2).toPlainString();
	}

	private static String orEmpty(String value) {
		return value == null ? "" : value;
	}

}
