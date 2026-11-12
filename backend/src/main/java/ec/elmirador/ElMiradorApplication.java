package ec.elmirador;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ElMiradorApplication {

	public static void main(String[] args) {
		SpringApplication.run(ElMiradorApplication.class, args);
	}

}
