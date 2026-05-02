import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { usePets } from "@/context/PetsContext";
import { supabase } from "@/lib/supabase";

type ShareRole = "editor" | "viewer";

export default function PetShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { getPet } = usePets();
  const pet = id ? getPet(id) : undefined;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");

  const title = useMemo(
    () => (language === "uk" ? "Спільний доступ" : "Shared Access"),
    [language]
  );

  const sendInvite = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      Alert.alert(language === "uk" ? "Вкажіть email" : "Enter email");
      return;
    }
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();

    if (existingUser?.id) {
      Alert.alert(
        language === "uk" ? "Наступний етап" : "Next stage",
        language === "uk"
          ? "Інвайт для існуючого користувача буде підключено в наступному етапі."
          : "Existing-user invite flow will be connected in the next stage."
      );
      return;
    }

    Alert.alert(language === "uk" ? "Користувача не знайдено" : "User not found");
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          <Text style={styles.petName}>
            {pet?.name ?? (language === "uk" ? "Тварина" : "Pet")}
          </Text>
          <Text style={styles.subtitle}>
            {language === "uk"
              ? "Введіть email та оберіть роль доступу"
              : "Enter email and choose access role"}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={language === "uk" ? "Email користувача" : "User email"}
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
          />

          <Text style={styles.roleLabel}>
            {language === "uk" ? "Роль доступу" : "Access role"}
          </Text>
          <View style={styles.roleRow}>
            <Pressable
              onPress={() => setRole("editor")}
              style={[styles.roleBtn, role === "editor" && styles.roleBtnActive]}
            >
              <View style={styles.roleContent}>
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={18}
                  color={role === "editor" ? Colors.primary : Colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleText, role === "editor" && styles.roleTextActive]}>
                    {language === "uk" ? "Співвласник (editor)" : "Co-owner (editor)"}
                  </Text>
                  <Text style={[styles.roleHint, role === "editor" && styles.roleHintActive]}>
                    {language === "uk" ? "Може редагувати дані тварини" : "Can edit pet data"}
                  </Text>
                </View>
                {role === "editor" ? <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} /> : null}
              </View>
            </Pressable>
            <Pressable
              onPress={() => setRole("viewer")}
              style={[styles.roleBtn, role === "viewer" && styles.roleBtnActive]}
            >
              <View style={styles.roleContent}>
                <MaterialCommunityIcons
                  name="eye-outline"
                  size={18}
                  color={role === "viewer" ? Colors.primary : Colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleText, role === "viewer" && styles.roleTextActive]}>
                    {language === "uk" ? "Читач (viewer)" : "Reader (viewer)"}
                  </Text>
                  <Text style={[styles.roleHint, role === "viewer" && styles.roleHintActive]}>
                    {language === "uk" ? "Тільки перегляд без редагування" : "View-only access"}
                  </Text>
                </View>
                {role === "viewer" ? <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} /> : null}
              </View>
            </Pressable>
          </View>

          <Pressable onPress={sendInvite} style={styles.submitBtn}>
            <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
            <Text style={styles.submitText}>
              {language === "uk" ? "Надіслати запрошення" : "Send invitation"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  headerSpacer: { width: 36 },
  content: { padding: 16 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  petName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  roleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 2 },
  roleRow: { gap: 10 },
  roleBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#F2F7FF",
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  roleContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  roleTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  roleHint: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  roleHintActive: { color: Colors.primary },
  submitBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
