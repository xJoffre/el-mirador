package ec.elmirador.shared;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.swagger.v3.oas.annotations.Hidden;

@Hidden
@RestController
class EventStreamController {

	private final EventStream stream;

	EventStreamController(EventStream stream) {
		this.stream = stream;
	}

	@GetMapping(path = "/api/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	SseEmitter events() throws IOException {
		return stream.subscribe();
	}

}
