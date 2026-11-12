package ec.elmirador.staff.infra;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import ec.elmirador.staff.domain.StaffRepository;
import ec.elmirador.staff.domain.StaffRole;

@Repository
class JdbcStaffRepository implements StaffRepository {

	private static final String USER = "select id, name, role, active, locked_until from staff_user";

	private final JdbcClient jdbc;

	JdbcStaffRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public List<Member> members() {
		return jdbc.sql("select id, name from staff_user where active order by name").query(Member.class).list();
	}

	@Override
	public List<User> users() {
		return jdbc.sql(USER + " order by active desc, name").query(User.class).list();
	}

	@Override
	public Optional<User> user(long id) {
		return jdbc.sql(USER + " where id = :id").param("id", id).query(User.class).optional();
	}

	@Override
	public Optional<Credentials> lockForSignIn(long id) {
		return jdbc.sql("""
				select id, name, role, active, pin_hash, failed_pins, locked_until
				from staff_user where id = :id for update
				""").param("id", id).query(Credentials.class).optional();
	}

	@Override
	public void recordFailedPin(long id, int failedPins, OffsetDateTime lockedUntil) {
		jdbc.sql("update staff_user set failed_pins = :failedPins, locked_until = coalesce(:lockedUntil, locked_until) where id = :id")
			.param("id", id)
			.param("failedPins", failedPins)
			.param("lockedUntil", lockedUntil)
			.update();
	}

	@Override
	public void recordSignIn(long id) {
		jdbc.sql("update staff_user set failed_pins = 0, locked_until = null where id = :id").param("id", id).update();
	}

	@Override
	public List<Long> lockActiveAdmins() {
		return jdbc.sql("select id from staff_user where role = 'admin' and active for update").query(Long.class).list();
	}

	@Override
	public long create(String name, StaffRole role, String pinHash) {
		return jdbc.sql("insert into staff_user (name, role, pin_hash) values (:name, :role, :pinHash) returning id")
			.param("name", name)
			.param("role", role.name())
			.param("pinHash", pinHash)
			.query(Long.class)
			.single();
	}

	@Override
	public boolean update(long id, String name, StaffRole role, boolean active) {
		return jdbc.sql("update staff_user set name = :name, role = :role, active = :active where id = :id")
			.param("id", id)
			.param("name", name)
			.param("role", role.name())
			.param("active", active)
			.update() == 1;
	}

	@Override
	public void changePin(long id, String pinHash) {
		jdbc.sql("update staff_user set pin_hash = :pinHash, failed_pins = 0, locked_until = null where id = :id")
			.param("id", id)
			.param("pinHash", pinHash)
			.update();
	}

	@Override
	public boolean isEmpty() {
		return jdbc.sql("select not exists (select 1 from staff_user)").query(Boolean.class).single();
	}

}
