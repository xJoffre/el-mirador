package ec.elmirador.staff.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import ec.elmirador.shared.ApiException;
import ec.elmirador.staff.domain.StaffRepository.Credentials;
import ec.elmirador.staff.domain.StaffRepository.Member;
import ec.elmirador.staff.domain.StaffRepository.User;

class StaffServiceTest {

	private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

	private static final Instant NOON = Instant.parse("2026-11-14T17:00:00Z");

	static class InMemoryStaff implements StaffRepository {

		final Map<Long, Credentials> rows = new LinkedHashMap<>();

		@Override
		public List<Member> members() {
			return rows.values().stream().filter(Credentials::active).map(row -> new Member(row.id(), row.name())).toList();
		}

		@Override
		public List<User> users() {
			return rows.values().stream().map(row -> new User(row.id(), row.name(), row.role(), row.active(), row.lockedUntil())).toList();
		}

		@Override
		public Optional<User> user(long id) {
			return users().stream().filter(user -> user.id() == id).findFirst();
		}

		@Override
		public Optional<Credentials> lockForSignIn(long id) {
			return Optional.ofNullable(rows.get(id));
		}

		@Override
		public void recordFailedPin(long id, int failedPins, OffsetDateTime lockedUntil) {
			var row = rows.get(id);
			rows.put(id, new Credentials(id, row.name(), row.role(), row.active(), row.pinHash(), failedPins,
					lockedUntil == null ? row.lockedUntil() : lockedUntil));
		}

		@Override
		public void recordSignIn(long id) {
			var row = rows.get(id);
			rows.put(id, new Credentials(id, row.name(), row.role(), row.active(), row.pinHash(), 0, null));
		}

		@Override
		public List<Long> lockActiveAdmins() {
			return rows.values().stream().filter(row -> row.active() && row.role() == StaffRole.admin).map(Credentials::id).toList();
		}

		@Override
		public long create(String name, StaffRole role, String pinHash) {
			var id = rows.size() + 1L;
			rows.put(id, new Credentials(id, name, role, true, pinHash, 0, null));
			return id;
		}

		@Override
		public boolean update(long id, String name, StaffRole role, boolean active) {
			var row = rows.get(id);
			rows.put(id, new Credentials(id, name, role, active, row.pinHash(), row.failedPins(), row.lockedUntil()));
			return true;
		}

		@Override
		public void changePin(long id, String pinHash) {
			var row = rows.get(id);
			rows.put(id, new Credentials(id, row.name(), row.role(), row.active(), pinHash, 0, null));
		}

		@Override
		public boolean isEmpty() {
			return rows.isEmpty();
		}

	}

	private static final PasswordEncoder PLAIN = new PasswordEncoder() {

		@Override
		public String encode(CharSequence pin) {
			return "hash:" + pin;
		}

		@Override
		public boolean matches(CharSequence pin, String hash) {
			return hash.equals(encode(pin));
		}

	};

	private final InMemoryStaff repository = new InMemoryStaff();

	private StaffService at(Instant instant) {
		return new StaffService(repository, PLAIN, Clock.fixed(instant, ZONE));
	}

	private static String codeOf(Runnable action) {
		var errors = new ArrayList<String>();
		try {
			action.run();
		}
		catch (ApiException error) {
			errors.add((String) error.getBody().getProperties().get("code"));
		}
		return errors.isEmpty() ? "ok" : errors.getFirst();
	}

	@Test
	void fiveWrongPinsLockTheUserForFifteenMinutes() {
		var staff = at(NOON);
		var id = staff.create(new NewUser("Ana", StaffRole.floor, "123456"));

		var attempts = new ArrayList<String>();
		for (var attempt = 0; attempt < 5; attempt++) {
			attempts.add(codeOf(() -> staff.signIn(new SignIn(id, "000000"))));
		}

		assertThat(attempts).containsExactly("staff.wrongPin", "staff.wrongPin", "staff.wrongPin", "staff.wrongPin", "staff.locked");
		assertThat(codeOf(() -> staff.signIn(new SignIn(id, "123456")))).isEqualTo("staff.locked");
		assertThat(codeOf(() -> at(NOON.plus(Duration.ofMinutes(14))).signIn(new SignIn(id, "123456")))).isEqualTo("staff.locked");
		assertThat(at(NOON.plus(Duration.ofMinutes(15))).signIn(new SignIn(id, "123456"))).isEqualTo(new Session(id, "Ana", StaffRole.floor));
	}

