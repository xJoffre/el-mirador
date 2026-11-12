package ec.elmirador.schedule.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import ec.elmirador.schedule.domain.ScheduleRepository.Hours;
import ec.elmirador.schedule.domain.ScheduleRepository.Status;
import ec.elmirador.schedule.domain.ScheduleRepository.StoreProfile;

class ScheduleServiceTest {

	private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

	private static final LocalDate SATURDAY = LocalDate.of(2026, 11, 14);

	private static final Hours USUAL = new Hours(LocalTime.of(7, 30), LocalTime.of(21, 0), LocalTime.of(11, 0),
			LocalTime.of(14, 0));

	record InMemorySchedule(Map<Integer, Hours> weeklyHours, Map<LocalDate, Hours> overrides, Status status)
			implements ScheduleRepository {

		@Override
		public Optional<Hours> override(LocalDate date) {
			return Optional.ofNullable(overrides.get(date));
		}

		@Override
		public Optional<Status> latestStatus() {
			return Optional.ofNullable(status);
		}

		@Override
		public StoreProfile profile() {
			return new StoreProfile("El Mirador", null, null, null, null);
		}

		@Override
		public void saveProfile(StoreProfile profile) {
			throw new UnsupportedOperationException();
		}

		@Override
		public void saveWeek(Map<Integer, Hours> week) {
			throw new UnsupportedOperationException();
		}

	}

	private static Schedule at(LocalDateTime time, ScheduleRepository repository) {
		return new ScheduleService(repository, Clock.fixed(time.atZone(ZONE).toInstant(), ZONE)).schedule();
	}

	private static InMemorySchedule everyDay(Map<LocalDate, Hours> overrides, Status status) {
		return new InMemorySchedule(Map.of(1, USUAL, 2, USUAL, 3, USUAL, 4, USUAL, 5, USUAL, 6, USUAL, 7, USUAL), overrides,
				status);
	}

	@Test
	void anOverrideChangesOnlyItsOwnDate() {
		var earlyClose = new Hours(LocalTime.of(7, 30), LocalTime.of(16, 0), null, null);
		var repository = everyDay(Map.of(SATURDAY, earlyClose), null);

		var saturday = at(SATURDAY.atTime(17, 0), repository);
		var sunday = at(SATURDAY.plusDays(1).atTime(17, 0), repository);

		assertThat(saturday.today()).isEqualTo(new Hours(LocalTime.of(7, 30), LocalTime.of(16, 0), LocalTime.of(11, 0), LocalTime.of(14, 0)));
		assertThat(saturday.status().status()).isEqualTo(StoreStatus.closed);
		assertThat(sunday.today()).isEqualTo(USUAL);
		assertThat(sunday.status().status()).isEqualTo(StoreStatus.open);
	}

	@Test
	void aDayWithoutHoursIsClosed() {
		var repository = new InMemorySchedule(Map.of(6, USUAL), Map.of(), null);

		var sunday = at(SATURDAY.plusDays(1).atTime(12, 0), repository);

		assertThat(sunday.today()).isEqualTo(Hours.CLOSED);
		assertThat(sunday.status().status()).isEqualTo(StoreStatus.closed);
		assertThat(sunday.lunchNow()).isFalse();
	}

	@Test
	void lunchRunsFromItsStartUntilJustBeforeItsEnd() {
		var repository = everyDay(Map.of(), null);

		assertThat(at(SATURDAY.atTime(10, 59), repository).lunchNow()).isFalse();
		assertThat(at(SATURDAY.atTime(11, 0), repository).lunchNow()).isTrue();
		assertThat(at(SATURDAY.atTime(13, 59), repository).lunchNow()).isTrue();
		assertThat(at(SATURDAY.atTime(14, 0), repository).lunchNow()).isFalse();
	}

	@Test
	void aStatusSetByTheStaffLastsUntilItExpires() {
		var until = SATURDAY.atTime(13, 0).atZone(ZONE).toOffsetDateTime();
		var repository = everyDay(Map.of(), new Status(StoreStatus.delayed, 40, "lleno", until));

		var during = at(SATURDAY.atTime(12, 0), repository);
		var after = at(SATURDAY.atTime(13, 0), repository);

		assertThat(during.status()).isEqualTo(new Status(StoreStatus.delayed, 40, "lleno", until));
		assertThat(after.status().status()).isEqualTo(StoreStatus.open);
	}

}
