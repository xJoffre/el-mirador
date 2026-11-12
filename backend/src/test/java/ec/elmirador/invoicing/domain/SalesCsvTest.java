package ec.elmirador.invoicing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;

import ec.elmirador.invoicing.domain.InvoiceRepository.Sale;
import ec.elmirador.orders.domain.OrderRepository.IdType;

class SalesCsvTest {

	private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

	private static String text(String key) {
		return switch (key) {
			case "idType.cedula" -> "Cédula";
			case "csv.totals" -> "Totales";
			default -> key.replace("csv.", "");
		};
	}

	private static Sale sale(long id, String customer, String total, String cash, String transfer, IdType idType, String invoiceName) {
		return new Sale(id, OffsetDateTime.parse("2026-11-14T22:30:00Z"), customer, idType, idType == null ? null : "0102030405",
				invoiceName, idType == null ? null : "ana@correo.ec", new BigDecimal(total), new BigDecimal(cash), new BigDecimal(transfer),
				"USD", null);
	}

	private static List<String> lines(String csv) {
		return List.of(csv.substring(SalesCsv.BOM.length()).split(SalesCsv.LINE));
	}

	@Test
	void startsWithTheUtf8MarkSoExcelReadsTheAccents() {
		var csv = SalesCsv.render(List.of(sale(1, "José Peñaranda", "3.5", "3.5", "0", null, null)), ZONE, SalesCsvTest::text);

		assertThat(csv).startsWith(SalesCsv.BOM);
		assertThat(lines(csv).get(1)).contains("José Peñaranda");
		assertThat(csv).endsWith(SalesCsv.LINE);
	}

	@Test
	void showsTheLocalDateAndTimeAndTwoDecimals() {
		var row = lines(SalesCsv.render(List.of(sale(7, "Ana", "3.5", "3.5", "0", IdType.cedula, "Ana Torres")), ZONE, SalesCsvTest::text)).get(1);

		assertThat(row).isEqualTo("2026-11-14,17:30,7,Ana,Cédula,0102030405,Ana Torres,ana@correo.ec,3.50,3.50,0.00,");
	}

	@Test
	void quotesCellsWithCommasQuotesOrLineBreaks() {
		assertThat(SalesCsv.cell("Pérez, Ana")).isEqualTo("\"Pérez, Ana\"");
		assertThat(SalesCsv.cell("el \"Gordo\"")).isEqualTo("\"el \"\"Gordo\"\"\"");
		assertThat(SalesCsv.cell("línea\nnueva")).isEqualTo("\"línea\nnueva\"");
		assertThat(SalesCsv.cell("Ana")).isEqualTo("Ana");
	}

	@Test
	void neutralizesCellsThatExcelWouldRunAsFormulas() {
		assertThat(SalesCsv.cell("=HYPERLINK(\"http://x\")")).isEqualTo("\"'=HYPERLINK(\"\"http://x\"\")\"");
		assertThat(SalesCsv.cell("+593999")).isEqualTo("'+593999");
		assertThat(SalesCsv.cell("-1")).isEqualTo("'-1");
		assertThat(SalesCsv.cell("@SUM(A1)")).isEqualTo("'@SUM(A1)");
	}

	@Test
	void endsWithTheTotals() {
		var csv = SalesCsv.render(List.of(sale(1, "Ana", "3.50", "3.50", "0", null, null), sale(2, "Luis", "12.25", "2.25", "10", null, null)),
				ZONE, SalesCsvTest::text);

		assertThat(lines(csv)).hasSize(4);
		assertThat(lines(csv).getLast()).isEqualTo("Totales,,,,,,,,15.75,5.75,10.00,");
	}

}
