package ec.elmirador.menu.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.menu.domain.Menu;
import ec.elmirador.menu.domain.MenuService;

@RestController
class MenuController {

	private final MenuService service;

	MenuController(MenuService service) {
		this.service = service;
	}

	@GetMapping("/api/menu")
	Menu getMenu() {
		return service.menu();
	}

}
