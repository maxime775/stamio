import { StyleSheet, Text } from "react-native";
import { palette } from "@/lib/design";
import { getPasswordIssues as getSignupPasswordIssues, isStrongSignupPassword } from "@/lib/signupValidation";

export function getPasswordIssues(password: string) {
  const issues = getSignupPasswordIssues(password);
  return ["8 caractères minimum", "Une majuscule", "Un chiffre", "Un caractère spécial"]
    .map((label, index) => ({ label, ok: issues[index] }));
}

export function isStrongPassword(password: string) {
  return isStrongSignupPassword(password);
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
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4
  }
});
