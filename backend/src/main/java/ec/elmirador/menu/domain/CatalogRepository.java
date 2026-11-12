package ec.elmirador.menu.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public interface CatalogRepository {

	long createCategory(CategoryForm form);

	boolean updateCategory(long id, CategoryForm form);

	boolean deleteCategory(long id);

	long createProduct(ProductForm form);

	boolean updateProduct(long id, ProductForm form);

	boolean deleteProduct(long id);

	Optional<Optional<String>> photo(long productId);

	void setPhoto(long productId, @Nullable String photo);

	boolean markProductSoldOut(long id, @Nullable LocalDate on);

	boolean markOptionItemSoldOut(long id, @Nullable LocalDate on);

	record CategoryForm(@NotEmpty Map<String, String> name, @NotBlank String icon) {
	}

	record ProductForm(long categoryId, @NotEmpty Map<String, String> name, @Nullable Map<String, String> description,
			boolean dineInOnly, boolean hidden, @NotEmpty List<@Valid VariantForm> variants,
			List<@Valid OptionGroupForm> optionGroups) {
	}

	record VariantForm(@Nullable Long id, @Nullable Map<String, String> name,
			@NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal price) {
	}

	record OptionGroupForm(@Nullable Long id, @NotEmpty Map<String, String> name, @Min(0) int minChoices,
			@Min(1) int maxChoices, @NotEmpty List<@Valid OptionItemForm> items) {
	}

	record OptionItemForm(@Nullable Long id, @NotEmpty Map<String, String> name, boolean hidden) {
	}

	record SoldOut(boolean soldOut) {
	}

	record Photo(String photo) {
	}

}
