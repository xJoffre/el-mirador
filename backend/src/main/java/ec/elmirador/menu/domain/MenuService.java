package ec.elmirador.menu.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import ec.elmirador.menu.domain.MenuRepository.DailyMenu;

@Service
public class MenuService {

	private final MenuRepository repository;

	private final Clock clock;

	public MenuService(MenuRepository repository, Clock clock) {
		this.repository = repository;
		this.clock = clock;
	}

	public Menu menu() {
		var today = LocalDate.now(clock);
		var categories = repository.categories()
			.stream()
			.map(category -> new Menu.Category(category.id(), category.name(), category.icon(),
					category.products()
						.stream()
						.filter(product -> !product.hidden() && !product.variants().isEmpty())
						.map(product -> product(product, today))
						.toList()))
			.filter(category -> !category.products().isEmpty())
			.toList();
		var lunch = repository.dailyMenu(today);
		return new Menu(categories, lunch.map(DailyMenu::includes).orElse(null),
				lunch.map(DailyMenu::dishes).orElse(List.of()));
	}

	private static Menu.Product product(MenuRepository.Product product, LocalDate today) {
		var optionGroups = product.optionGroups()
			.stream()
			.map(group -> new Menu.OptionGroup(group.id(), group.name(), group.minChoices(), group.maxChoices(),
					group.items()
						.stream()
						.filter(item -> !item.hidden())
						.map(item -> new Menu.OptionItem(item.id(), item.name(), today.equals(item.soldOutOn())))
						.toList()))
			.toList();
		var soldOut = today.equals(product.soldOutOn()) || optionGroups.stream()
			.anyMatch(group -> group.items().stream().filter(item -> !item.soldOut()).count() < group.minChoices());
		return new Menu.Product(product.id(), product.name(), product.description(), product.dineInOnly(), soldOut,
				product.photo(), product.variants(), optionGroups);
	}

}
