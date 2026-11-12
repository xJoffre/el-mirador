package ec.elmirador.staff.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import ec.elmirador.invoicing.domain.InvoiceService;
import ec.elmirador.menu.domain.CatalogService;
import ec.elmirador.menu.domain.LunchService;
import ec.elmirador.menu.domain.MenuService;
import ec.elmirador.orders.domain.OrderService;
import ec.elmirador.schedule.domain.ScheduleService;
import ec.elmirador.shared.AppProperties;
import ec.elmirador.shared.EventStream;
import ec.elmirador.staff.domain.Session;
import ec.elmirador.staff.domain.StaffRole;
import ec.elmirador.staff.domain.StaffService;

@WebMvcTest
@Import(SecurityConfiguration.class)
@EnableConfigurationProperties(AppProperties.class)
class PermissionsTest {

	private static final String ANONYMOUS = "anonymous";

	@Autowired
	private MockMvc http;

	@MockitoBean
	private StaffService staff;

	@MockitoBean
	private MenuService menu;

	@MockitoBean
	private CatalogService catalog;

	@MockitoBean
	private ScheduleService schedule;

	@MockitoBean
	private LunchService lunches;

	@MockitoBean
	private OrderService orders;

	@MockitoBean
	private InvoiceService invoices;

	@MockitoBean
	private EventStream events;

	static Stream<Arguments> routes() {
		var everyone = List.of(ANONYMOUS, "admin", "floor", "kitchen");
		var staff = List.of("admin", "floor", "kitchen");
		var admin = List.of("admin");
		return Stream.of(
				Arguments.of(HttpMethod.GET, "/api/menu", everyone),
				Arguments.of(HttpMethod.GET, "/api/schedule", everyone),
				Arguments.of(HttpMethod.GET, "/api/staff/members", everyone),
				Arguments.of(HttpMethod.POST, "/api/staff/session", everyone),
				Arguments.of(HttpMethod.GET, "/api/staff/session", staff),
				Arguments.of(HttpMethod.DELETE, "/api/staff/session", staff),
				Arguments.of(HttpMethod.PUT, "/api/menu/products/1/sold-out", staff),
				Arguments.of(HttpMethod.PUT, "/api/menu/option-items/1/sold-out", staff),
				Arguments.of(HttpMethod.PUT, "/api/menu/lunch/2026-11-14/dishes/1/sold-out", staff),
				Arguments.of(HttpMethod.GET, "/api/menu/lunch-dishes", admin),
				Arguments.of(HttpMethod.POST, "/api/menu/lunch-dishes", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/lunch-dishes/1", admin),
				Arguments.of(HttpMethod.GET, "/api/menu/lunch/2026-11-14", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/lunch/2026-11-14", admin),
				Arguments.of(HttpMethod.DELETE, "/api/menu/lunch/2026-11-14", admin),
				Arguments.of(HttpMethod.POST, "/api/schedule/status", admin),
				Arguments.of(HttpMethod.PUT, "/api/schedule/today", admin),
				Arguments.of(HttpMethod.DELETE, "/api/schedule/today", admin),
				Arguments.of(HttpMethod.GET, "/api/menu/catalog", admin),
				Arguments.of(HttpMethod.POST, "/api/menu/categories", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/categories/1", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/categories/order", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/categories/1/products/order", admin),
				Arguments.of(HttpMethod.DELETE, "/api/menu/categories/1", admin),
				Arguments.of(HttpMethod.POST, "/api/menu/products", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/products/1", admin),
				Arguments.of(HttpMethod.DELETE, "/api/menu/products/1", admin),
				Arguments.of(HttpMethod.PUT, "/api/menu/products/1/photo", admin),
				Arguments.of(HttpMethod.DELETE, "/api/menu/products/1/photo", admin),
				Arguments.of(HttpMethod.PUT, "/api/schedule/profile", admin),
				Arguments.of(HttpMethod.PUT, "/api/schedule/week", admin),
				Arguments.of(HttpMethod.GET, "/api/staff/users", admin),
				Arguments.of(HttpMethod.POST, "/api/staff/users", admin),
				Arguments.of(HttpMethod.PUT, "/api/staff/users/2", admin),
				Arguments.of(HttpMethod.POST, "/api/orders", everyone),
				Arguments.of(HttpMethod.GET, "/api/orders/tracking/abc", everyone),
				Arguments.of(HttpMethod.GET, "/api/orders/kitchen", List.of("admin", "kitchen")),
				Arguments.of(HttpMethod.PUT, "/api/orders/rounds/1/start", List.of("admin", "kitchen")),
				Arguments.of(HttpMethod.PUT, "/api/orders/rounds/1/ready", List.of("admin", "kitchen")),
				Arguments.of(HttpMethod.GET, "/api/orders/today", List.of("admin", "floor")),
				Arguments.of(HttpMethod.POST, "/api/orders/1/close", List.of("admin", "floor")),
				Arguments.of(HttpMethod.POST, "/api/orders/1/cancel", admin),
				Arguments.of(HttpMethod.GET, "/api/orders/payments/2026-11-14", admin),
				Arguments.of(HttpMethod.PUT, "/api/orders/payments/1/verified", admin),
				Arguments.of(HttpMethod.GET, "/api/invoicing/requests/2026-11-14", admin),
				Arguments.of(HttpMethod.PUT, "/api/invoicing/requests/1", admin),
				Arguments.of(HttpMethod.GET, "/api/invoicing/sales?from=2026-11-14&to=2026-11-14", admin),
				Arguments.of(HttpMethod.GET, "/api/invoicing/sales.csv?from=2026-11-14&to=2026-11-14", admin),
				Arguments.of(HttpMethod.GET, "/api/anything-new", admin));
	}

	@ParameterizedTest(name = "{0} {1}")
	@MethodSource("routes")
	void everyRouteLetsInOnlyItsRoles(HttpMethod method, String path, List<String> allowed) throws Exception {
		given(staff.signIn(any())).willReturn(new Session(1, "Rosa", StaffRole.admin));
		for (var role : Stream.concat(Stream.of(ANONYMOUS), Arrays.stream(StaffRole.values()).map(Enum::name)).toList()) {
			var call = request(method, path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}");
			if (!role.equals(ANONYMOUS)) {
				var session = new Session(1, "Rosa", StaffRole.valueOf(role));
				given(staff.current(1)).willReturn(Optional.of(session));
				call.with(authentication(StaffAuthentication.of(session)));
			}
			var status = http.perform(call).andReturn().getResponse().getStatus();

			var refused = role.equals(ANONYMOUS) ? 401 : 403;
			if (allowed.contains(role)) {
				assertThat(status).as("%s as %s", path, role).isNotIn(401, 403);
			}
			else {
				assertThat(status).as("%s as %s", path, role).isEqualTo(refused);
			}
		}
	}

}
