import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: "#07111F" }}>
          <AppHeader />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#07111F" }
            }}
          />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
