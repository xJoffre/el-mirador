package ec.elmirador.menu.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import ec.elmirador.menu.domain.LunchRepository.LunchDish;
import ec.elmirador.menu.domain.LunchRepository.LunchDishForm;
import ec.elmirador.menu.domain.LunchRepository.LunchDishPrice;
import ec.elmirador.menu.domain.LunchRepository.LunchForm;
import ec.elmirador.shared.ApiException;

class LunchServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

	record InMemoryLunches(List<LunchDish> lunchDishes, List<LunchForm> published) implements LunchRepository {

		@Override
		public long createLunchDish(LunchDishForm form) {
			throw new UnsupportedOperationException();
		}

		@Override
		public boolean updateLunchDish(long id, LunchDishForm form) {
			throw new UnsupportedOperationException();
		}

		@Override
		public void publish(LocalDate date, LunchForm form, long staffId) {
			published.add(form);
		}

		@Override
		public boolean unpublish(LocalDate date) {
			throw new UnsupportedOperationException();
		}

		@Override
		public boolean markSoldOut(LocalDate date, long dishId, boolean soldOut) {
			throw new UnsupportedOperationException();
		}

	}

	private final InMemoryLunches lunches = new InMemoryLunches(List.of(
			new LunchDish(1, DishKind.soup, Map.of("es", "Locro"), false),
			new LunchDish(2, DishKind.main, Map.of("es", "Seco de pollo"), false),
			new LunchDish(3, DishKind.main, Map.of("es", "Guatita"), true)), new ArrayList<>());

	private final List<Object> events = new ArrayList<>();

	private final LunchService service = new LunchService(lunches, new MenuServiceTest.InMemoryMenu(List.of(), Map.of()), events::add);

	private static LunchForm lunch(LunchDishPrice... dishes) {
		return new LunchForm(Map.of("es", "Jugo y gelatina"), List.of(dishes));
	}

	private static LunchDishPrice price(long dish, String full, String alone) {
		return new LunchDishPrice(dish, full == null ? null : new BigDecimal(full), new BigDecimal(alone));
	}

	private String codeOf(LunchForm form) {
		try {
			service.publish(TODAY, form, 1);
			return "ok";
		}
		catch (ApiException error) {
			return (String) error.getBody().getProperties().get("code");
		}
	}

	@Test
	void mainsCarryTheFullLunchPriceAndSoupsDoNot() {
		assertThat(codeOf(lunch(price(1, null, "1.50"), price(2, "3.50", "3.00")))).isEqualTo("ok");
		assertThat(codeOf(lunch(price(2, null, "3.00")))).isEqualTo("menu.fullPriceOnlyForMains");
		assertThat(codeOf(lunch(price(1, "2.00", "1.50")))).isEqualTo("menu.fullPriceOnlyForMains");
	}

	@Test
	void onlyDishesStillOfferedCanBePublished() {
		assertThat(codeOf(lunch(price(3, "3.50", "3.00")))).isEqualTo("menu.unknownLunchDish");
		assertThat(codeOf(lunch(price(9, "3.50", "3.00")))).isEqualTo("menu.unknownLunchDish");
	}

	@Test
	void aPublishedLunchIsSavedAndAnnounced() {
		codeOf(lunch(price(1, null, "1.50")));

		assertThat(lunches.published()).hasSize(1);
		assertThat(events).containsExactly(Menu.CHANGED);
	}

}
