package ec.elmirador.staff.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import jakarta.annotation.Nullable;

public interface StaffRepository {

	List<Member> members();

	List<User> users();

	Optional<User> user(long id);

	Optional<Credentials> lockForSignIn(long id);

	void recordFailedPin(long id, int failedPins, @Nullable OffsetDateTime lockedUntil);

	void recordSignIn(long id);

	List<Long> lockActiveAdmins();

	long create(String name, StaffRole role, String pinHash);

	boolean update(long id, String name, StaffRole role, boolean active);

	void changePin(long id, String pinHash);

	boolean isEmpty();

	record Member(long id, String name) {
	}

	record User(long id, String name, StaffRole role, boolean active, @Nullable OffsetDateTime lockedUntil) {
	}

	record Credentials(long id, String name, StaffRole role, boolean active, String pinHash, int failedPins,
			@Nullable OffsetDateTime lockedUntil) {
	}

}
