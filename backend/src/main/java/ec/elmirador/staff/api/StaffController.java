package ec.elmirador.staff.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ec.elmirador.shared.Saved;
import ec.elmirador.staff.domain.NewUser;
import ec.elmirador.staff.domain.Session;
import ec.elmirador.staff.domain.SignIn;
import ec.elmirador.staff.domain.StaffRepository.Member;
import ec.elmirador.staff.domain.StaffRepository.User;
import ec.elmirador.staff.domain.StaffService;
import ec.elmirador.staff.domain.UserChange;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/staff")
class StaffController {

	private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

	private final SecurityContextRepository contexts = new HttpSessionSecurityContextRepository();

	private final StaffService staff;

	StaffController(StaffService staff) {
		this.staff = staff;
	}

	@GetMapping("/members")
	List<Member> getMembers() {
		return staff.members();
	}

	@PostMapping("/session")
	Session signIn(@Valid @RequestBody SignIn request, HttpServletRequest http, HttpServletResponse response) {
		var session = staff.signIn(request);
		if (http.getSession(false) != null) {
			http.changeSessionId();
		}
		var context = holder.createEmptyContext();
		context.setAuthentication(StaffAuthentication.of(session));
		holder.setContext(context);
		contexts.saveContext(context, http, response);
		return session;
	}

	@GetMapping("/session")
	Session getSession(@AuthenticationPrincipal Session session) {
		return session;
	}

	@DeleteMapping("/session")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void signOut(HttpServletRequest http) {
		var session = http.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		holder.clearContext();
	}

	@GetMapping("/users")
	List<User> getUsers() {
		return staff.users();
	}

	@PostMapping("/users")
	Saved createUser(@Valid @RequestBody NewUser user) {
		return new Saved(staff.create(user));
	}

	@PutMapping("/users/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void updateUser(@AuthenticationPrincipal Session actor, @PathVariable long id, @Valid @RequestBody UserChange change) {
		staff.update(actor, id, change);
	}

}
