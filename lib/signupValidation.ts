import { CSP_PROFESSIONS, REGIONS_FR } from "@/lib/product";
import type { Sex } from "@/lib/types";
import { normalizeFrenchMobilePhoneInput } from "@/lib/validation";
import { isValidEmail, normalizeAuthEmail } from "@/lib/authValidation";

export const SIGNUP_FIELDS = [
  "email",
  "confirmEmail",
  "password",
  "confirmPassword",
  "username",
  "sex",
  "age",
  "profession",
  "region",
  "phone"
] as const;

export type SignupField = (typeof SIGNUP_FIELDS)[number];

export type SignupValues = {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  username: string;
  sex: Sex | null;
  age: string;
  profession: string;
  region: string;
  phone: string;
};

export type SignupErrors = Partial<Record<SignupField, string>>;
export type SignupTouched = Partial<Record<SignupField, boolean>>;

export function normalizeSignupEmail(value: string) {
  return normalizeAuthEmail(value);
}

export function isSignupFieldEmpty(field: SignupField, values: SignupValues) {
  if (field === "sex") return values.sex === null;
  return values[field].trim().length === 0;
}

export function getPasswordIssues(password: string) {
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
}

export function isStrongSignupPassword(password: string) {
  return getPasswordIssues(password).every(Boolean);
}

export function normalizeSignupUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidSignupUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(normalizeSignupUsername(value));
}

export function validateSignupField(field: SignupField, values: SignupValues): string | null {
  switch (field) {
    case "email":
      if (!values.email.trim()) return "L’adresse email est obligatoire.";
      return isValidEmail(values.email) ? null : "Veuillez saisir une adresse email valide.";
    case "confirmEmail":
      if (!values.confirmEmail.trim()) return "La confirmation de l’email est obligatoire.";
      return normalizeSignupEmail(values.email) === normalizeSignupEmail(values.confirmEmail)
        ? null
        : "Les emails ne correspondent pas.";
    case "password":
      if (!values.password) return "Le mot de passe est obligatoire.";
      return isStrongSignupPassword(values.password)
        ? null
        : "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
    case "confirmPassword":
      if (!values.confirmPassword) return "La confirmation du mot de passe est obligatoire.";
      return values.password === values.confirmPassword ? null : "Les mots de passe ne correspondent pas.";
    case "username":
      if (!values.username.trim()) return "Le pseudo est obligatoire.";
      return isValidSignupUsername(values.username)
        ? null
        : "Le pseudo doit contenir entre 3 et 20 caractères, sans espace.";
    case "sex":
      return values.sex === "homme" || values.sex === "femme" ? null : "Veuillez sélectionner votre sexe.";
    case "age": {
      if (!values.age.trim()) return "L’âge est obligatoire.";
      const age = Number(values.age);
      return /^\d{1,3}$/.test(values.age.trim()) && Number.isInteger(age) && age >= 13 && age <= 120
        ? null
        : "Veuillez saisir un âge valide entre 13 et 120 ans.";
    }
    case "profession":
      if (!values.profession) return "Veuillez sélectionner une profession.";
      return (CSP_PROFESSIONS as readonly string[]).includes(values.profession)
        ? null
        : "Veuillez sélectionner une profession.";
    case "region":
      if (!values.region) return "Veuillez sélectionner une région.";
      return REGIONS_FR.includes(values.region) ? null : "Veuillez sélectionner une région.";
    case "phone":
      if (!values.phone.trim()) return "Le numéro de téléphone est obligatoire.";
      return normalizeFrenchMobilePhoneInput(values.phone).ok
        ? null
        : "Veuillez saisir un numéro de mobile français valide.";
  }
}

export function validateSignup(values: SignupValues) {
  const errors: SignupErrors = {};
  for (const field of SIGNUP_FIELDS) {
    const message = validateSignupField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

export function getVisibleSignupError(field: SignupField, values: SignupValues, touched: SignupTouched, submitted: SignupTouched) {
  const error = validateSignupField(field, values);
  if (!error) return undefined;
  if (isSignupFieldEmpty(field, values)) return submitted[field] ? error : undefined;
  return touched[field] || submitted[field] ? error : undefined;
}

export function touchAllSignupFields(): SignupTouched {
  return Object.fromEntries(SIGNUP_FIELDS.map((field) => [field, true])) as SignupTouched;
}
