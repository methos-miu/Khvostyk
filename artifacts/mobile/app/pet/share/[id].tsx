import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { usePets } from "@/context/PetsContext";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";

type ShareRole = "editor" | "viewer";
type MemberRow = { user_id: string; role: "owner" | "editor" | "viewer"; status: string; email?: string };

export default function PetShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { getPet } = usePets();
  const pet = id ? getPet(id) : undefined;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [myRole, setMyRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const title = useMemo(
    () => (language === "uk" ? "Спільний доступ" : "Shared Access"),
    [language]
  );

  const loadMembers = async () => {
    if (!id) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { data: me } = await supabase.from("pet_memberships").select("role").eq("pet_id", id).eq("user_id", uid).eq("status", "active").maybeSingle();
    setMyRole((me?.role as any) ?? null);
    const { data: rows } = await supabase.from("pet_memberships").select("user_id,role,status").eq("pet_id", id).eq("status", "active");
    const userIds = (rows ?? []).map((r: any) => r.user_id);
    const { data: users } = userIds.length ? await supabase.from("users").select("id,email").in("id", userIds) : { data: [] as any[] };
    const emails = new Map((users ?? []).map((u: any) => [u.id, u.email]));
    setMembers((rows ?? []).map((r: any) => ({ ...r, email: emails.get(r.user_id) })));
  };
  useEffect(() => { loadMembers(); }, [id]);

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
      const { error } = await supabase.rpc("create_pet_user_invitation", {
        p_pet_id: id,
        p_invitee_email: normalized,
        p_role: role,
      });
      Alert.alert(
        error
          ? (language === "uk" ? "Не вдалося створити запрошення" : "Failed to create invitation")
          : (language === "uk" ? "Запрошення створено" : "Invitation created")
      );
      await loadMembers();
      return;
    }

    Alert.alert(language === "uk" ? "Користувача не знайдено" : "User not found");
  };

  const generateQrInvite = async () => {
    if (!id) return;
    const { data, error } = await supabase.rpc("create_pet_qr_invitation", {
      p_pet_id: id,
      p_role: role,
      p_expires_in_hours: 72,
    });
    if (error || !data?.[0]?.raw_token) {
      Alert.alert(language === "uk" ? "Не вдалося згенерувати QR" : "Failed to generate QR");
      return;
    }

    const deepLink = `mobile://invite?token=${encodeURIComponent(data[0].raw_token)}`;
    const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(deepLink)}`;
    setQrUrl(generatedQrUrl);
    setShowQr(true);
  };
  const canManage = myRole === "owner";
  const updateMemberRole = async (userId: string, nextRole: ShareRole) => {
    if (!id || !canManage) return;
    await supabase.from("pet_memberships").update({ role: nextRole }).eq("pet_id", id).eq("user_id", userId);
    await loadMembers();
  };
  const removeMember = async (userId: string) => {
    if (!id || !canManage) return;
    await supabase.from("pet_memberships").delete().eq("pet_id", id).eq("user_id", userId);
    await loadMembers();
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

          <Pressable onPress={generateQrInvite} style={styles.qrBtn}>
            <MaterialCommunityIcons name="qrcode" size={18} color={Colors.primary} />
            <Text style={styles.qrBtnText}>
              {language === "uk" ? "Згенерувати QR" : "Generate QR"}
            </Text>
          </Pressable>
          <Text style={styles.roleLabel}>{language === "uk" ? "Користувачі з доступом" : "Users with access"}</Text>
          {members.map((m) => (
            <View key={m.user_id} style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberEmail}>{m.email ?? m.user_id}</Text>
                <Text style={styles.memberRole}>{m.role}</Text>
              </View>
              {canManage && m.role !== "owner" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={styles.smallBtn} onPress={() => updateMemberRole(m.user_id, "editor")}><Text>editor</Text></Pressable>
                  <Pressable style={styles.smallBtn} onPress={() => updateMemberRole(m.user_id, "viewer")}><Text>viewer</Text></Pressable>
                  <Pressable style={[styles.smallBtn, { borderColor: Colors.danger }]} onPress={() => removeMember(m.user_id)}><Text style={{ color: Colors.danger }}>✕</Text></Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>{language === "uk" ? "QR-запрошення" : "QR invitation"}</Text>
            {qrUrl ? <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="contain" /> : null}
            <Pressable style={styles.submitBtn} onPress={() => setShowQr(false)}>
              <Text style={styles.submitText}>{language === "uk" ? "Закрити" : "Close"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  qrBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EEF4FF",
  },
  qrBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10, backgroundColor: Colors.background },
  memberEmail: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  memberRole: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  smallBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: Colors.card },
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  qrCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  qrTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  qrImage: { width: 260, height: 260 },
});
