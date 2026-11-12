package ec.elmirador.menu.domain;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

public interface PhotoStore {

	String PATH = "/photos/";

	Optional<String> save(InputStream image) throws IOException;

	void delete(String path) throws IOException;

}
