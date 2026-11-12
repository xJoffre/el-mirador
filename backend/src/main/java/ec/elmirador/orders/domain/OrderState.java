package ec.elmirador.orders.domain;

public enum OrderState {

	received, preparing, ready, delivered, cancelled;

	public static OrderState of(String status, boolean allReady, boolean anyStarted) {
		return switch (status) {
			case "cancelled" -> cancelled;
			case "closed" -> delivered;
			default -> allReady ? ready : anyStarted ? preparing : received;
		};
	}

}
