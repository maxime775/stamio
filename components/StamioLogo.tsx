import { useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle, View } from "react-native";
import { Asset } from "expo-asset";
import { SvgUri } from "react-native-svg";

const stamioLogoAsset = require("../assets/branding/stamio-logo-horizontal-ambre-transparent.svg");
const LOGO_ASPECT_RATIO = 1000 / 360;

type Props = {
  height?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function StamioLogo({ height, width, style, accessibilityLabel = "Stamio" }: Props) {
  const boxHeight = height ?? (width ? width / LOGO_ASPECT_RATIO : 32);
  const boxWidth = width ?? boxHeight * LOGO_ASPECT_RATIO;
  const logoWidth = Math.min(boxWidth, boxHeight * LOGO_ASPECT_RATIO);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const uri = useMemo(() => Asset.fromModule(stamioLogoAsset).uri, []);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={StyleSheet.flatten([styles.logo, { width: boxWidth, height: boxHeight }, style])}
    >
      <SvgUri uri={uri} width={logoWidth} height={logoHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  }
});
