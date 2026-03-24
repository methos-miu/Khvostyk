import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert("", "Введіть ваш email");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await forgotPassword(email);
    setLoading(false);
    if (error) {
      Alert.alert("Помилка", error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFAF6" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#52280D", "#3D1C02"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFAF6" />
        </Pressable>
        <Text style={styles.headerTitle}>Відновлення паролю</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <Animated.View
        entering={FadeInDown.delay(80).springify()}
        style={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>📧</Text>
            <Text style={styles.successTitle}>Лист надіслано!</Text>
            <Text style={styles.successText}>
              Перевірте вашу пошту {email} і перейдіть за посиланням для відновлення паролю.
            </Text>
            <Pressable onPress={() => router.back()} style={styles.backToLoginBtn}>
              <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.backToLoginGrad}>
                <Text style={styles.backToLoginText}>Повернутись до входу</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Забули пароль?</Text>
            <Text style={styles.subtitle}>
              Введіть email пов'язаний з вашим акаунтом — ми надішлемо посилання для відновлення.
            </Text>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#C4956A" />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#C4A882"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleSend}
                  />
                </View>
              </View>
            </View>

            <Pressable onPress={handleSend} disabled={loading} style={styles.ctaWrap}>
              <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.cta}>
                <Text style={styles.ctaText}>{loading ? "Надсилаємо..." : "Надіслати посилання"}</Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 20,
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  content: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#3D1C02", marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A5C40", lineHeight: 21 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#F0E4D6",
    shadowColor: "#3D1C02", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  inputGroup: { paddingHorizontal: 18, paddingVertical: 16 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#A07850", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#3D1C02", padding: 0, flex: 1 },
  ctaWrap: {
    borderRadius: 18, overflow: "hidden",
    shadowColor: "#E8651A", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  cta: { paddingVertical: 17, alignItems: "center" },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  successCard: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 8,
  },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#3D1C02" },
  successText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#7A5C40", textAlign: "center", lineHeight: 23 },
  backToLoginBtn: {
    borderRadius: 18, overflow: "hidden", marginTop: 12, alignSelf: "stretch",
    shadowColor: "#E8651A", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  backToLoginGrad: { paddingVertical: 17, alignItems: "center" },
  backToLoginText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
});
