package ec.elmirador.schedule.domain;

import java.time.Clock;
import java.time.OffsetDateTime;

import org.springframework.stereotype.Service;

import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;

@Service
public class ScheduleService {

	private final ScheduleRepository repository;

	private final Clock clock;

	public ScheduleService(ScheduleRepository repository, Clock clock) {
		this.repository = repository;
		this.clock = clock;
	}

	public Schedule schedule() {
		var now = OffsetDateTime.now(clock);
		var time = now.toLocalTime();
		var week = repository.weeklyHours();
		var base = week.getOrDefault(now.getDayOfWeek().getValue(), Hours.CLOSED);
		var today = repository.override(now.toLocalDate()).map(change -> change.over(base)).orElse(base);
		var status = today.open(time)
				? repository.latestStatus()
					.filter(change -> change.untilAt() == null || change.untilAt().isAfter(now))
					.orElse(new Status(StoreStatus.open, null, null, null))
				: new Status(StoreStatus.closed, null, null, null);
		return new Schedule(repository.profile(), week, today, status, today.lunch(time));
	}

}
