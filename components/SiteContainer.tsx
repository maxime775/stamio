import type { ViewProps, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

export const SITE_CONTAINER_MAX_WIDTH = 1160;
export const SITE_CONTAINER_HORIZONTAL_PADDING = 20;

export const siteContainerStyle: ViewStyle = {
  width: "100%",
  maxWidth: SITE_CONTAINER_MAX_WIDTH,
  paddingHorizontal: SITE_CONTAINER_HORIZONTAL_PADDING,
  alignSelf: "center",
  boxSizing: "border-box"
};

export function SiteContainer({ style, ...props }: ViewProps) {
  return <View {...props} style={StyleSheet.flatten([siteContainerStyle, style])} />;
}
