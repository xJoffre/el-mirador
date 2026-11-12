package ec.elmirador.staff.api;

import java.io.IOException;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.web.filter.OncePerRequestFilter;

import ec.elmirador.staff.domain.Session;
import ec.elmirador.staff.domain.StaffService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

class StaffSessionFilter extends OncePerRequestFilter {

	private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

	private final StaffService staff;

	StaffSessionFilter(StaffService staff) {
		this.staff = staff;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		var context = holder.getContext();
		if (context.getAuthentication() != null && context.getAuthentication().getPrincipal() instanceof Session session) {
			staff.current(session.id())
				.ifPresentOrElse(current -> context.setAuthentication(StaffAuthentication.of(current)), () -> {
					holder.clearContext();
					var httpSession = request.getSession(false);
					if (httpSession != null) {
						httpSession.invalidate();
					}
				});
		}
		chain.doFilter(request, response);
	}

}
