package ec.elmirador.orders.infra;

import org.springframework.stereotype.Component;

import ec.elmirador.menu.domain.Menu;
import ec.elmirador.menu.domain.MenuService;
import ec.elmirador.orders.domain.Offer;
import ec.elmirador.schedule.domain.Schedule;
import ec.elmirador.schedule.domain.ScheduleService;

@Component
class MenuOffer implements Offer {

	private final MenuService menu;

	private final ScheduleService schedule;

	MenuOffer(MenuService menu, ScheduleService schedule) {
		this.menu = menu;
		this.schedule = schedule;
	}

	@Override
	public Menu menu() {
		return menu.menu();
	}

	@Override
	public Schedule schedule() {
		return schedule.schedule();
	}

}
