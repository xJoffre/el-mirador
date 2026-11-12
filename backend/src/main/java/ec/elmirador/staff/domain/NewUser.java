package ec.elmirador.staff.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record NewUser(@NotBlank String name, @NotNull StaffRole role, @Size(min = StaffService.PIN_LENGTH, max = StaffService.PIN_LENGTH) @Pattern(regexp = StaffService.PIN) String pin) {
}
