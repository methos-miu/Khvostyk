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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("", "Будь ласка, заповніть всі поля");
      return;
    }
    if (password.length < 6) {
      Alert.alert("", "Пароль має містити мінімум 6 символів");
      return;
    }
    if (password !== confirm) {
      Alert.alert("", "Паролі не збігаються");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error, needsConfirmation } = await register(email, password, name);
    setLoading(false);
    if (error) {
      Alert.alert("Помилка реєстрації", translateError(error));
    } else if (needsConfirmation) {
      // Email confirmation required — tell the user to check their inbox
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Перевірте пошту 📧",
        `Ми надіслали листа на ${email}.\n\nПідтвердіть реєстрацію, перейшовши за посиланням у листі, а потім увійдіть.`,
        [{ text: "Увійти", onPress: () => router.replace("/(auth)/login") }]
      );
    } else {
      // Auto-logged in — keep loading=true so screen doesn't flicker before AuthGuard redirects
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(true); // will unmount when redirected
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
          <Ionicons name="arrow-back" size={22} color="#FFFAF6" />
        </Pressable>
        <Text style={styles.headerTitle}>Реєстрація</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.content}>
          <Text style={styles.greeting}>Приєднуйтесь до Хвостика 🐾</Text>
          <Text style={styles.subGreeting}>Створіть акаунт і почніть дбати про своїх улюбленців</Text>

          <View style={styles.card}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ваше ім'я</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#C4956A" />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Як вас звати?"
                  placeholderTextColor="#C4A882"
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.divider} />

            {/* Email */}
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
                />
              </View>
            </View>
            <View style={styles.divider} />

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Пароль</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#C4956A" />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Мінімум 6 символів"
                  placeholderTextColor="#C4A882"
                  secureTextEntry={!showPw}
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#C4956A" />
                </Pressable>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Confirm password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Підтвердіть пароль</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#C4956A" />
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Повторіть пароль"
                  placeholderTextColor="#C4A882"
                  secureTextEntry={!showPw}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </View>
          </View>

          <Pressable onPress={handleRegister} disabled={loading} style={styles.ctaWrap}>
            <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.cta}>
              <Text style={styles.ctaText}>{loading ? "Реєструємо..." : "Створити акаунт"}</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Вже є акаунт? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.switchLink}>Увійти</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function translateError(msg: string): string {
  if (msg.includes("already registered")) return "Цей email вже зареєстровано";
  if (msg.includes("Password should be")) return "Пароль має містити мінімум 6 символів";
  if (msg.includes("invalid email")) return "Невірний формат email";
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
  greeting: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#3D1C02", marginTop: 8 },
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
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#3D1C02", padding: 0, flex: 1 },
  divider: { height: 1, backgroundColor: "#F0E4D6" },
  ctaWrap: {
    borderRadius: 18, overflow: "hidden", marginTop: 4,
    shadowColor: "#E8651A", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  cta: { paddingVertical: 17, alignItems: "center" },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#7A5C40" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E8651A" },
});
