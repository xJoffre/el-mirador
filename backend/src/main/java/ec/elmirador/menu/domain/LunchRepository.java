package ec.elmirador.menu.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public interface LunchRepository {

	List<LunchDish> lunchDishes();

	long createLunchDish(LunchDishForm form);

	boolean updateLunchDish(long id, LunchDishForm form);

	void publish(LocalDate date, LunchForm form, long staffId);

	boolean unpublish(LocalDate date);

	boolean markSoldOut(LocalDate date, long dishId, boolean soldOut);

	record LunchDish(long id, DishKind kind, Map<String, String> name, boolean hidden) {
	}

	record LunchDishForm(@NotNull DishKind kind, @NotEmpty Map<String, String> name, boolean hidden) {
	}

	record LunchForm(@NotEmpty Map<String, String> includes, @NotEmpty List<@Valid LunchDishPrice> dishes) {
	}

	record LunchDishPrice(long lunchDishId, @Nullable @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal priceFull,
			@NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal priceAlone) {
	}

	record LunchPlan(@Nullable Map<String, String> includes, List<MenuRepository.DailyDish> dishes) {
	}

}
