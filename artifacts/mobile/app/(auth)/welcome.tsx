import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useLanguage } from "@/context/LanguageContext";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.root}>
      {/* Hero image */}
      <View style={styles.heroWrap}>
        <Image
          source={language === "uk" ? require("../../assets/logo-uk.png") : require("../../assets/logo-en.png")}
          style={styles.heroImage}
          contentFit="cover"
        />
        <Pressable
          onPress={() => setLanguage(language === "uk" ? "en" : "uk")}
          style={[styles.langToggle, { top: insets.top + 16, right: 16, zIndex: 10 }]}
        >
          <Text style={styles.langToggleText}>{language === "uk" ? "EN" : "УКР"}</Text>
        </Pressable>
      </View>

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

          <SocialAuthButtons />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFAF6" },
  heroWrap: { position: "relative", width: "100%" },
  heroImage: { width: "100%", aspectRatio: 1, margin: 0, padding: 0 },
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
