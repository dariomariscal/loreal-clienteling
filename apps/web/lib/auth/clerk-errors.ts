import type { ClerkAPIError } from "@clerk/types";

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

export function formatClerkError(error: ClerkAPIError): string {
  return SPANISH_MESSAGES[error.code] ?? error.longMessage ?? error.message;
}

export function getFieldError(
  errors: ClerkAPIError[] | undefined,
  field: string,
): string | undefined {
  const match = errors?.find((e) => e.meta?.paramName === field);
  return match ? formatClerkError(match) : undefined;
}

export function getGlobalError(errors: ClerkAPIError[] | undefined): string | undefined {
  const match = errors?.find((e) => !e.meta?.paramName);
  return match ? formatClerkError(match) : undefined;
}
