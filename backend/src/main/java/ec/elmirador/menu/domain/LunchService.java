package ec.elmirador.menu.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ec.elmirador.menu.domain.LunchRepository.LunchDish;
import ec.elmirador.menu.domain.LunchRepository.LunchDishForm;
import ec.elmirador.menu.domain.LunchRepository.LunchForm;
import ec.elmirador.menu.domain.LunchRepository.LunchPlan;
import ec.elmirador.shared.ApiException;

@Service
public class LunchService {

	private final LunchRepository lunches;

	private final MenuRepository menu;

	private final ApplicationEventPublisher events;

	public LunchService(LunchRepository lunches, MenuRepository menu, ApplicationEventPublisher events) {
		this.lunches = lunches;
		this.menu = menu;
		this.events = events;
	}

	public List<LunchDish> lunchDishes() {
		return lunches.lunchDishes();
	}

	public long createLunchDish(LunchDishForm form) {
		var id = lunches.createLunchDish(form);
		events.publishEvent(Menu.CHANGED);
		return id;
	}

	public void updateLunchDish(long id, LunchDishForm form) {
		if (!lunches.updateLunchDish(id, form)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "menu.notFound");
		}
		events.publishEvent(Menu.CHANGED);
	}

	public LunchPlan plan(LocalDate date) {
		return menu.dailyMenu(date)
			.map(daily -> new LunchPlan(daily.includes(), daily.dishes()))
			.orElse(new LunchPlan(null, List.of()));
	}

	@Transactional
	public void publish(LocalDate date, LunchForm form, long staffId) {
		var dishes = lunches.lunchDishes().stream().collect(Collectors.toMap(LunchDish::id, Function.identity()));
		for (var price : form.dishes()) {
			var dish = dishes.get(price.lunchDishId());
			if (dish == null || dish.hidden()) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "menu.unknownLunchDish");
			}
			if ((dish.kind() == DishKind.main) != (price.priceFull() != null)) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "menu.fullPriceOnlyForMains");
			}
		}
		lunches.publish(date, form, staffId);
		events.publishEvent(Menu.CHANGED);
	}

	public void unpublish(LocalDate date) {
		if (lunches.unpublish(date)) {
			events.publishEvent(Menu.CHANGED);
		}
	}

	public void markSoldOut(LocalDate date, long dishId, boolean soldOut) {
		if (!lunches.markSoldOut(date, dishId, soldOut)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "menu.notFound");
		}
		events.publishEvent(Menu.CHANGED);
	}

}
