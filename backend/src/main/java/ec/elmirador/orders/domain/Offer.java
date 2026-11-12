package ec.elmirador.orders.domain;

import ec.elmirador.menu.domain.Menu;
import ec.elmirador.schedule.domain.Schedule;

public interface Offer {

	Menu menu();

	Schedule schedule();

}
