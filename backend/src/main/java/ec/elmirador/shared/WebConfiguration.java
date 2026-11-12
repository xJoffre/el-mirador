package ec.elmirador.shared;

import java.io.IOException;
import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
class WebConfiguration implements WebMvcConfigurer {

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/assets/**")
			.addResourceLocations("classpath:/static/assets/")
			.setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
		registry.addResourceHandler("/**")
			.addResourceLocations("classpath:/static/")
			.setCacheControl(CacheControl.noCache())
			.setUseLastModified(false)
			.resourceChain(true)
			.addResolver(new AppRoutes());
	}

	private static final class AppRoutes extends PathResourceResolver {

		@Override
		protected Resource getResource(String path, Resource location) throws IOException {
			var resource = super.getResource(path, location);
			var appRoute = resource == null && !path.startsWith("api/") && !path.contains(".");
			return appRoute ? super.getResource("index.html", location) : resource;
		}

	}

}
