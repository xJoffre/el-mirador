package ec.elmirador.menu.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.menu.domain.CatalogRepository.SoldOut;
import ec.elmirador.menu.domain.LunchRepository.LunchDish;
import ec.elmirador.menu.domain.LunchRepository.LunchDishForm;
import ec.elmirador.menu.domain.LunchRepository.LunchForm;
import ec.elmirador.menu.domain.LunchRepository.LunchPlan;
import ec.elmirador.menu.domain.LunchService;
import ec.elmirador.shared.Saved;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/menu")
class LunchController {

	private final LunchService lunches;

	LunchController(LunchService lunches) {
		this.lunches = lunches;
	}

	@GetMapping("/lunch-dishes")
	List<LunchDish> getLunchDishes() {
		return lunches.lunchDishes();
	}

	@PostMapping("/lunch-dishes")
	Saved createLunchDish(@Valid @RequestBody LunchDishForm form) {
		return new Saved(lunches.createLunchDish(form));
	}

	@PutMapping("/lunch-dishes/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void updateLunchDish(@PathVariable long id, @Valid @RequestBody LunchDishForm form) {
		lunches.updateLunchDish(id, form);
	}

	@GetMapping("/lunch/{date}")
	LunchPlan getLunch(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return lunches.plan(date);
	}

	@PutMapping("/lunch/{date}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void publishLunch(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
			@Valid @RequestBody LunchForm form, @AuthenticationPrincipal(expression = "id()") long staffId) {
		lunches.publish(date, form, staffId);
	}

	@DeleteMapping("/lunch/{date}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void unpublishLunch(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		lunches.unpublish(date);
	}

	@PutMapping("/lunch/{date}/dishes/{id}/sold-out")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void markLunchDishSoldOut(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
			@PathVariable long id, @RequestBody SoldOut soldOut) {
		lunches.markSoldOut(date, id, soldOut.soldOut());
	}

}
