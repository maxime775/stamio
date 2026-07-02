import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { configureGlobalTypography, palette } from "@/lib/design";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded && !fontError) return null;
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
