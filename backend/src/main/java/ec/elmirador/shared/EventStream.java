package ec.elmirador.shared;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class EventStream {

	private final Set<SseEmitter> subscribers = ConcurrentHashMap.newKeySet();

	SseEmitter subscribe() throws IOException {
		var emitter = new SseEmitter(0L);
		emitter.onCompletion(() -> subscribers.remove(emitter));
		emitter.onError(error -> subscribers.remove(emitter));
		emitter.send(SseEmitter.event().comment("connected"));
		subscribers.add(emitter);
		return emitter;
	}

	public void publish(String name, Object data) {
		for (var emitter : subscribers) {
			try {
				emitter.send(SseEmitter.event().name(name).data(data));
			}
			catch (IOException disconnected) {
				subscribers.remove(emitter);
			}
		}
	}

}
