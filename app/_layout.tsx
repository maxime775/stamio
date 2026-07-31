import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { configureGlobalTypography, palette } from "@/lib/design";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
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
