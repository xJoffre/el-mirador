package ec.elmirador.staff.domain;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignIn(long staffId, @Size(min = StaffService.PIN_LENGTH, max = StaffService.PIN_LENGTH) @Pattern(regexp = StaffService.PIN) String pin) {
}
