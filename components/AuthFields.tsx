import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { authField, fontFamilyMedium, palette, radius } from "@/lib/design";
import { SEX_OPTIONS } from "@/lib/product";
import type { Sex } from "@/lib/types";

type AuthTextFieldProps = ComponentProps<typeof TextInput> & {
  field: string;
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AuthTextField(props: AuthTextFieldProps) {
  const { field, label, error, style, containerStyle, onFocus, onBlur, ...inputProps } = props;
  const [focused, setFocused] = useState(false);
  const errorId = `${field}-error`;
  const webAccessibilityProps = Platform.OS === "web"
    ? ({ "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined } as ComponentProps<typeof TextInput>)
    : {};

  return (
    <View style={StyleSheet.flatten([styles.field, containerStyle])}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...webAccessibilityProps}
        accessibilityHint={error}
        nativeID={field}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={authField.placeholderColor}
        style={StyleSheet.flatten([styles.input, webInputReset, focused && styles.controlFocused, error && styles.controlInvalid, style])}
        {...inputProps}
      />
      {error ? <AuthErrorSlot nativeID={errorId} message={error} /> : null}
    </View>
  );
}

export function AuthSexSegmented({
  value,
  error,
  onBlur,
  onChange
}: {
  value: Sex | null;
  error?: string;
  onBlur: () => void;
  onChange: (value: Sex) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Sexe</Text>
      <View accessibilityRole="radiogroup" style={StyleSheet.flatten([styles.segmented, focused && styles.controlFocused, error && styles.controlInvalid])}>
        {SEX_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onPress={() => onChange(option.value)}
              style={StyleSheet.flatten([styles.segment, active && styles.segmentActive])}
            >
              <Text style={StyleSheet.flatten([styles.segmentText, active && styles.segmentTextActive])}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <AuthErrorSlot message={error} /> : null}
    </View>
  );
}

export function AuthErrorSlot({ message, nativeID }: { message?: string; nativeID?: string }) {
  return <View style={styles.errorSlot}>{message ? <Text nativeID={nativeID} accessibilityLiveRegion="polite" style={styles.fieldError}>{message}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1, minWidth: 0 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 48,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 15,
    fontFamily: fontFamilyMedium
  },
  controlFocused: { borderColor: authField.focusBorderColor, backgroundColor: authField.backgroundFocused },
  controlInvalid: { borderColor: authField.invalidBorderColor, backgroundColor: authField.backgroundInvalid },
  errorSlot: { justifyContent: "center" },
  fieldError: { color: palette.fieldError, fontSize: 11, lineHeight: 15 },
  segmented: {
    minHeight: 48,
    borderRadius: authField.borderRadius,
    backgroundColor: authField.background,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    padding: 4,
    flexDirection: "row",
    gap: 4
  },
  segment: {
    flex: 1,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  segmentActive: { backgroundColor: palette.primary },
  segmentText: { color: palette.muted, fontFamily: fontFamilyMedium },
  segmentTextActive: { color: palette.onPrimary }
});

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;
