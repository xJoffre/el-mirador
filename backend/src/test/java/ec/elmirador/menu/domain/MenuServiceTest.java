package ec.elmirador.menu.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import ec.elmirador.menu.domain.MenuRepository.CatalogCategory;
import ec.elmirador.menu.domain.MenuRepository.DailyDish;
import ec.elmirador.menu.domain.MenuRepository.DailyMenu;
import ec.elmirador.menu.domain.MenuRepository.CatalogOptionGroup;
import ec.elmirador.menu.domain.MenuRepository.CatalogOptionItem;
import ec.elmirador.menu.domain.MenuRepository.CatalogProduct;
import ec.elmirador.menu.domain.MenuRepository.Variant;

class MenuServiceTest {

	private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

	record InMemoryMenu(List<CatalogCategory> categories, Map<LocalDate, DailyMenu> lunches) implements MenuRepository {

		@Override
		public Optional<DailyMenu> dailyMenu(LocalDate date) {
			return Optional.ofNullable(lunches.get(date));
		}

	}

	private static Map<String, String> es(String text) {
		return Map.of("es", text);
	}

	private static CatalogProduct product(long id, boolean hidden, LocalDate soldOutOn, List<CatalogOptionGroup> groups) {
		return new CatalogProduct(id, es("p" + id), null, false, hidden, soldOutOn, null,
				List.of(new Variant(id, null, new BigDecimal("3.00"), "USD")), groups);
	}

	private static Menu menuOn(LocalDate date, MenuRepository repository) {
		return new MenuService(repository, Clock.fixed(date.atTime(12, 0).atZone(ZONE).toInstant(), ZONE)).menu();
	}

	@Test
	void soldOutTodayIsAvailableAgainTomorrow() {
		var sauce = new CatalogOptionGroup(1, es("salsa"), 1, 1, List.of(new CatalogOptionItem(1, es("bbq"), false, TODAY)));
		var repository = new InMemoryMenu(
				List.of(new CatalogCategory(1, es("picaditas"), "drumstick", List.of(product(1, false, TODAY, List.of(sauce))))),
				Map.of());

		var today = menuOn(TODAY, repository).categories().getFirst().products().getFirst();
		var tomorrow = menuOn(TODAY.plusDays(1), repository).categories().getFirst().products().getFirst();

		assertThat(today.soldOut()).isTrue();
		assertThat(today.optionGroups().getFirst().items().getFirst().soldOut()).isTrue();
		assertThat(tomorrow.soldOut()).isFalse();
		assertThat(tomorrow.optionGroups().getFirst().items().getFirst().soldOut()).isFalse();
	}

	@Test
	void hiddenProductsAndItemsAreLeftOutWithTheirEmptySections() {
		var flavors = new CatalogOptionGroup(1, es("sabor"), 1, 1,
				List.of(new CatalogOptionItem(1, es("mora"), false, null), new CatalogOptionItem(2, es("fresa"), true, null)));
		var repository = new InMemoryMenu(List.of(
				new CatalogCategory(1, es("bebidas"), "cup-soda", List.of(product(1, false, null, List.of(flavors)), product(2, true, null, List.of()))),
				new CatalogCategory(2, es("mariscos"), "shrimp", List.of(product(3, true, null, List.of())))), Map.of());

		var categories = menuOn(TODAY, repository).categories();

		assertThat(categories).extracting(Menu.Category::id).containsExactly(1L);
		assertThat(categories.getFirst().products()).extracting(Menu.Product::id).containsExactly(1L);
		assertThat(categories.getFirst().products().getFirst().optionGroups().getFirst().items())
			.extracting(Menu.OptionItem::id)
			.containsExactly(1L);
	}

	@Test
	void aRequiredChoiceWithNothingLeftSellsOutTheProduct() {
		var sauces = new CatalogOptionGroup(1, es("salsa"), 1, 1,
				List.of(new CatalogOptionItem(1, es("bbq"), false, TODAY), new CatalogOptionItem(2, es("piña"), true, null)));
		var optionalExtras = new CatalogOptionGroup(2, es("extra"), 0, 1, List.of(new CatalogOptionItem(3, es("queso"), false, TODAY)));
		var repository = new InMemoryMenu(List.of(new CatalogCategory(1, es("picaditas"), "drumstick",
				List.of(product(1, false, null, List.of(sauces)), product(2, false, null, List.of(optionalExtras))))), Map.of());

		var products = menuOn(TODAY, repository).categories().getFirst().products();

		assertThat(products).extracting(Menu.Product::soldOut).containsExactly(true, false);
		assertThat(menuOn(TODAY.plusDays(1), repository).categories().getFirst().products().getFirst().soldOut()).isFalse();
	}

	@Test
	void productsWithoutAPriceAreLeftOut() {
		var unpriced = new CatalogProduct(2, es("sin precio"), null, false, false, null, null, List.of(), List.of());
		var repository = new InMemoryMenu(
				List.of(new CatalogCategory(1, es("bebidas"), "cup-soda", List.of(product(1, false, null, List.of()), unpriced))), Map.of());

		assertThat(menuOn(TODAY, repository).categories().getFirst().products()).extracting(Menu.Product::id).containsExactly(1L);
	}

	@Test
	void lunchIsTheOnePublishedForToday() {
		var soup = new DailyDish(1, DishKind.soup, es("locro"), null, new BigDecimal("1.50"), "USD", false);
		var repository = new InMemoryMenu(List.of(), Map.of(TODAY, new DailyMenu(TODAY, es("jugo y gelatina"), List.of(soup))));

		var today = menuOn(TODAY, repository);
		var tomorrow = menuOn(TODAY.plusDays(1), repository);

		assertThat(today.lunch()).containsExactly(soup);
		assertThat(today.lunchIncludes()).isEqualTo(es("jugo y gelatina"));
		assertThat(tomorrow.lunch()).isEmpty();
		assertThat(tomorrow.lunchIncludes()).isNull();
	}

}