	@Test
	void aRightPinStartsTheCountAgain() {
		var staff = at(NOON);
		var id = staff.create(new NewUser("Ana", StaffRole.floor, "123456"));

		for (var attempt = 0; attempt < 4; attempt++) {
			codeOf(() -> staff.signIn(new SignIn(id, "000000")));
		}
		staff.signIn(new SignIn(id, "123456"));
		for (var attempt = 0; attempt < 4; attempt++) {
			codeOf(() -> staff.signIn(new SignIn(id, "000000")));
		}

		assertThat(staff.signIn(new SignIn(id, "123456")).name()).isEqualTo("Ana");
	}

	@Test
	void unknownAndDeactivatedUsersOnlyHearTheirPinIsWrong() {
		var staff = at(NOON);
		var admin = staff.create(new NewUser("Rosa", StaffRole.admin, "111111"));
		var waiter = staff.create(new NewUser("Ana", StaffRole.floor, "123456"));
		staff.update(new Session(admin, "Rosa", StaffRole.admin), waiter, new UserChange("Ana", StaffRole.floor, false, null));

		assertThat(codeOf(() -> staff.signIn(new SignIn(waiter, "123456")))).isEqualTo("staff.wrongPin");
		assertThat(codeOf(() -> staff.signIn(new SignIn(99, "123456")))).isEqualTo("staff.wrongPin");
		assertThat(staff.current(waiter)).isEmpty();
	}

	@Test
	void nobodyRemovesTheirOwnRoleOrDeactivatesThemselves() {
		var staff = at(NOON);
		var id = staff.create(new NewUser("Rosa", StaffRole.admin, "111111"));
		var self = new Session(id, "Rosa", StaffRole.admin);

		assertThat(codeOf(() -> staff.update(self, id, new UserChange("Rosa", StaffRole.floor, true, null)))).isEqualTo("staff.ownAccess");
		assertThat(codeOf(() -> staff.update(self, id, new UserChange("Rosa", StaffRole.admin, false, null)))).isEqualTo("staff.ownAccess");
		assertThat(codeOf(() -> staff.update(self, id, new UserChange("Rosa María", StaffRole.admin, true, "222222")))).isEqualTo("ok");
		assertThat(staff.signIn(new SignIn(id, "222222")).name()).isEqualTo("Rosa María");
	}

	@Test
	void theLastActiveAdminCannotBeRemoved() {
		var staff = at(NOON);
		var rosa = staff.create(new NewUser("Rosa", StaffRole.admin, "111111"));
		var luis = staff.create(new NewUser("Luis", StaffRole.admin, "222222"));
		var asRosa = new Session(rosa, "Rosa", StaffRole.admin);
		var asLuis = new Session(luis, "Luis", StaffRole.admin);

		assertThat(codeOf(() -> staff.update(asRosa, luis, new UserChange("Luis", StaffRole.floor, true, null)))).isEqualTo("ok");
		assertThat(codeOf(() -> staff.update(asLuis, rosa, new UserChange("Rosa", StaffRole.floor, true, null)))).isEqualTo("staff.lastAdmin");
		assertThat(codeOf(() -> staff.update(asLuis, rosa, new UserChange("Rosa", StaffRole.admin, false, null)))).isEqualTo("staff.lastAdmin");
	}

	@Test
	void theFirstAdminIsCreatedOnlyOnAnEmptyTeam() {
		var staff = at(NOON);

		staff.createFirstAdmin("Rosa", "111111");
		staff.createFirstAdmin("Otra", "222222");

		assertThat(staff.users()).extracting(User::name, User::role).containsExactly(tuple("Rosa", StaffRole.admin));
		assertThatThrownBy(() -> new StaffService(new InMemoryStaff(), PLAIN, Clock.systemUTC()).createFirstAdmin("Rosa", "12"))
			.isInstanceOf(IllegalStateException.class);
	}

}
