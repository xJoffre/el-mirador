package ec.elmirador.menu.infra;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import ec.elmirador.shared.AppProperties;

class FilePhotoStoreTest {

	@TempDir
	Path directory;

	private FilePhotoStore store() {
		return new FilePhotoStore(new AppProperties(ZoneId.of("America/Guayaquil"), directory, new AppProperties.FirstAdmin("", "")));
	}

	private static byte[] png(int width, int height) throws Exception {
		var bytes = new ByteArrayOutputStream();
		ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB), "png", bytes);
		return bytes.toByteArray();
	}

	@Test
	void aLargePhotoIsShrunkToSixHundredPixelsOnItsLongestSide() throws Exception {
		var path = store().save(new ByteArrayInputStream(png(3000, 2000))).orElseThrow();
		var saved = ImageIO.read(directory.resolve(Path.of(path).getFileName()).toFile());

		assertThat(path).startsWith("/photos/").endsWith(".jpg");
		assertThat(saved.getWidth()).isEqualTo(600);
		assertThat(saved.getHeight()).isEqualTo(400);
	}

	@Test
	void aSmallPhotoKeepsItsSize() throws Exception {
		var path = store().save(new ByteArrayInputStream(png(300, 500))).orElseThrow();

		assertThat(ImageIO.read(directory.resolve(Path.of(path).getFileName()).toFile()).getHeight()).isEqualTo(500);
	}

	@Test
	void somethingThatIsNotAnImageIsRefusedAndDeletingIsByFileName() throws Exception {
		var store = store();

		assertThat(store.save(new ByteArrayInputStream("hola".getBytes()))).isEmpty();
		var path = store.save(new ByteArrayInputStream(png(10, 10))).orElseThrow();
		store.delete(path);
		assertThat(Files.list(directory)).isEmpty();
	}

}
