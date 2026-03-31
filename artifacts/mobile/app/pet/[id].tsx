import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import { usePets, MedicalProfile, Illness } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { getSpeciesLabel } from "@/utils/speciesLabel";
import { calculateAge, formatDateShort, formatDate } from "@/utils/notifications";
import { getAnimalEmoji } from "@/constants/animals";

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, deletePet, updatePet } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medForm, setMedForm] = useState<MedicalProfile>({});
  const [showIllnessForm, setShowIllnessForm] = useState(false);
  const [editingIllnessId, setEditingIllnessId] = useState<string | null>(null);
  const [illnessForm, setIllnessForm] = useState<Partial<Illness>>({});

  const BLOOD_TYPES = ["A", "B", "AB", "0", "DEA 1.1+", "DEA 1.1-", "DEA 1.2+", "DEA 1.2-", "DEA 3", "DEA 4", "DEA 5", "DEA 7", "A/B"];

  const openIllnessAdd = () => {
    setEditingIllnessId(null);
    setIllnessForm({});
    setShowIllnessForm(true);
  };

  const openIllnessEdit = (ill: Illness) => {
    setEditingIllnessId(ill.id);
    setIllnessForm({ name: ill.name, startDate: ill.startDate, endDate: ill.endDate, description: ill.description });
    setShowIllnessForm(true);
  };

  const saveIllness = () => {
    if (!illnessForm.name?.trim()) return;
    const illId = editingIllnessId ?? (Date.now().toString() + Math.random().toString(36).substr(2, 9));
    const entry: Illness = { id: illId, name: illnessForm.name.trim(), startDate: illnessForm.startDate ?? "", endDate: illnessForm.endDate, description: illnessForm.description };
    const existing = medForm.illnesses ?? [];
    const updated = editingIllnessId
      ? existing.map(i => i.id === editingIllnessId ? entry : i)
      : [...existing, entry];
    setMedForm(prev => ({ ...prev, illnesses: updated }));
    setShowIllnessForm(false);
  };

  const deleteIllness = (id: string) => {
    setMedForm(prev => ({ ...prev, illnesses: (prev.illnesses ?? []).filter(i => i.id !== id) }));
  };

  const medPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) setShowMedicalModal(false);
      },
    })
  ).current;

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
    setShowIllnessForm(false);
    setIllnessForm({});
    setEditingIllnessId(null);
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
          <Pressable onPress={handleOptions} style={{ marginRight: 0 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Text style={styles.optionsBtn}>⋯</Text>
            </View>
          </Pressable>
        ) : null,
    });
  }, [pet, navigation, t, language]);

  if (!pet) {
    return (
      <View style={styles.notFound}>
        <MaterialCommunityIcons name="paw-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const upcomingVaccinations = [...pet.vaccinations]
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    .slice(0, 3);

  const speciesLabel = getSpeciesLabel(pet.species, pet.gender, language, pet.customSpecies);
  const age = calculateAge(pet.birthdate, language);
  const latestWeight = (pet.weightHistory ?? []).length > 0
    ? [...pet.weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const med = pet.medicalProfile;
  const hasMedical = med && (med.allergies || med.chronicConditions || med.vetName || med.vetPhone || med.bloodType || (med.illnesses && med.illnesses.length > 0));

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
                    <Text style={styles.heroEmoji}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
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
          <Animated.View entering={FadeInDown.delay(80)}>
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>{t.details}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoLabel}>{t.birthdate}</Text>
                <Text style={styles.infoValue}>{formatDate(pet.birthdate)}</Text>
              </View>
              {pet.color ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="palette-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{t.color}</Text>
                    <Text style={styles.infoValue}>{pet.color}</Text>
                  </View>
                </>
              ) : null}
              {pet.gender ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={{ fontSize: 18, color: pet.gender === "male" ? Colors.primary : "#E91E63" }}>
                      {pet.gender === "male" ? "♂" : "♀"}
                    </Text>
                    <Text style={styles.infoLabel}>{t.gender}</Text>
                    <Text style={styles.infoValue}>{pet.gender === "male" ? t.male : t.female}</Text>
                  </View>
                </>
              ) : null}
              {pet.length ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="ruler" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Довжина" : "Length"}</Text>
                    <Text style={styles.infoValue}>{pet.length} см</Text>
                  </View>
                </>
              ) : null}
              {pet.height ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="human-male-height" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Висота" : "Height"}</Text>
                    <Text style={styles.infoValue}>{pet.height} см</Text>
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>

          {/* Personality & Description */}
          {(pet.personality || pet.description) ? (
            <Animated.View entering={FadeInDown.delay(100)}>
              <View style={styles.infoCard}>
                <Text style={styles.cardSectionTitle}>{language === "uk" ? "Характер та опис" : "Personality & Description"}</Text>
                {pet.personality ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="heart-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Характер" : "Personality"}</Text>
                    <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]}>{pet.personality}</Text>
                  </View>
                ) : null}
                {pet.personality && pet.description ? <View style={styles.divider} /> : null}
                {pet.description ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="text-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Опис" : "Description"}</Text>
                    <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]}>{pet.description}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

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
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF6B6B" />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Алергії" : "Allergies"}</Text>
                    <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]}>{med.allergies}</Text>
                  </View>
                ) : null}
                {med?.chronicConditions ? (
                  <>
                    {med?.allergies && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="heart-pulse" size={18} color="#FF9500" />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Хроніч. хвороби" : "Chronic Conditions"}</Text>
                      <Text style={[styles.infoValue, { flex: 1, textAlign: "right" }]}>{med.chronicConditions}</Text>
                    </View>
                  </>
                ) : null}
                {med?.bloodType ? (
                  <>
                    {(med?.allergies || med?.chronicConditions) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="water-outline" size={18} color={Colors.primary} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Група крові" : "Blood Type"}</Text>
                      <Text style={styles.infoValue}>{med.bloodType}</Text>
                    </View>
                  </>
                ) : null}
                {med?.illnesses && med.illnesses.length > 0 ? (
                  <>
                    {(med?.allergies || med?.chronicConditions || med?.bloodType) && <View style={styles.divider} />}
                    <View style={{ gap: 6 }}>
                      <Text style={[styles.infoLabel, { marginBottom: 2 }]}>{language === "uk" ? "Хвороби" : "Illnesses"}</Text>
                      {med.illnesses.map((ill) => (
                        <View key={ill.id} style={styles.illnessBadge}>
                          <Text style={styles.illnessName}>{ill.name}</Text>
                          {ill.startDate ? <Text style={styles.illnessDates}>{formatDateShort(ill.startDate)}{ill.endDate ? ` – ${formatDateShort(ill.endDate)}` : ""}</Text> : null}
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
                {med?.vetName ? (
                  <>
                    {(med?.allergies || med?.chronicConditions || med?.bloodType || (med?.illnesses && med.illnesses.length > 0)) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="account-outline" size={18} color={Colors.primary} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Ветеринар" : "Vet"}</Text>
                      <Text style={styles.infoValue}>{med.vetName}</Text>
                    </View>
                  </>
                ) : null}
                {med?.vetPhone ? (
                  <>
                    {(med?.allergies || med?.chronicConditions || med?.bloodType || (med?.illnesses && med.illnesses.length > 0) || med?.vetName) && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="phone-outline" size={18} color={Colors.accentGreen} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Телефон ветеринара" : "Vet Phone"}</Text>
                      <Text style={styles.infoValue}>{med.vetPhone}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={openMedicalModal} style={styles.emptyCard}>
                <MaterialCommunityIcons name="briefcase-plus-outline" size={26} color={Colors.primary} />
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
                <MaterialCommunityIcons name="plus-circle-outline" size={26} color={Colors.primary} />
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
                <MaterialCommunityIcons name="medical-bag" size={24} color={Colors.primary} />
                <Text style={[styles.actionLabel, { color: Colors.primary }]}>{t.vaccinations}</Text>
              </Pressable>

              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/documents/[id]", params: { id: pet.id } }); }}
                style={[styles.actionButton, { backgroundColor: "#FFF0F0" }]}
              >
                <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.accent} />
                <Text style={[styles.actionLabel, { color: Colors.accent }]}>{t.documents}</Text>
              </Pressable>

              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/weight/[id]", params: { id: pet.id } }); }}
                style={[styles.actionButton, { backgroundColor: "#F0FFF5" }]}
              >
                <MaterialCommunityIcons name="chart-line" size={24} color={Colors.accentGreen} />
                <Text style={[styles.actionLabel, { color: Colors.accentGreen }]}>{language === "uk" ? "Вага" : "Weight"}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Medical profile modal — backdrop + KAV + swipe-to-close */}
      <Modal visible={showMedicalModal} transparent animationType="slide" onRequestClose={() => setShowMedicalModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMedicalModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kavWrap}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
              <View {...medPanResponder.panHandlers} style={styles.handleWrap}>
                <View style={styles.modalHandle} />
              </View>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowMedicalModal(false)}>
                  <Text style={styles.modalCancel}>{t.cancel}</Text>
                </Pressable>
                <Text style={styles.modalTitle}>{language === "uk" ? "Медичний профіль" : "Medical Profile"}</Text>
                <Pressable onPress={saveMedical}>
                  <Text style={styles.modalSave}>{language === "uk" ? "Зберегти" : "Save"}</Text>
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

                {/* Blood Type */}
                <Text style={styles.medLabel}>{language === "uk" ? "Група крові" : "Blood Type"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                    {BLOOD_TYPES.map((bt) => (
                      <Pressable
                        key={bt}
                        onPress={() => setMedForm(prev => ({ ...prev, bloodType: prev.bloodType === bt ? undefined : bt }))}
                        style={[styles.bloodTypeChip, medForm.bloodType === bt && styles.bloodTypeChipActive]}
                      >
                        <Text style={[styles.bloodTypeText, medForm.bloodType === bt && styles.bloodTypeTextActive]}>{bt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Illnesses */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={styles.medLabel}>{language === "uk" ? "Хвороби" : "Illnesses"}</Text>
                  <Pressable onPress={openIllnessAdd} style={styles.illnessAddBtn}>
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                    <Text style={styles.illnessAddText}>{language === "uk" ? "Додати" : "Add"}</Text>
                  </Pressable>
                </View>
                {(medForm.illnesses ?? []).map((ill) => (
                  <View key={ill.id} style={styles.illnessRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.illnessRowName}>{ill.name}</Text>
                      {ill.startDate ? <Text style={styles.illnessRowDates}>{formatDateShort(ill.startDate)}{ill.endDate ? ` – ${formatDateShort(ill.endDate)}` : " – ..."}</Text> : null}
                      {ill.description ? <Text style={styles.illnessRowDesc}>{ill.description}</Text> : null}
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable onPress={() => openIllnessEdit(ill)} hitSlop={8}>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deleteIllness(ill.id)} hitSlop={8}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.textTertiary} />
                      </Pressable>
                    </View>
                  </View>
                ))}

                {/* Inline illness form */}
                {showIllnessForm && (
                  <View style={styles.illnessFormBox}>
                    <Text style={styles.medLabel}>{editingIllnessId ? (language === "uk" ? "Редагувати хворобу" : "Edit illness") : (language === "uk" ? "Нова хвороба" : "New illness")}</Text>
                    <TextInput
                      style={styles.medInput}
                      value={illnessForm.name ?? ""}
                      onChangeText={(v) => setIllnessForm(prev => ({ ...prev, name: v }))}
                      placeholder={language === "uk" ? "Назва хвороби *" : "Illness name *"}
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.medInput}
                          value={illnessForm.startDate ?? ""}
                          onChangeText={(v) => setIllnessForm(prev => ({ ...prev, startDate: v }))}
                          placeholder={language === "uk" ? "Початок (рр-мм-дд)" : "Start (yy-mm-dd)"}
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.medInput}
                          value={illnessForm.endDate ?? ""}
                          onChangeText={(v) => setIllnessForm(prev => ({ ...prev, endDate: v }))}
                          placeholder={language === "uk" ? "Кінець (необов.)" : "End (optional)"}
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    </View>
                    <TextInput
                      style={styles.medInput}
                      value={illnessForm.description ?? ""}
                      onChangeText={(v) => setIllnessForm(prev => ({ ...prev, description: v }))}
                      placeholder={language === "uk" ? "Опис (необов.)" : "Description (optional)"}
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                    />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Pressable onPress={() => setShowIllnessForm(false)} style={[styles.illnessFormBtn, { backgroundColor: Colors.border }]}>
                        <Text style={{ color: Colors.text, fontFamily: "Inter_500Medium", fontSize: 14 }}>{language === "uk" ? "Скасувати" : "Cancel"}</Text>
                      </Pressable>
                      <Pressable onPress={saveIllness} style={[styles.illnessFormBtn, { backgroundColor: Colors.primary }]}>
                        <Text style={{ color: Colors.textLight, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{language === "uk" ? "Зберегти" : "Save"}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

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
        </View>
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
  kavWrap: { justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%",
  },
  handleWrap: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
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
  cardSectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
  },
  illnessBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  illnessName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  illnessDates: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  bloodTypeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  bloodTypeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bloodTypeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  bloodTypeTextActive: { color: Colors.textLight },
  illnessAddBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  illnessAddText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  illnessRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  illnessRowName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  illnessRowDates: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  illnessRowDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2, fontStyle: "italic" },
  illnessFormBox: {
    backgroundColor: Colors.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 8, gap: 8,
  },
  illnessFormBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
});
