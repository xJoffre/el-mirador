package ec.elmirador.staff.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record NewUser(@NotBlank String name, @NotNull StaffRole role, @Pattern(regexp = StaffService.PIN) String pin) {
}
