package ec.elmirador.staff.api;

import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import ec.elmirador.staff.domain.Session;

final class StaffAuthentication {

	private StaffAuthentication() {
	}

	static Authentication of(Session session) {
		return UsernamePasswordAuthenticationToken.authenticated(session, null,
				List.of(new SimpleGrantedAuthority("ROLE_" + session.role().name())));
	}

}
