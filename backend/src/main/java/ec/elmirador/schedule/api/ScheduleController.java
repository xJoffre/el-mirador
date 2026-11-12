package ec.elmirador.schedule.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.schedule.domain.Schedule;
import ec.elmirador.schedule.domain.ScheduleService;

@RestController
class ScheduleController {

	private final ScheduleService service;

	ScheduleController(ScheduleService service) {
		this.service = service;
	}

	@GetMapping("/api/schedule")
	Schedule getSchedule() {
		return service.schedule();
	}

}
