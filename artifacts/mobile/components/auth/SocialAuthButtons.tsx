import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";

function GoogleIcon() {
  return (
    <View style={icon.wrap}>
      <Text style={icon.g}>G</Text>
    </View>
  );
}

function FacebookIcon() {
  return (
    <View style={[icon.wrap, icon.fbWrap]}>
      <Text style={icon.fb}>f</Text>
    </View>
  );
}

function AppleIcon() {
  return (
    <View style={[icon.wrap, icon.appleWrap]}>
      <Text style={icon.apple}></Text>
    </View>
  );
}

const icon = StyleSheet.create({
  wrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E0D4C8",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  g: { fontSize: 14, fontWeight: "700", color: "#4285F4", lineHeight: 17 },
  fbWrap: { backgroundColor: "#1877F2", borderColor: "#1877F2" },
  fb: { fontSize: 15, fontWeight: "900", color: "#fff", lineHeight: 17 },
  appleWrap: { backgroundColor: "#000", borderColor: "#000" },
  apple: { fontSize: 13, color: "#fff", lineHeight: 17 },
});

interface Props {
  showApple?: boolean;
}

export default function SocialAuthButtons({ showApple = true }: Props) {
  const { signInWithProvider, signInWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleProvider = async (provider: "google" | "facebook") => {
    setLoadingProvider(provider);
    const { error } = await signInWithProvider(provider);
    setLoadingProvider(null);
    if (error && error !== "cancelled") {
      Alert.alert(
        "Помилка входу",
        translateProviderError(error, provider),
      );
    }
  };

  const handleApple = async () => {
    setLoadingProvider("apple");
    const { error } = await signInWithApple();
    setLoadingProvider(null);
    if (error && error !== "cancelled") {
      Alert.alert("Помилка входу", error);
    }
  };

  const isIOS = Platform.OS === "ios";

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>або</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => handleProvider("google")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "google" ? (
          <ActivityIndicator size="small" color="#4285F4" style={{ marginRight: 10 }} />
        ) : (
          <GoogleIcon />
        )}
        <Text style={styles.btnText}>Увійти через Google</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, styles.facebookBtn, pressed && styles.btnPressed]}
        onPress={() => handleProvider("facebook")}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "facebook" ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
        ) : (
          <FacebookIcon />
        )}
        <Text style={[styles.btnText, styles.facebookText]}>Увійти через Facebook</Text>
      </Pressable>

      {showApple && isIOS && (
        <Pressable
          style={({ pressed }) => [styles.btn, styles.appleBtn, pressed && styles.btnPressed]}
          onPress={handleApple}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === "apple" ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
          ) : (
            <AppleIcon />
          )}
          <Text style={[styles.btnText, styles.appleText]}>Sign in with Apple</Text>
        </Pressable>
      )}
    </View>
  );
}

function translateProviderError(error: string, provider: string): string {
  if (error.includes("provider is not enabled")) {
    const name = provider === "google" ? "Google" : "Facebook";
    return `${name} вхід ще не налаштовано. Зверніться до адміністратора.`;
  }
  if (error.includes("network")) return "Помилка мережі. Перевірте підключення.";
  return error;
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 4 },
  dividerRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8D8C8" },
  dividerText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: "#A07850", paddingHorizontal: 4,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 18, borderWidth: 1.5, borderColor: "#E0D4C8",
    backgroundColor: "#FFFFFF",
  },
  btnPressed: { opacity: 0.75 },
  btnText: {
    fontSize: 15, fontFamily: "Inter_500Medium", color: "#3D1C02",
  },
  facebookBtn: { backgroundColor: "#1877F2", borderColor: "#1877F2" },
  facebookText: { color: "#FFFFFF" },
  appleBtn: { backgroundColor: "#000000", borderColor: "#000000" },
  appleText: { color: "#FFFFFF" },
});
