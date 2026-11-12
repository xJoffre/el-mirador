package ec.elmirador.schedule.infra;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.DataClassRowMapper;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.schedule.domain.ScheduleRepository;

@Repository
class JdbcScheduleRepository implements ScheduleRepository {

	private static final String HOURS = "opens_at, closes_at, lunch_starts_at, lunch_ends_at";

	private static final RowMapper<Hours> HOURS_ROW = new DataClassRowMapper<>(Hours.class);

	private final JdbcClient jdbc;

	JdbcScheduleRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public Map<Integer, Hours> weeklyHours() {
		return jdbc.sql("select weekday, " + HOURS + " from weekly_hours")
			.query((rs, row) -> Map.entry(rs.getInt("weekday"), HOURS_ROW.mapRow(rs, row)))
			.stream()
			.collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
	}

	@Override
	public Optional<Hours> override(LocalDate date) {
		return jdbc.sql("select " + HOURS + " from hours_override where override_date = :date")
			.param("date", date)
			.query(HOURS_ROW)
			.optional();
	}

	@Override
	public Optional<Status> latestStatus() {
		return jdbc.sql("select status, wait_minutes, reason, until_at from store_status_change order by created_at desc, id desc limit 1")
			.query(Status.class)
			.optional();
	}

	@Override
	public StoreProfile profile() {
		return jdbc.sql("select name, address, whatsapp, bank_account, delivery_note from store_profile")
			.query(StoreProfile.class)
			.single();
	}

	@Override
	public void saveProfile(StoreProfile profile) {
		jdbc.sql("""
				update store_profile set name = :name, address = :address, whatsapp = :whatsapp,
				  bank_account = :bankAccount, delivery_note = :deliveryNote
				""")
			.param("name", profile.name())
			.param("address", profile.address())
			.param("whatsapp", profile.whatsapp())
			.param("bankAccount", profile.bankAccount())
			.param("deliveryNote", profile.deliveryNote())
			.update();
	}

	@Override
	public void saveWeek(Map<Integer, Hours> week) {
		jdbc.sql("delete from weekly_hours").update();
		week.forEach((weekday, hours) -> jdbc.sql("insert into weekly_hours (weekday, " + HOURS
				+ ") values (:weekday, :opensAt, :closesAt, :lunchStartsAt, :lunchEndsAt)")
			.param("weekday", weekday)
			.param("opensAt", hours.opensAt())
			.param("closesAt", hours.closesAt())
			.param("lunchStartsAt", hours.lunchStartsAt())
			.param("lunchEndsAt", hours.lunchEndsAt())
			.update());
	}

}
