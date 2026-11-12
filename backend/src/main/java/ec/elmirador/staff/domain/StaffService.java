package ec.elmirador.staff.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ec.elmirador.shared.ApiException;
import ec.elmirador.staff.domain.StaffRepository.Credentials;
import ec.elmirador.staff.domain.StaffRepository.Member;
import ec.elmirador.staff.domain.StaffRepository.User;

@Service
public class StaffService {

	public static final String PIN = "[0-9]{6}";

	static final int MAX_FAILED_PINS = 5;

	static final Duration LOCK = Duration.ofMinutes(15);

	private final StaffRepository repository;

	private final PasswordEncoder pins;

	private final Clock clock;

	public StaffService(StaffRepository repository, PasswordEncoder pins, Clock clock) {
		this.repository = repository;
		this.pins = pins;
		this.clock = clock;
	}

	public List<Member> members() {
		return repository.members();
	}

	public List<User> users() {
		return repository.users();
	}

	public Optional<Session> current(long id) {
		return repository.user(id).filter(User::active).map(user -> new Session(user.id(), user.name(), user.role()));
	}

	@Transactional(noRollbackFor = ApiException.class)
	public Session signIn(SignIn request) {
		var now = OffsetDateTime.now(clock);
		var user = repository.lockForSignIn(request.staffId())
			.filter(Credentials::active)
			.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "staff.wrongPin"));
		if (user.lockedUntil() != null && user.lockedUntil().isAfter(now)) {
			throw locked(user.lockedUntil());
		}
		if (!pins.matches(request.pin(), user.pinHash())) {
			var failedPins = user.failedPins() + 1;
			if (failedPins >= MAX_FAILED_PINS) {
				repository.recordFailedPin(user.id(), 0, now.plus(LOCK));
				throw locked(now.plus(LOCK));
			}
			repository.recordFailedPin(user.id(), failedPins, null);
			throw new ApiException(HttpStatus.UNAUTHORIZED, "staff.wrongPin");
		}
		repository.recordSignIn(user.id());
		return new Session(user.id(), user.name(), user.role());
	}

	public long create(NewUser user) {
		return repository.create(user.name().strip(), user.role(), pins.encode(user.pin()));
	}

	@Transactional
	public void update(Session actor, long id, UserChange change) {
		if (actor.id() == id && (change.role() != actor.role() || !change.active())) {
			throw new ApiException(HttpStatus.CONFLICT, "staff.ownAccess");
		}
		var admins = repository.lockActiveAdmins();
		var removesAnAdmin = admins.contains(id) && (change.role() != StaffRole.admin || !change.active());
		if (removesAnAdmin && admins.size() == 1) {
			throw new ApiException(HttpStatus.CONFLICT, "staff.lastAdmin");
		}
		if (!repository.update(id, change.name().strip(), change.role(), change.active())) {
			throw new ApiException(HttpStatus.NOT_FOUND, "staff.notFound");
		}
		if (change.pin() != null) {
			repository.changePin(id, pins.encode(change.pin()));
		}
	}

	public void createFirstAdmin(String name, String pin) {
		if (!pin.matches(PIN)) {
			throw new IllegalStateException("FIRST_ADMIN_PIN must be " + PIN);
		}
		if (repository.isEmpty()) {
			create(new NewUser(name, StaffRole.admin, pin));
		}
	}

	private static ApiException locked(OffsetDateTime until) {
		var error = new ApiException(HttpStatus.LOCKED, "staff.locked");
		error.getBody().setProperty("until", until.toString());
		return error;
	}

}
