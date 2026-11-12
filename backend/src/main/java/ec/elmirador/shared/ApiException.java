package ec.elmirador.shared;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

public class ApiException extends ErrorResponseException {

	public ApiException(HttpStatus status, String code) {
		super(status);
		getBody().setProperty("code", code);
	}

}
