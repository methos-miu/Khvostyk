import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useLanguage } from "@/context/LanguageContext";

const { height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.root}>
      {/* Top hero with gradient */}
      <LinearGradient
        colors={["#52280D", "#3D1C02"]}
        style={styles.hero}
      >
        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ width: "100%", height: "100%" }}>
          <Image
            source={language === "uk" ? require("../../assets/logo-uk.png") : require("../../assets/logo-en.png")}
            style={styles.logoBig}
            contentFit="contain"
          />
        </Animated.View>

        <Text style={[styles.paw, { bottom: 40, right: 30, opacity: 0.15, fontSize: 64 }]}>🐾</Text>
        <Text style={[styles.paw, { bottom: 80, left: 20, opacity: 0.1, fontSize: 44 }]}>🐾</Text>
        <Pressable onPress={() => setLanguage(language === "uk" ? "en" : "uk")} style={[styles.langToggle, { top: insets.top + 16, right: 16 }]}>
          <Text style={styles.langToggleText}>{language === "uk" ? "EN" : "УКР"}</Text>
        </Pressable>
      </LinearGradient>

      {/* Bottom panel — scrollable so social buttons are reachable on small screens */}
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFAF6" }}
        contentContainerStyle={[styles.panel, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.featureRow}>
            {(language === "uk"
              ? ["💉 Вакцини", "📄 Документи", "⏰ Нагадування"]
              : ["💉 Vaccines", "📄 Documents", "⏰ Reminders"]
            ).map(f => (
              <View key={f} style={styles.featureChip}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.subtitle}>
            {language === "uk"
              ? "Зберігайте медичну карту, нагадування про щеплення та документи ваших улюбленців — все в одному місці."
              : "Store medical records, vaccination reminders and documents for your pets — all in one place."}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.buttons}>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={styles.btnPrimary}
          >
            <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>{language === "uk" ? "Створити акаунт" : "Create Account"}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>{language === "uk" ? "Вже є акаунт? Увійти" : "Already have an account? Sign In"}</Text>
          </Pressable>

          <SocialAuthButtons language={language} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFAF6" },
  hero: {
    height: height * 0.42,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#3D1C02",
    padding: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  logoBig: { width: "100%", height: "100%", margin: 0, marginHorizontal: 0, padding: 0 },
  paw: { position: "absolute", fontFamily: "System" },
  panel: {
    paddingHorizontal: 24, paddingTop: 24, gap: 16,
  },
  featureRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  featureChip: {
    backgroundColor: "#FFF0E3", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#E8651A33",
  },
  featureText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#E8651A" },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A5C40", lineHeight: 22,
  },
  buttons: { gap: 10 },
  btnPrimary: {
    borderRadius: 18, overflow: "hidden",
    shadowColor: "#E8651A", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  btnGradient: { paddingVertical: 17, alignItems: "center" },
  btnPrimaryText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  btnSecondary: { paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#E8651A" },
  langToggle: {
    position: "absolute", backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  langToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
});
