package ec.elmirador.shared;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;

import io.swagger.v3.core.jackson.ModelResolver;
import io.swagger.v3.core.util.Json31;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
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

	@Bean
	ModelResolver snakeCaseSchemas() {
		return new ModelResolver(Json31.mapper().copy().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE))
			.openapi31(true);
	}

	@Bean
	OpenApiCustomizer everyPropertyIsSent() {
		return api -> {
			Map<String, Schema> schemas = Optional.ofNullable(api.getComponents().getSchemas()).orElse(Map.of());
			for (Schema schema : schemas.values()) {
				Map<String, Schema> properties = schema.getProperties();
				if (properties != null) {
					schema.setRequired(List.copyOf(properties.keySet()));
				}
			}
		};
	}

}
