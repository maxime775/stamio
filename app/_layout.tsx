import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { configureGlobalTypography, palette } from "@/lib/design";
import { useStamioFonts } from "@/lib/useStamioFonts";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useStamioFonts();
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: palette.canvas }} />;
  configureGlobalTypography();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: palette.canvas }}>
          <AppHeader />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.canvas }
            }}
          />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
