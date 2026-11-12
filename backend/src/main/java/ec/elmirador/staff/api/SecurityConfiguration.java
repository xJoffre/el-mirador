package ec.elmirador.staff.api;

import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.http.HttpMethod.PUT;

import java.io.IOException;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CsrfException;

import ec.elmirador.staff.domain.StaffRole;
import ec.elmirador.staff.domain.StaffService;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

@Configuration
class SecurityConfiguration {

	@Bean
	PasswordEncoder pins() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, StaffService staff, JsonMapper json) {
		var everyone = new String[] { StaffRole.admin.name(), StaffRole.floor.name(), StaffRole.kitchen.name() };
		return http.csrf(csrf -> csrf.spa())
			.authorizeHttpRequests(routes -> routes
				.requestMatchers(GET, "/api/menu", "/api/schedule", "/api/events", "/api/staff/members").permitAll()
				.requestMatchers(POST, "/api/staff/session", "/api/orders").permitAll()
				.requestMatchers(GET, "/api/orders/tracking/*").permitAll()
				.requestMatchers(GET, "/api/orders/kitchen").hasAnyRole(StaffRole.admin.name(), StaffRole.kitchen.name())
				.requestMatchers(PUT, "/api/orders/rounds/*/start", "/api/orders/rounds/*/ready")
				.hasAnyRole(StaffRole.admin.name(), StaffRole.kitchen.name())
				.requestMatchers(GET, "/api/orders/today").hasAnyRole(StaffRole.admin.name(), StaffRole.floor.name())
				.requestMatchers(POST, "/api/orders/*/close").hasAnyRole(StaffRole.admin.name(), StaffRole.floor.name())
				.requestMatchers("/api/staff/session").authenticated()
				.requestMatchers(PUT, "/api/menu/products/*/sold-out", "/api/menu/option-items/*/sold-out", "/api/menu/lunch/*/dishes/*/sold-out")
				.hasAnyRole(everyone)
				.requestMatchers("/api/**").hasRole(StaffRole.admin.name())
				.anyRequest().permitAll())
			.exceptionHandling(errors -> errors
				.authenticationEntryPoint((request, response, error) -> problem(json, response, HttpStatus.UNAUTHORIZED, "staff.signInRequired"))
				.accessDeniedHandler((request, response, error) -> problem(json, response, HttpStatus.FORBIDDEN,
						error instanceof CsrfException ? "staff.staleForm" : "staff.forbidden")))
			.addFilterAfter(new StaffSessionFilter(staff), SecurityContextHolderFilter.class)
			.build();
	}

	private static void problem(JsonMapper json, HttpServletResponse response, HttpStatus status, String code)
			throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		json.writeValue(response.getOutputStream(), Map.of("status", status.value(), "title", status.getReasonPhrase(), "code", code));
	}

}
