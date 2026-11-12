package ec.elmirador.staff.domain;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UserChange(@NotBlank String name, @NotNull StaffRole role, boolean active,
		@Nullable @Pattern(regexp = StaffService.PIN) String pin) {
}
