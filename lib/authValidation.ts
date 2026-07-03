const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(normalizeAuthEmail(value));
}

export type LoginField = "email" | "password";
export type LoginValues = { email: string; password: string };
export type LoginErrors = Partial<Record<LoginField, string>>;

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = "L’adresse email est obligatoire.";
  else if (!isValidEmail(values.email)) errors.email = "Veuillez saisir une adresse email valide.";
  if (!values.password) errors.password = "Le mot de passe est obligatoire.";
  return errors;
}

export function getVisibleLoginError(field: LoginField, values: LoginValues, touched: Partial<Record<LoginField, boolean>>, submitted: Partial<Record<LoginField, boolean>>) {
  const error = validateLogin(values)[field];
  if (!error) return undefined;
  if (!values[field].trim()) return submitted[field] ? error : undefined;
  return touched[field] || submitted[field] ? error : undefined;
}
