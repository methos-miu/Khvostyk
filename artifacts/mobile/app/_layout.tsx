import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Slot, Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PetsProvider } from "@/context/PetsContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SimpleSplash({ onDone }: { onDone: () => void }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(400)}
      style={styles.splashRoot}
    >
      <Animated.View style={[styles.splashContent, containerStyle]}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>Хвостик</Text>
        <Text style={styles.splashSubtitle}>
          Додаток здоров'я домашніх улюбленців
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator color="#E8651A" size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { t, language } = useLanguage();

  return (
    <AuthGuard>
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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="pet/[id]"
          options={{ title: t.profile, headerBackTitle: t.back }}
        />
        <Stack.Screen
          name="pet/add"
          options={{ headerShown: false, presentation: "modal" }}
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
            title: language === "uk" ? "Редагувати" : "Edit Pet",
            headerBackTitle: t.cancel,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="pet/weight/[id]"
          options={{
            title: language === "uk" ? "Журнал ваги" : "Weight Log",
            headerBackTitle: t.back,
          }}
        />
      </Stack>
    </AuthGuard>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      {children}
      {showSplash && Platform.OS !== "web" && (
        <SimpleSplash onDone={() => setShowSplash(false)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <LanguageProvider>
                <PetsProvider>
                  <AppProviders>
                    <RootLayoutNav />
                  </AppProviders>
                </PetsProvider>
              </LanguageProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFAF6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  splashContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: "#FFFAF6",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#3D1C02",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#7A5C40",
    textAlign: "center",
    lineHeight: 20,
  },
});
