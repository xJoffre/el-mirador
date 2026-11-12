package ec.elmirador.schedule.domain;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

import jakarta.annotation.Nullable;

public interface ScheduleRepository {

	Map<Integer, Hours> weeklyHours();

	Optional<Hours> override(LocalDate date);

	Optional<Status> latestStatus();

	StoreProfile profile();

	record Hours(@Nullable LocalTime opensAt, @Nullable LocalTime closesAt, @Nullable LocalTime lunchStartsAt,
			@Nullable LocalTime lunchEndsAt) {

		static final Hours CLOSED = new Hours(null, null, null, null);

		Hours over(Hours base) {
			var hours = opensAt == null ? base : this;
			var lunch = lunchStartsAt == null ? base : this;
			return new Hours(hours.opensAt, hours.closesAt, lunch.lunchStartsAt, lunch.lunchEndsAt);
		}

		boolean open(LocalTime time) {
			return within(time, opensAt, closesAt);
		}

		boolean lunch(LocalTime time) {
			return within(time, lunchStartsAt, lunchEndsAt);
		}

		private static boolean within(LocalTime time, LocalTime start, LocalTime end) {
			return start != null && !time.isBefore(start) && time.isBefore(end);
		}

	}

	record Status(StoreStatus status, @Nullable Integer waitMinutes, @Nullable String reason,
			@Nullable OffsetDateTime untilAt) {
	}

	record StoreProfile(String name, @Nullable String address, @Nullable String whatsapp, @Nullable String bankAccount,
			@Nullable String deliveryNote) {
	}

}
