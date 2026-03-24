import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VaccinationBadge } from "@/components/ui/VaccinationBadge";
import { Colors } from "@/constants/colors";
import { usePets, MedicalProfile } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { getSpeciesLabel } from "@/utils/speciesLabel";
import { calculateAge, formatDateShort, formatDate } from "@/utils/notifications";

const SPECIES_EMOJI: Record<string, string> = {
  cat: "🐈", dog: "🐕", rabbit: "🐇", hamster: "🐹",
  guinea_pig: "🐾", bird: "🐦", turtle: "🐢", reptile: "🦎",
  fish: "🐟", ferret: "🦡", hedgehog: "🦔", other: "🐾",
};

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, deletePet, updatePet } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medForm, setMedForm] = useState<MedicalProfile>({});

  const pet = getPet(id);

  const handleOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const editLabel = language === "uk" ? "Редагувати" : "Edit";
    const deleteLabel = language === "uk" ? "Видалити" : "Delete";
    const cancelLabel = language === "uk" ? "Скасувати" : "Cancel";

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [cancelLabel, editLabel, deleteLabel], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) router.push({ pathname: "/pet/edit/[id]", params: { id: pet!.id } });
          else if (index === 2) confirmDelete();
        }
      );
    } else {
      Alert.alert(pet?.name ?? "", undefined, [
        { text: editLabel, onPress: () => router.push({ pathname: "/pet/edit/[id]", params: { id: pet!.id } }) },
        { text: deleteLabel, style: "destructive", onPress: confirmDelete },
        { text: cancelLabel, style: "cancel" },
      ]);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      `${language === "uk" ? "Видалити" : "Delete"} ${pet?.name}?`,
      t.deletePetConfirm,
      [
        { text: t.cancel, style: "cancel" },
        { text: t.deletePet, style: "destructive", onPress: async () => { await deletePet(pet!.id); router.back(); } },
      ]
    );
  };

  const openMedicalModal = () => {
    setMedForm(pet?.medicalProfile ?? {});
    setShowMedicalModal(true);
  };

  const saveMedical = async () => {
    if (!pet) return;
    await updatePet(pet.id, { medicalProfile: medForm });
    setShowMedicalModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name ?? t.profile,
      headerRight: () =>
        pet ? (
          <Pressable onPress={handleOptions} style={{ marginRight: 4, padding: 4 }}>
            <Text style={styles.optionsBtn}>⋯</Text>
          </Pressable>
        ) : null,
    });
  }, [pet, navigation, t, language]);

  if (!pet) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="paw-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const upcomingVaccinations = [...pet.vaccinations]
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    .slice(0, 3);

  const speciesLabel = getSpeciesLabel(pet.species, pet.gender, language);
  const age = calculateAge(pet.birthdate, language);
  const latestWeight = (pet.weightHistory ?? []).length > 0
    ? [...pet.weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const med = pet.medicalProfile;
  const hasMedical = med && (med.allergies || med.chronicConditions || med.vetName || med.vetPhone);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn}>
          <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.heroSection}>
            <View style={styles.heroContent}>
              <View style={styles.heroAvatarWrap}>
                {pet.photoUri ? (
                  <Image source={{ uri: pet.photoUri }} style={styles.heroPhoto} contentFit="cover" />
                ) : (
                  <View style={styles.heroEmojiWrap}>
                    <Text style={styles.heroEmoji}>{SPECIES_EMOJI[pet.species] ?? "🐾"}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroName}>{pet.name}</Text>
              <Text style={styles.heroBreed}>
                {speciesLabel}{pet.breed ? ` • ${pet.breed}` : ""}
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{age}</Text>
                  <Text style={styles.heroStatLabel}>{t.age}</Text>
                </View>
                {(latestWeight ?? (pet.weight ? { weight: parseFloat(pet.weight) } : null)) ? (
                  <>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatValue}>{latestWeight ? latestWeight.weight.toFixed(1) : pet.weight} кг</Text>
                      <Text style={styles.heroStatLabel}>{t.weight.replace(" (кг)", "")}</Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{pet.vaccinations.length}</Text>
                  <Text style={styles.heroStatLabel}>{language === "uk" ? "Вакцин" : "Vacc."}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{pet.documents.length}</Text>
                  <Text style={styles.heroStatLabel}>{language === "uk" ? "Докум." : "Docs"}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.body}>
          {/* Info card */}
          <Animated.View entering={FadeInDown.delay(80)}>
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>{t.details}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoLabel}>{t.birthdate}</Text>
                <Text style={styles.infoValue}>{formatDate(pet.birthdate)}</Text>
              </View>
              {pet.color ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{t.color}</Text>
                    <Text style={styles.infoValue}>{pet.color}</Text>
                  </View>
                </>
              ) : null}
              {pet.gender ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name={pet.gender === "male" ? "male" : "female"} size={18} color={pet.gender === "male" ? Colors.primary : "#E91E63"} />
                    <Text style={styles.infoLabel}>{t.gender}</Text>
                    <Text style={styles.infoValue}>{pet.gender === "male" ? t.male : t.female}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>

          {/* Medical profile */}
          <Animated.View entering={FadeInDown.delay(120)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{language === "uk" ? "Медичний профіль" : "Medical Profile"}</Text>
              <Pressable onPress={openMedicalModal}>
                <Text style={styles.seeAll}>{hasMedical ? (language === "uk" ? "Редагувати" : "Edit") : (language === "uk" ? "Заповнити" : "Fill In")}</Text>
              </Pressable>
            </View>

            {hasMedical ? (
              <View style={styles.infoCard}>
                {med?.allergies ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="alert-circle-outline" size={18} color="#FF6B6B" />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Алергії" : "Allergies"}</Text>
                    <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>{med.allergies}</Text>
                  </View>
                ) : null}
                {med?.chronicConditions ? (
                  <>
                    {med?.allergies && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <Ionicons name="fitness-outline" size={18} color="#FF9500" />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Хроніч. хвороби" : "Chronic Conditions"}</Text>
                      <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>{med.chronicConditions}</Text>
                    </View>
                  </>
                ) : null}
                {med?.vetName ? (
                  <>
                    {(med?.allergies || med?.chronicConditions) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={18} color={Colors.primary} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Ветеринар" : "Vet"}</Text>
                      <Text style={styles.infoValue}>{med.vetName}</Text>
                    </View>
                  </>
                ) : null}
                {med?.vetPhone ? (
                  <>
                    {(med?.allergies || med?.chronicConditions || med?.vetName) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={18} color={Colors.accentGreen} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Телефон ветеринара" : "Vet Phone"}</Text>
                      <Text style={styles.infoValue}>{med.vetPhone}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={openMedicalModal} style={styles.emptyCard}>
                <Ionicons name="medkit-outline" size={26} color={Colors.primary} />
                <Text style={styles.emptyCardText}>
                  {language === "uk" ? "Додати медичну інформацію" : "Add medical information"}
                </Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Vaccinations */}
          <Animated.View entering={FadeInDown.delay(160)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.vaccinations}</Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } }); }}>
                <Text style={styles.seeAll}>{t.seeAll}</Text>
              </Pressable>
            </View>

            {upcomingVaccinations.length === 0 ? (
              <Pressable
                onPress={() => router.push({ pathname: "/pet/add-vaccination/[id]", params: { id: pet.id } })}
                style={styles.emptyCard}
              >
                <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
                <Text style={styles.emptyCardText}>{t.addVaccination}</Text>
              </Pressable>
            ) : (
              <View style={styles.card}>
                {upcomingVaccinations.map((v, i) => (
                  <View key={v.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.vaccinationRow}>
                      <View style={styles.vaccinationInfo}>
                        <Text style={styles.vaccinationName}>{v.name}</Text>
                        <Text style={styles.vaccinationDate}>{t.next}: {formatDateShort(v.nextDate)}</Text>
                      </View>
                      <VaccinationBadge nextDate={v.nextDate} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <View style={styles.quickActions}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } }); }}
                style={[styles.actionButton, { backgroundColor: Colors.primaryLight }]}
              >
                <Ionicons name="medical" size={24} color={Colors.primary} />
                <Text style={[styles.actionLabel, { color: Colors.primary }]}>{t.vaccinations}</Text>
              </Pressable>

              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/documents/[id]", params: { id: pet.id } }); }}
                style={[styles.actionButton, { backgroundColor: "#FFF0F0" }]}
              >
                <Ionicons name="document-text" size={24} color={Colors.accent} />
                <Text style={[styles.actionLabel, { color: Colors.accent }]}>{t.documents}</Text>
              </Pressable>

              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/weight/[id]", params: { id: pet.id } }); }}
                style={[styles.actionButton, { backgroundColor: "#F0FFF5" }]}
              >
                <Ionicons name="analytics" size={24} color={Colors.accentGreen} />
                <Text style={[styles.actionLabel, { color: Colors.accentGreen }]}>{language === "uk" ? "Вага" : "Weight"}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Medical profile edit modal */}
      <Modal visible={showMedicalModal} transparent animationType="slide" onRequestClose={() => setShowMedicalModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowMedicalModal(false)}>
                <Text style={styles.modalCancel}>{t.cancel}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{language === "uk" ? "Медичний профіль" : "Medical Profile"}</Text>
              <Pressable onPress={saveMedical}>
                <Text style={styles.modalSave}>{t.save.split(" ")[0]}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.medForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.medLabel}>{language === "uk" ? "Алергії" : "Allergies"}</Text>
              <TextInput
                style={styles.medInput}
                value={medForm.allergies ?? ""}
                onChangeText={(v) => setMedForm(prev => ({ ...prev, allergies: v }))}
                placeholder={language === "uk" ? "Напр. куряче м'ясо, пилок" : "e.g. chicken, pollen"}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />

              <Text style={styles.medLabel}>{language === "uk" ? "Хронічні хвороби" : "Chronic Conditions"}</Text>
              <TextInput
                style={styles.medInput}
                value={medForm.chronicConditions ?? ""}
                onChangeText={(v) => setMedForm(prev => ({ ...prev, chronicConditions: v }))}
                placeholder={language === "uk" ? "Напр. діабет, артрит" : "e.g. diabetes, arthritis"}
                placeholderTextColor={Colors.textTertiary}
                multiline
              />

              <Text style={styles.medLabel}>{language === "uk" ? "Ім'я ветеринара" : "Vet Name"}</Text>
              <TextInput
                style={styles.medInput}
                value={medForm.vetName ?? ""}
                onChangeText={(v) => setMedForm(prev => ({ ...prev, vetName: v }))}
                placeholder={language === "uk" ? "Лікар Петренко Олег" : "Dr. John Smith"}
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.medLabel}>{language === "uk" ? "Телефон ветеринара" : "Vet Phone"}</Text>
              <TextInput
                style={styles.medInput}
                value={medForm.vetPhone ?? ""}
                onChangeText={(v) => setMedForm(prev => ({ ...prev, vetPhone: v }))}
                placeholder="+380 xx xxx xx xx"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {},
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  optionsBtn: { fontSize: 24, color: Colors.text, fontWeight: "700", lineHeight: 26 },
  heroSection: { paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20 },
  heroContent: { alignItems: "center" },
  heroAvatarWrap: {
    position: "relative", marginBottom: 14,
    borderRadius: 54, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", overflow: "visible",
  },
  heroPhoto: { width: 108, height: 108, borderRadius: 54 },
  heroEmojiWrap: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  heroEmoji: { fontSize: 50 },
  heroName: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.textLight, marginBottom: 4 },
  heroBreed: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginBottom: 20 },
  heroStats: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18, padding: 14, gap: 12, alignItems: "center",
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textLight },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  body: { padding: 16, gap: 16 },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  cardSectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.6, padding: 14, paddingBottom: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 14 },
  infoLabel: { flex: 0, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, minWidth: 80 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  vaccinationRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  vaccinationInfo: { flex: 1 },
  vaccinationName: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  vaccinationDate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20,
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: Colors.border, borderStyle: "dashed", flexDirection: "row",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  emptyCardText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.primary },
  quickActions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, borderRadius: 18, padding: 14, alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 12 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  medForm: { padding: 16, gap: 4 },
  medLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12,
  },
  medInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    minHeight: 44,
  },
});
