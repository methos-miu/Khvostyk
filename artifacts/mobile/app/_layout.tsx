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
import {
  Image,
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
import { useState } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PetsProvider } from "@/context/PetsContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const LOGO_SIZE = 210;
const HALF = LOGO_SIZE / 2;

function AnimatedSplash({ onDone }: { onDone: () => void }) {
  /*
   * The logo image is split into two halves that slide in from opposite
   * sides of the screen, meet in the middle, and reveal the complete
   * tails-heart logo. Then the title and subtitle fade/slide in.
   *
   * Left half  → starts at translateX: -LOGO_SIZE  →  arrives at 0
   * Right half → starts at translateX: +LOGO_SIZE  →  arrives at 0
   *              (the right half uses marginLeft: -HALF to offset its image
   *               so only the right portion is visible through its clipping View)
   */
  const leftX = useSharedValue(-LOGO_SIZE);
  const rightX = useSharedValue(LOGO_SIZE);
  const logoScale = useSharedValue(0.85);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    const spring = { damping: 15, stiffness: 125 };

    // Phase 1 (0–700ms): Tails slide in from sides with a natural spring bounce
    leftX.value = withSpring(0, spring);
    rightX.value = withSpring(0, spring);
    // Slight overshoot on the overall logo gives it a "snap together" feel
    logoScale.value = withSpring(1, { damping: 11, stiffness: 100 });

    // Phase 2 (900ms): Subtitle fades in
    subtitleOpacity.value = withDelay(880, withTiming(1, { duration: 500 }));

    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, []);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }],
  }));
  const logoContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(500)}
      style={styles.splashRoot}
    >
      {/* Decorative paw watermarks */}
      <Text style={styles.pawTL}>🐾</Text>
      <Text style={styles.pawBR}>🐾</Text>

      {/* Two-halves logo animation */}
      <Animated.View style={[styles.logoOuter, logoContainerStyle]}>
        {/* Left half — clipped to HALF width, shows left side of logo */}
        <View style={styles.logoHalfLeft}>
          <Animated.View style={leftStyle}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* Right half — clipped to HALF width, shows right side of logo.
            marginLeft: -HALF shifts the image left so only the right
            portion falls inside the clipping container. */}
        <View style={styles.logoHalfRight}>
          <Animated.View style={[{ marginLeft: -HALF }, rightStyle]}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Subtitle — the logo image already contains "ХВОСТИК" text with paw */}
      <Animated.Text style={[styles.splashSubtitle, subtitleStyle]}>
        Додаток здоров'я домашніх улюбленців
      </Animated.Text>
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
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFAF6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  pawTL: {
    position: "absolute",
    top: 60,
    left: 28,
    fontSize: 36,
    opacity: 0.12,
    transform: [{ rotate: "-30deg" }],
  },
  pawBR: {
    position: "absolute",
    bottom: 100,
    right: 28,
    fontSize: 36,
    opacity: 0.12,
    transform: [{ rotate: "20deg" }],
  },
  logoOuter: {
    flexDirection: "row",
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 28,
  },
  logoHalfLeft: {
    width: HALF,
    height: LOGO_SIZE,
    overflow: "hidden",
  },
  logoHalfRight: {
    width: HALF,
    height: LOGO_SIZE,
    overflow: "hidden",
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  splashSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#7A5C40",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 50,
    lineHeight: 20,
  },
});
