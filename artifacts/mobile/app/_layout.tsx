import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PetsProvider } from "@/context/PetsContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { t, language } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: t.back,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: Colors.text,
        },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="pet/[id]"
        options={{ title: t.profile, headerBackTitle: t.back }}
      />
      <Stack.Screen
        name="pet/add"
        options={{ title: t.addPetTitle, headerBackTitle: t.cancel, presentation: "modal" }}
      />
      <Stack.Screen
        name="pet/vaccinations/[id]"
        options={{ title: t.vaccinations, headerBackTitle: t.back }}
      />
      <Stack.Screen
        name="pet/documents/[id]"
        options={{ title: t.documents, headerBackTitle: t.back }}
      />
      <Stack.Screen
        name="pet/add-vaccination/[id]"
        options={{ title: t.addVaccination, presentation: "modal", headerBackTitle: t.cancel }}
      />
      <Stack.Screen
        name="pet/edit/[id]"
        options={{
          title: language === "uk" ? "Редагувати" : "Edit pet",
          headerBackTitle: t.cancel,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <LanguageProvider>
              <PetsProvider>
                <AppProviders>
                  <RootLayoutNav />
                </AppProviders>
              </PetsProvider>
            </LanguageProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
