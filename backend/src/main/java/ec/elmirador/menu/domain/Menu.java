package ec.elmirador.menu.domain;

import java.util.List;
import java.util.Map;

import jakarta.annotation.Nullable;

import ec.elmirador.menu.domain.MenuRepository.DailyDish;
import ec.elmirador.menu.domain.MenuRepository.Variant;

public record Menu(List<Category> categories, @Nullable Map<String, String> lunchIncludes, List<DailyDish> lunch) {

	public record Category(long id, Map<String, String> name, String icon, List<Product> products) {
	}

	public record Product(long id, Map<String, String> name, @Nullable Map<String, String> description, boolean dineInOnly,
			boolean soldOut, @Nullable String photo, List<Variant> variants, List<OptionGroup> optionGroups) {
	}

	public record OptionGroup(long id, Map<String, String> name, int minChoices, int maxChoices,
			List<OptionItem> items) {
	}

	public record OptionItem(long id, Map<String, String> name, boolean soldOut) {
	}

}
