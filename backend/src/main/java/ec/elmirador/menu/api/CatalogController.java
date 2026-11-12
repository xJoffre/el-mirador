package ec.elmirador.menu.api;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import ec.elmirador.menu.domain.CatalogRepository.CategoryForm;
import ec.elmirador.menu.domain.CatalogRepository.Photo;
import ec.elmirador.menu.domain.CatalogRepository.ProductForm;
import ec.elmirador.menu.domain.CatalogRepository.SoldOut;
import ec.elmirador.menu.domain.CatalogService;
import ec.elmirador.menu.domain.MenuRepository.CatalogCategory;
import ec.elmirador.shared.Saved;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/menu")
class CatalogController {

	private final CatalogService catalog;

	CatalogController(CatalogService catalog) {
		this.catalog = catalog;
	}

	@GetMapping("/catalog")
	List<CatalogCategory> getCatalog() {
		return catalog.catalog();
	}

	@PostMapping("/categories")
	Saved createCategory(@Valid @RequestBody CategoryForm form) {
		return new Saved(catalog.createCategory(form));
	}

	@PutMapping("/categories/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void updateCategory(@PathVariable long id, @Valid @RequestBody CategoryForm form) {
		catalog.updateCategory(id, form);
	}

	@DeleteMapping("/categories/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteCategory(@PathVariable long id) {
		catalog.deleteCategory(id);
	}

	@PostMapping("/products")
	Saved createProduct(@Valid @RequestBody ProductForm form) {
		return new Saved(catalog.createProduct(form));
	}

	@PutMapping("/products/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void updateProduct(@PathVariable long id, @Valid @RequestBody ProductForm form) {
		catalog.updateProduct(id, form);
	}

	@DeleteMapping("/products/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteProduct(@PathVariable long id) throws IOException {
		catalog.deleteProduct(id);
	}

	@PutMapping(path = "/products/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	Photo replacePhoto(@PathVariable long id, @RequestPart MultipartFile file) throws IOException {
		try (var image = file.getInputStream()) {
			return new Photo(catalog.replacePhoto(id, image));
		}
	}

	@DeleteMapping("/products/{id}/photo")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void removePhoto(@PathVariable long id) throws IOException {
		catalog.removePhoto(id);
	}

	@PutMapping("/products/{id}/sold-out")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void markProductSoldOut(@PathVariable long id, @RequestBody SoldOut soldOut) {
		catalog.markProductSoldOut(id, soldOut.soldOut());
	}

	@PutMapping("/option-items/{id}/sold-out")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void markOptionItemSoldOut(@PathVariable long id, @RequestBody SoldOut soldOut) {
		catalog.markOptionItemSoldOut(id, soldOut.soldOut());
	}

}
