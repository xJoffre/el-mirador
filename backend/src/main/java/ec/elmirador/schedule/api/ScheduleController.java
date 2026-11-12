package ec.elmirador.schedule.api;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.schedule.domain.Schedule;
import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;
import ec.elmirador.schedule.domain.ScheduleService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

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

	@PutMapping("/api/schedule/profile")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void saveProfile(@Valid @RequestBody StoreProfile profile) {
		service.saveProfile(profile);
	}

	@PutMapping("/api/schedule/week")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void saveWeek(@RequestBody Map<@Min(1) @Max(7) Integer, Hours> week) {
		service.saveWeek(week);
	}

}
