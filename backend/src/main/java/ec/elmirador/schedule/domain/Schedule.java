package ec.elmirador.schedule.domain;

import java.util.Map;

import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;

public record Schedule(StoreProfile profile, Map<Integer, Hours> week, Hours today, Status status, boolean lunchNow) {
}
