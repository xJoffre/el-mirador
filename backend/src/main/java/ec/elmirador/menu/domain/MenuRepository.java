package ec.elmirador.menu.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.annotation.Nullable;

public interface MenuRepository {

	List<Category> categories();

	Optional<DailyMenu> dailyMenu(LocalDate date);

	record Category(long id, Map<String, String> name, String icon, List<Product> products) {
	}

	record Product(long id, Map<String, String> name, @Nullable Map<String, String> description, boolean dineInOnly,
			boolean hidden, @Nullable LocalDate soldOutOn, @Nullable String photo, List<Variant> variants, List<OptionGroup> optionGroups) {
	}

	record Variant(long id, @Nullable Map<String, String> name, BigDecimal price, String currency) {
	}

	record OptionGroup(long id, Map<String, String> name, int minChoices, int maxChoices, List<OptionItem> items) {
	}

	record OptionItem(long id, Map<String, String> name, boolean hidden, @Nullable LocalDate soldOutOn) {
	}

	record DailyMenu(LocalDate date, Map<String, String> includes, List<DailyDish> dishes) {
	}

	record DailyDish(long id, DishKind kind, Map<String, String> name, @Nullable BigDecimal priceFull, BigDecimal priceAlone,
			String currency, boolean soldOut) {
	}

}
