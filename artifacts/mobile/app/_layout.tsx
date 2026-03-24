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
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PetsProvider } from "@/context/PetsContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    const timer = setTimeout(onDone, 1600);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(350)}
      style={styles.splashContainer}
    >
      <Animated.View style={logoStyle}>
        <View style={styles.splashLogoCircle}>
          <Text style={styles.splashEmoji}>🐾</Text>
        </View>
        <Text style={styles.splashTitle}>Хвостик</Text>
        <Text style={styles.splashSubtitle}>Tailsy</Text>
      </Animated.View>
      <View style={styles.splashDots}>
        {[0, 1, 2].map(i => (
          <Animated.View
            key={i}
            entering={FadeIn.delay(600 + i * 120)}
            style={styles.splashDot}
          />
        ))}
      </View>
    </Animated.View>
  );
}

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
        <AnimatedSplash onDone={() => setShowSplash(false)} />
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

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.gradientStart,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  splashLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  splashEmoji: { fontSize: 56 },
  splashTitle: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 4,
  },
  splashDots: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    bottom: 80,
  },
  splashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
});
