import { CSP_PROFESSIONS, REGIONS_FR } from "@/lib/product";
import type { Sex } from "@/lib/types";
import { normalizeFrenchMobilePhoneInput } from "@/lib/validation";

export const SIGNUP_FIELDS = [
  "email",
  "confirmEmail",
  "password",
  "confirmPassword",
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
  sex: Sex | null;
  age: string;
  profession: string;
  region: string;
  phone: string;
};

export type SignupErrors = Partial<Record<SignupField, string>>;
export type SignupTouched = Partial<Record<SignupField, boolean>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeSignupEmail(value: string) {
  return value.trim().toLowerCase();
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

export function validateSignupField(field: SignupField, values: SignupValues): string | null {
  switch (field) {
    case "email":
      return EMAIL_PATTERN.test(normalizeSignupEmail(values.email)) ? null : "Veuillez saisir une adresse email valide.";
    case "confirmEmail":
      return normalizeSignupEmail(values.email) === normalizeSignupEmail(values.confirmEmail)
        ? null
        : "Les emails ne correspondent pas.";
    case "password":
      return isStrongSignupPassword(values.password)
        ? null
        : "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.";
    case "confirmPassword":
      return values.password === values.confirmPassword ? null : "Les mots de passe ne correspondent pas.";
    case "sex":
      return values.sex === "homme" || values.sex === "femme" ? null : "Veuillez sélectionner votre sexe.";
    case "age": {
      const age = Number(values.age);
      return /^\d{1,3}$/.test(values.age.trim()) && Number.isInteger(age) && age >= 13 && age <= 120
        ? null
        : "Veuillez saisir un âge valide entre 13 et 120 ans.";
    }
    case "profession":
      return (CSP_PROFESSIONS as readonly string[]).includes(values.profession)
        ? null
        : "Veuillez sélectionner une profession.";
    case "region":
      return REGIONS_FR.includes(values.region) ? null : "Veuillez sélectionner une région.";
    case "phone":
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

export function touchAllSignupFields(): SignupTouched {
  return Object.fromEntries(SIGNUP_FIELDS.map((field) => [field, true])) as SignupTouched;
}
