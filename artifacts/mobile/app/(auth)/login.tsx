import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("", "Будь ласка, заповніть всі поля");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      Alert.alert("Помилка входу", translateError(error));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFAF6" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <LinearGradient
        colors={["#52280D", "#3D1C02"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFAF6" />
        </Pressable>
        <Text style={styles.headerTitle}>Вхід</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.content}>
          <Text style={styles.greeting}>З поверненням! 👋</Text>
          <Text style={styles.subGreeting}>Увійдіть, щоб продовжити піклуватися про своїх улюбленців</Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#C4956A" style={styles.inputIcon} />
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
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Пароль</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#C4956A" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ваш пароль"
                  placeholderTextColor="#C4A882"
                  keyboardType="ascii-capable"
                  textContentType="password"
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#C4956A" />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Забули пароль?</Text>
          </Pressable>

          <Pressable onPress={handleLogin} disabled={loading} style={styles.ctaWrap}>
            <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.cta}>
              <Text style={styles.ctaText}>{loading ? "Входимо..." : "Увійти"}</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Немає акаунту? </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.switchLink}>Зареєструватися</Text>
            </Pressable>
          </View>

          <SocialAuthButtons />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login")) return "Невірний email або пароль";
  if (msg.includes("Email not confirmed")) return "Підтвердіть email перед входом";
  if (msg.includes("too many requests")) return "Забагато спроб. Спробуйте пізніше";
  return msg;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 20,
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  scroll: { padding: 24 },
  content: { gap: 16 },
  greeting: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#3D1C02", marginTop: 8 },
  subGreeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A5C40", lineHeight: 21 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#F0E4D6",
    shadowColor: "#3D1C02", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  inputGroup: { paddingHorizontal: 18, paddingVertical: 16 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#A07850", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputIcon: {},
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#3D1C02", padding: 0, flex: 1 },
  divider: { height: 1, backgroundColor: "#F0E4D6" },
  forgotBtn: { alignSelf: "flex-end", paddingVertical: 4 },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#E8651A" },
  ctaWrap: {
    borderRadius: 18, overflow: "hidden", marginTop: 4,
    shadowColor: "#E8651A", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  cta: { paddingVertical: 17, alignItems: "center" },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  switchRow: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A5C40" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E8651A" },
});
