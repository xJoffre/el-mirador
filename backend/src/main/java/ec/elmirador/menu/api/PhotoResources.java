package ec.elmirador.menu.api;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import ec.elmirador.menu.domain.PhotoStore;
import ec.elmirador.shared.AppProperties;

@Configuration
class PhotoResources implements WebMvcConfigurer {

	private final AppProperties properties;

	PhotoResources(AppProperties properties) throws IOException {
		this.properties = properties;
		Files.createDirectories(properties.photos());
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler(PhotoStore.PATH + "**")
			.addResourceLocations(properties.photos().toAbsolutePath().toUri().toString())
			.setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
	}

}
