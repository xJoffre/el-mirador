package ec.elmirador.shared;

import java.sql.SQLException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class ApiErrors {

	private static final String FOREIGN_KEY_VIOLATION = "23503";

	@ExceptionHandler(DuplicateKeyException.class)
	ProblemDetail duplicate() {
		return problem("shared.duplicate");
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ProblemDetail rejected(DataIntegrityViolationException error) {
		var inUse = error.getMostSpecificCause() instanceof SQLException cause && FOREIGN_KEY_VIOLATION.equals(cause.getSQLState());
		return problem(inUse ? "shared.inUse" : "shared.rejected");
	}

	private static ProblemDetail problem(String code) {
		var problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
		problem.setProperty("code", code);
		return problem;
	}

}
