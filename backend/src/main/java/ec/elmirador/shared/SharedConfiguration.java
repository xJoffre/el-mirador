package ec.elmirador.shared;

import java.time.Clock;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;

@Configuration
class SharedConfiguration {

	@Bean
	Clock clock(AppProperties properties) {
		return Clock.system(properties.zone());
	}

	@Bean
	OpenAPI openApi() {
		return new OpenAPI().info(new Info().title("El Mirador").version("1")).servers(List.of(new Server().url("/")));
	}

}
