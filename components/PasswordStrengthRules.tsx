import { StyleSheet, Text } from "react-native";

export function getPasswordIssues(password: string) {
  return [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Un chiffre", ok: /\d/.test(password) },
    { label: "Un caractère spécial", ok: /[^A-Za-z0-9]/.test(password) }
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordIssues(password).every((rule) => rule.ok);
}

export function PasswordStrengthRules({ password }: { password: string }) {
  void password;
  return (
    <Text style={styles.help}>
      * Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, un chiffre et un caractère spécial.
    </Text>
  );
}

const styles = StyleSheet.create({
  help: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: -4
  }
});
