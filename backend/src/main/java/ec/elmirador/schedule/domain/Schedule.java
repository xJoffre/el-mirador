package ec.elmirador.schedule.domain;

import java.time.LocalDate;
import java.util.Map;

import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;
import ec.elmirador.shared.Changed;

public record Schedule(LocalDate date, StoreProfile profile, Map<Integer, Hours> week, Hours today, Status status,
		boolean lunchNow) {

	public static final Changed CHANGED = new Changed("schedule");

}
