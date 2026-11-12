package ec.elmirador.shared;

import java.nio.file.Path;
import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(ZoneId zone, Path photos, FirstAdmin firstAdmin) {

	public record FirstAdmin(String name, String pin) {
	}

}
