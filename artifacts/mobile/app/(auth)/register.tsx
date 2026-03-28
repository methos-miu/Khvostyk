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
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("", language === "uk" ? "Будь ласка, заповніть всі поля" : "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("", language === "uk" ? "Пароль має містити мінімум 6 символів" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      Alert.alert("", language === "uk" ? "Паролі не збігаються" : "Passwords do not match");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error, needsConfirmation } = await register(email, password, name);
    setLoading(false);
    if (error) {
      Alert.alert(
        language === "uk" ? "Помилка реєстрації" : "Registration Error",
        translateError(error, language)
      );
    } else if (needsConfirmation) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        language === "uk" ? "Перевірте пошту 📧" : "Check your inbox 📧",
        language === "uk"
          ? `Ми надіслали листа на ${email}.\n\nПідтвердіть реєстрацію, перейшовши за посиланням у листі, а потім увійдіть.`
          : `We sent a confirmation link to ${email}.\n\nClick the link in the email, then sign in.`,
        [{ text: language === "uk" ? "Увійти" : "Sign In", onPress: () => router.replace("/(auth)/login") }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(true);
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
        <Text style={styles.headerTitle}>{language === "uk" ? "Реєстрація" : "Sign Up"}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.content}>
          <Text style={styles.greeting}>
            {language === "uk" ? "Приєднуйтесь до Хвостика 🐾" : "Join Tailsy 🐾"}
          </Text>
          <Text style={styles.subGreeting}>
            {language === "uk"
              ? "Створіть акаунт і почніть дбати про своїх улюбленців"
              : "Create an account and start caring for your pets"}
          </Text>

          <View style={styles.card}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === "uk" ? "Ваше ім'я" : "Your name"}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="account-outline" size={18} color="#C4956A" />
                <TextInput
                  style={styles.input}
                  ref={nameRef}
                  value={name}
                  onChangeText={setName}
                  placeholder={language === "uk" ? "Як вас звати?" : "What's your name?"}
                  placeholderTextColor="#C4A882"
                  autoComplete="name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="email-outline" size={18} color="#C4956A" />
                <TextInput
                  style={styles.input}
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#C4A882"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  spellCheck={false}
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  textContentType="emailAddress"
                />
              </View>
            </View>
            <View style={styles.divider} />

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === "uk" ? "Пароль" : "Password"}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#C4956A" />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={language === "uk" ? "Мінімум 6 символів" : "At least 6 characters"}
                  placeholderTextColor="#C4A882"
                  keyboardType="ascii-capable"
                  textContentType="password"
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#C4956A" />
                </Pressable>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Confirm password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === "uk" ? "Підтвердіть пароль" : "Confirm password"}</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#C4956A" />
                <TextInput
                  style={styles.input}
                  ref={confirmRef}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={language === "uk" ? "Повторіть пароль" : "Repeat password"}
                  placeholderTextColor="#C4A882"
                  keyboardType="ascii-capable"
                  textContentType="password"
                  secureTextEntry={!showPw}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </View>
          </View>

          <Pressable onPress={handleRegister} disabled={loading} style={styles.ctaWrap}>
            <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.cta}>
              <Text style={styles.ctaText}>
                {loading
                  ? (language === "uk" ? "Реєструємо..." : "Creating account...")
                  : (language === "uk" ? "Створити акаунт" : "Create Account")}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{language === "uk" ? "Вже є акаунт? " : "Already have an account? "}</Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.switchLink}>{language === "uk" ? "Увійти" : "Sign In"}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function translateError(msg: string, lang: string): string {
  if (msg.includes("already registered"))
    return lang === "uk" ? "Цей email вже зареєстровано" : "This email is already registered";
  if (msg.includes("Password should be"))
    return lang === "uk" ? "Пароль має містити мінімум 6 символів" : "Password must be at least 6 characters";
  if (msg.includes("invalid email"))
    return lang === "uk" ? "Невірний формат email" : "Invalid email format";
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
