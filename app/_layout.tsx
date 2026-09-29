import "react-native-gesture-handler";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";
import { configureGlobalTypography, palette } from "@/lib/design";
import { useStamioFonts } from "@/lib/useStamioFonts";

const DEFAULT_META_DESCRIPTION = "Exprimez votre position sur les sujets qui vous animent, échangez et découvrez les résultats agrégés des sondages Stamio.";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useStamioFonts();
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: palette.canvas }} />;
  configureGlobalTypography();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Head>
          <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        </Head>
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
