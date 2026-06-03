/**
 * Spanish localization for Clerk's most common error codes, plus helpers
 * that the auth forms use to surface errors via react-hook-form.
 *
 * Two shapes coexist:
 *
 *   - **Signal errors** (`FieldError | null`) — the SignInFuture /
 *     SignUpFuture signals expose errors on `errors.fields.<name>` as
 *     `FieldError` objects. Use `formatFieldError`.
 *   - **Thrown errors** (`ClerkAPIError[]`) — `User.update()` /
 *     `User.updatePassword()` / `User.setProfileImage()` still throw on
 *     failure, caught with `isClerkAPIResponseError`. The `getFieldError` /
 *     `getGlobalError` helpers find errors by `paramName` for those.
 */
import type { FieldError, ClerkAPIError } from "@clerk/nextjs/types";

const SPANISH_MESSAGES: Record<string, string> = {
  form_identifier_not_found: "No encontramos una cuenta con ese correo.",
  form_password_incorrect: "Contraseña incorrecta.",
  form_password_pwned: "Esta contraseña apareció en una filtración. Elige otra.",
  form_password_length_too_short: "La contraseña debe tener al menos 8 caracteres.",
  form_code_incorrect: "El código es incorrecto.",
  form_param_format_invalid: "Formato inválido.",
  verification_expired: "El código expiró. Solicita uno nuevo.",
  too_many_requests: "Demasiados intentos. Espera unos minutos.",
};

function localize(code: string, fallback: string): string {
  return SPANISH_MESSAGES[code] ?? fallback;
}

export function formatFieldError(
  error: FieldError | null | undefined,
): string | undefined {
  if (!error) return undefined;
  return localize(error.code, error.longMessage ?? error.message);
}

export function formatClerkError(error: ClerkAPIError): string {
  return localize(error.code, error.longMessage ?? error.message);
}

export function getFieldError(
  errors: ClerkAPIError[] | undefined,
  field: string,
): string | undefined {
  const match = errors?.find((e) => e.meta?.paramName === field);
  return match ? formatClerkError(match) : undefined;
}

export function getGlobalError(
  errors: ClerkAPIError[] | undefined,
): string | undefined {
  const match = errors?.find((e) => !e.meta?.paramName);
  return match ? formatClerkError(match) : undefined;
}
