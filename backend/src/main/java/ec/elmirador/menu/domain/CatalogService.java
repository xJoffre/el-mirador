package ec.elmirador.menu.domain;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ec.elmirador.menu.domain.CatalogRepository.CategoryForm;
import ec.elmirador.menu.domain.CatalogRepository.ProductForm;
import ec.elmirador.menu.domain.MenuRepository.CatalogCategory;
import ec.elmirador.shared.ApiException;

@Service
public class CatalogService {

	private final MenuRepository menu;

	private final CatalogRepository catalog;

	private final PhotoStore photos;

	private final Clock clock;

	public CatalogService(MenuRepository menu, CatalogRepository catalog, PhotoStore photos, Clock clock) {
		this.menu = menu;
		this.catalog = catalog;
		this.photos = photos;
		this.clock = clock;
	}

	public List<CatalogCategory> catalog() {
		return menu.categories();
	}

	public long createCategory(CategoryForm form) {
		return catalog.createCategory(form);
	}

	public void updateCategory(long id, CategoryForm form) {
		found(catalog.updateCategory(id, form));
	}

	public void deleteCategory(long id) {
		found(catalog.deleteCategory(id));
	}

	@Transactional
	public long createProduct(ProductForm form) {
		return catalog.createProduct(form);
	}

	@Transactional
	public void updateProduct(long id, ProductForm form) {
		found(catalog.updateProduct(id, form));
	}

	public void deleteProduct(long id) throws IOException {
		var photo = photoOf(id);
		found(catalog.deleteProduct(id));
		if (photo.isPresent()) {
			photos.delete(photo.get());
		}
	}

	public String replacePhoto(long id, InputStream image) throws IOException {
		var previous = photoOf(id);
		var saved = photos.save(image).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "menu.notAnImage"));
		catalog.setPhoto(id, saved);
		if (previous.isPresent()) {
			photos.delete(previous.get());
		}
		return saved;
	}

	public void removePhoto(long id) throws IOException {
		var previous = photoOf(id);
		catalog.setPhoto(id, null);
		if (previous.isPresent()) {
			photos.delete(previous.get());
		}
	}

	public void markProductSoldOut(long id, boolean soldOut) {
		found(catalog.markProductSoldOut(id, soldOut ? LocalDate.now(clock) : null));
	}

	public void markOptionItemSoldOut(long id, boolean soldOut) {
		found(catalog.markOptionItemSoldOut(id, soldOut ? LocalDate.now(clock) : null));
	}

	private Optional<String> photoOf(long productId) {
		return catalog.photo(productId).orElseThrow(CatalogService::notFound);
	}

	private static void found(boolean changed) {
		if (!changed) {
			throw notFound();
		}
	}

	private static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "menu.notFound");
	}

}
