package ec.elmirador.menu.infra;

import java.awt.Color;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Component;

import ec.elmirador.menu.domain.PhotoStore;
import ec.elmirador.shared.AppProperties;

@Component
class FilePhotoStore implements PhotoStore {

	static final int SIZE = 600;

	private final Path directory;

	FilePhotoStore(AppProperties properties) {
		this.directory = properties.photos();
	}

	@Override
	public Optional<String> save(InputStream image) throws IOException {
		var source = ImageIO.read(image);
		if (source == null) {
			return Optional.empty();
		}
		var scale = Math.min(1, (double) SIZE / Math.max(source.getWidth(), source.getHeight()));
		var width = (int) Math.round(source.getWidth() * scale);
		var height = (int) Math.round(source.getHeight() * scale);
		var target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		var graphics = target.createGraphics();
		graphics.drawImage(source.getScaledInstance(width, height, Image.SCALE_SMOOTH), 0, 0, Color.WHITE, null);
		graphics.dispose();
		var name = UUID.randomUUID() + ".jpg";
		Files.createDirectories(directory);
		ImageIO.write(target, "jpg", directory.resolve(name).toFile());
		return Optional.of(PATH + name);
	}

	@Override
	public void delete(String path) throws IOException {
		Files.deleteIfExists(directory.resolve(Path.of(path).getFileName()));
	}

}
