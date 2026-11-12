package ec.elmirador.staff.domain;

import jakarta.validation.constraints.Pattern;

public record SignIn(long staffId, @Pattern(regexp = StaffService.PIN) String pin) {
}
