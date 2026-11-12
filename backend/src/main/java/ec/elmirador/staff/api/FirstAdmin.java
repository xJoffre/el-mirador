package ec.elmirador.staff.api;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import ec.elmirador.shared.AppProperties;
import ec.elmirador.staff.domain.StaffService;

@Component
class FirstAdmin implements ApplicationRunner {

	private final AppProperties properties;

	private final StaffService staff;

	FirstAdmin(AppProperties properties, StaffService staff) {
		this.properties = properties;
		this.staff = staff;
	}

	@Override
	public void run(ApplicationArguments arguments) {
		var admin = properties.firstAdmin();
		if (!admin.name().isBlank()) {
			staff.createFirstAdmin(admin.name().strip(), admin.pin());
		}
	}

}
