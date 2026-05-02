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
  Modal,
  Platform,
  Pressable,
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
import { supabase } from "@/lib/supabase";

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
  const { user } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const loadPendingInvites = React.useCallback(async () => {
    if (!user?.id) {
      setPendingInvites([]);
      return;
    }
    const email = (user.email ?? "").toLowerCase();
    const { data, error } = await supabase
      .from("pet_invitations")
      .select("id,pet_id,role,status,invitee_email,pets(name)")
      .eq("status", "pending")
      .or(`invitee_user_id.eq.${user.id},invitee_email.eq.${email}`)
      .order("created_at", { ascending: true })
      .limit(5);
    if (!error) {
      setPendingInvites((data as any[]) ?? []);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  const activeInvite = pendingInvites[0];

  const handleRespondInvitation = async (decision: "accept" | "decline") => {
    if (!activeInvite?.id || loadingInvites) return;
    setLoadingInvites(true);
    try {
      const rpcName = decision === "accept" ? "accept_pet_invitation" : "decline_pet_invitation";
      const { error } = await supabase.rpc(rpcName, { p_invitation_id: activeInvite.id });
      if (!error) {
        setPendingInvites(prev => prev.filter(i => i.id !== activeInvite.id));
      }
    } finally {
      setLoadingInvites(false);
    }
  };

  return (
    <AuthGuard>
      <>
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
          headerRightContainerStyle: { minWidth: 44, alignItems: "center", justifyContent: "center", paddingRight: 8 },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="pet/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="pet/add"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="pet/documents/[id]"
          options={{ title: t.documents, headerBackTitle: t.back }}
        />
        <Stack.Screen
          name="pet/edit/[id]"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="pet/weight/[id]"
          options={{
            title: t.weightLog,
            headerBackTitle: t.back,
          }}
        />
        <Stack.Screen
          name="pet/health-events/index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="pet/select-event-template/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="pet/create-custom-template/[id]"
          options={{
            title: language === "uk" ? "Новий шаблон" : "New Template",
            presentation: "modal",
            headerBackTitle: t.cancel,
          }}
        />
        <Stack.Screen
          name="pet/add-health-event/[id]"
          options={{
            title: t.addHealthEvent,
            presentation: "modal",
            headerBackTitle: t.cancel,
          }}
        />
      </Stack>
      <Modal transparent visible={!!activeInvite} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.inviteOverlay}>
          <View style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>
              {language === "uk" ? "Запрошення до спільного доступу" : "Shared access invitation"}
            </Text>
            <Text style={styles.inviteText}>
              {language === "uk"
                ? `Вас запросили стати ${activeInvite?.role === "editor" ? "співвласником" : "читачем"} тварини «${activeInvite?.pets?.name ?? ""}». Ви згодні?`
                : `You were invited to be a ${activeInvite?.role === "editor" ? "co-owner" : "viewer"} of “${activeInvite?.pets?.name ?? ""}”. Do you agree?`}
            </Text>
            <View style={styles.inviteActions}>
              <Pressable style={[styles.inviteBtn, styles.inviteDecline]} onPress={() => handleRespondInvitation("decline")} disabled={loadingInvites}>
                <Text style={styles.inviteDeclineText}>{language === "uk" ? "Ні" : "No"}</Text>
              </Pressable>
              <Pressable style={[styles.inviteBtn, styles.inviteAccept]} onPress={() => handleRespondInvitation("accept")} disabled={loadingInvites}>
                <Text style={styles.inviteAcceptText}>{language === "uk" ? "Так" : "Yes"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </>
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
  inviteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  inviteCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  inviteTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  inviteText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 22 },
  inviteActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  inviteBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  inviteDecline: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: Colors.border },
  inviteAccept: { backgroundColor: Colors.primary },
  inviteDeclineText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  inviteAcceptText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
