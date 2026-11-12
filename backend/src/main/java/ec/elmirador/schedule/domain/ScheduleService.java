package ec.elmirador.schedule.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;

@Service
public class ScheduleService {

	private final ScheduleRepository repository;

	private final Clock clock;

	private final ApplicationEventPublisher events;

	public ScheduleService(ScheduleRepository repository, Clock clock, ApplicationEventPublisher events) {
		this.repository = repository;
		this.clock = clock;
		this.events = events;
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
		return new Schedule(now.toLocalDate(), repository.profile(), week, today, status, today.lunch(time));
	}

	public void saveProfile(StoreProfile profile) {
		repository.saveProfile(profile);
		events.publishEvent(Schedule.CHANGED);
	}

	@Transactional
	public void saveWeek(Map<Integer, Hours> week) {
		repository.saveWeek(week);
		events.publishEvent(Schedule.CHANGED);
	}

	public void setStatus(Status status, long staffId) {
		repository.addStatus(status, staffId);
		events.publishEvent(Schedule.CHANGED);
	}

	public void changeToday(Hours hours, long staffId) {
		repository.saveOverride(LocalDate.now(clock), hours, staffId);
		events.publishEvent(Schedule.CHANGED);
	}

	public void keepTodayAsUsual() {
		if (repository.deleteOverride(LocalDate.now(clock))) {
			events.publishEvent(Schedule.CHANGED);
		}
	}

}
