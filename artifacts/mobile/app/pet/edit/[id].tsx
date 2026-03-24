import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import {
  CAT_BREEDS_UK, CAT_BREEDS_EN,
  DOG_BREEDS_UK, DOG_BREEDS_EN,
  RABBIT_BREEDS_UK, RABBIT_BREEDS_EN,
  HAMSTER_BREEDS_UK, HAMSTER_BREEDS_EN,
  GUINEA_PIG_BREEDS_UK, GUINEA_PIG_BREEDS_EN,
  BIRD_SPECIES_UK, BIRD_SPECIES_EN,
  TURTLE_BREEDS_UK, TURTLE_BREEDS_EN,
  REPTILE_BREEDS_UK, REPTILE_BREEDS_EN,
  FISH_BREEDS_UK, FISH_BREEDS_EN,
  FERRET_TYPES_UK, FERRET_TYPES_EN,
  HEDGEHOG_BREEDS_UK, HEDGEHOG_BREEDS_EN,
} from "@/constants/breeds";
import { Species, Gender, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { BreedPickerModal } from "@/components/ui/BreedPickerModal";

type FormData = {
  name: string;
  species: Species;
  customSpecies: string;
  breed: string;
  birthdate: string;
  weight: string;
  color: string;
  photoUri: string;
  gender: Gender;
};

const ALL_SPECIES: { value: Species; icon: string }[] = [
  { value: "cat", icon: "🐈" },
  { value: "dog", icon: "🐕" },
  { value: "rabbit", icon: "🐇" },
  { value: "hamster", icon: "🐹" },
  { value: "guinea_pig", icon: "🐾" },
  { value: "bird", icon: "🐦" },
  { value: "turtle", icon: "🐢" },
  { value: "reptile", icon: "🦎" },
  { value: "fish", icon: "🐟" },
  { value: "ferret", icon: "🦡" },
  { value: "hedgehog", icon: "🦔" },
  { value: "other", icon: "✨" },
];

const WEIGHT_VALUES = Array.from({ length: 1000 }, (_, i) =>
  ((i + 1) * 0.1).toFixed(1)
);

const ITEM_HEIGHT = 44;

function getBreedList(species: Species, lang: "uk" | "en"): string[] {
  const uk = lang === "uk";
  switch (species) {
    case "cat":       return uk ? CAT_BREEDS_UK       : CAT_BREEDS_EN;
    case "dog":       return uk ? DOG_BREEDS_UK       : DOG_BREEDS_EN;
    case "rabbit":    return uk ? RABBIT_BREEDS_UK    : RABBIT_BREEDS_EN;
    case "hamster":   return uk ? HAMSTER_BREEDS_UK   : HAMSTER_BREEDS_EN;
    case "guinea_pig":return uk ? GUINEA_PIG_BREEDS_UK: GUINEA_PIG_BREEDS_EN;
    case "bird":      return uk ? BIRD_SPECIES_UK     : BIRD_SPECIES_EN;
    case "turtle":    return uk ? TURTLE_BREEDS_UK    : TURTLE_BREEDS_EN;
    case "reptile":   return uk ? REPTILE_BREEDS_UK   : REPTILE_BREEDS_EN;
    case "fish":      return uk ? FISH_BREEDS_UK      : FISH_BREEDS_EN;
    case "ferret":    return uk ? FERRET_TYPES_UK     : FERRET_TYPES_EN;
    case "hedgehog":  return uk ? HEDGEHOG_BREEDS_UK  : HEDGEHOG_BREEDS_EN;
    default:          return [];
  }
}

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, updatePet } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const pet = getPet(id);

  const [form, setForm] = useState<FormData>({
    name: pet?.name ?? "",
    species: pet?.species ?? "dog",
    customSpecies: pet?.customSpecies ?? "",
    breed: pet?.breed ?? "",
    birthdate: pet?.birthdate ?? "",
    weight: pet?.weight ?? "",
    color: pet?.color ?? "",
    photoUri: pet?.photoUri ?? "",
    gender: pet?.gender ?? null,
  });

  const updateForm = (key: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const speciesLabel = (s: Species) => (t as any)[s] ?? t.other;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm("photoUri", result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionTitle, t.cameraDenied);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm("photoUri", result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t.photoTitle, "", [
      { text: t.photoCamera, onPress: takePhoto },
      { text: t.photoGallery, onPress: pickPhoto },
      { text: t.cancel, style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("", t.errorName);
      return;
    }
    if (!form.birthdate.trim()) {
      Alert.alert("", t.errorBirthdate);
      return;
    }
    if (form.species === "other" && !form.customSpecies.trim()) {
      Alert.alert("", language === "uk" ? "Вкажіть назву тварини" : "Please enter the animal name");
      return;
    }
    if (!pet) return;
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updatePet(pet.id, {
        name: form.name.trim(),
        species: form.species,
        customSpecies: form.species === "other" ? form.customSpecies.trim() : undefined,
        breed: form.breed.trim(),
        birthdate: form.birthdate,
        weight: form.weight.trim(),
        color: form.color.trim(),
        photoUri: form.photoUri,
        gender: form.gender,
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (!pet) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary }}>Тварину не знайдено</Text>
      </View>
    );
  }

  const breedList = getBreedList(form.species, language);
  const showBreedOption = form.species !== "other";

  const weightIndex = form.weight
    ? Math.max(0, WEIGHT_VALUES.indexOf(form.weight))
    : 49;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.delay(80)}>
          {/* Photo */}
          <Pressable onPress={showPhotoOptions} style={styles.photoButton}>
            {form.photoUri ? (
              <Image source={{ uri: form.photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={36} color={Colors.primary} />
                <Text style={styles.photoPlaceholderText}>{t.addPet}</Text>
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color={Colors.textLight} />
            </View>
          </Pressable>

          {/* Species */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.petType}</Text>
            <View style={styles.speciesGrid}>
              {ALL_SPECIES.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateForm("species", opt.value);
                    updateForm("breed", "");
                    if (opt.value !== "other") updateForm("customSpecies", "");
                  }}
                  style={[
                    styles.speciesOption,
                    form.species === opt.value && styles.speciesOptionActive,
                  ]}
                >
                  <Text style={styles.speciesIcon}>{opt.icon}</Text>
                  <Text style={[
                    styles.speciesLabel,
                    form.species === opt.value && styles.speciesLabelActive,
                  ]} numberOfLines={2}>
                    {speciesLabel(opt.value)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {form.species === "other" && (
              <Animated.View entering={FadeInDown.duration(220).springify()} style={styles.customSpeciesBox}>
                <Text style={styles.customSpeciesHint}>
                  {language === "uk" ? "Введіть назву вашої тварини" : "Enter your pet's species"}
                </Text>
                <TextInput
                  style={styles.customSpeciesInput}
                  value={form.customSpecies}
                  onChangeText={(v) => updateForm("customSpecies", v)}
                  placeholder={language === "uk" ? "Яка тварина?" : "What animal?"}
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                />
              </Animated.View>
            )}
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.gender}</Text>
            <View style={styles.genderRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  updateForm("gender", form.gender === "male" ? null : "male");
                }}
                style={[styles.genderOption, form.gender === "male" && styles.genderMaleActive]}
              >
                <Ionicons name="male" size={20} color={form.gender === "male" ? Colors.textLight : Colors.primary} />
                <Text style={[styles.genderLabel, form.gender === "male" && styles.genderLabelActive]}>
                  {t.male}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  updateForm("gender", form.gender === "female" ? null : "female");
                }}
                style={[styles.genderOption, form.gender === "female" && styles.genderFemaleActive]}
              >
                <Ionicons name="female" size={20} color={form.gender === "female" ? Colors.textLight : "#E91E63"} />
                <Text style={[styles.genderLabel, form.gender === "female" && styles.genderLabelActive]}>
                  {t.female}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Main Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.basicInfo}</Text>
            <View style={styles.card}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.name} *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => updateForm("name", v)}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <View style={styles.divider} />

              {/* Breed */}
              {showBreedOption ? (
                <>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowBreedPicker(true);
                    }}
                    style={styles.inputGroup}
                  >
                    <Text style={styles.inputLabel}>{t.breed}</Text>
                    <View style={styles.pickerRow}>
                      <Text style={[styles.input, !form.breed && { color: Colors.textTertiary }]} numberOfLines={1}>
                        {form.breed || t.breedPlaceholder}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
                    </View>
                  </Pressable>
                  <View style={styles.divider} />
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t.breed}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.breed}
                      onChangeText={(v) => updateForm("breed", v)}
                      placeholder={t.breedPlaceholder}
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Birthdate */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.birthdate} *</Text>
                <DatePickerField
                  value={form.birthdate}
                  onChange={(iso) => updateForm("birthdate", iso)}
                  placeholder={language === "uk" ? "Оберіть дату народження" : "Select birth date"}
                  label={t.birthdate}
                />
              </View>
              <View style={styles.divider} />

              {/* Weight picker */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowWeightPicker(true);
                }}
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>{t.weight}</Text>
                <View style={styles.pickerRow}>
                  <Text style={[styles.input, !form.weight && { color: Colors.textTertiary }]}>
                    {form.weight ? `${form.weight} кг` : "— кг"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
                </View>
              </Pressable>
              <View style={styles.divider} />

              {/* Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t.color}</Text>
                <TextInput
                  style={styles.input}
                  value={form.color}
                  onChangeText={(v) => updateForm("color", v)}
                  placeholder={t.colorPlaceholder}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>
              {loading ? t.saving : language === "uk" ? "Зберегти зміни" : "Save changes"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <BreedPickerModal
        visible={showBreedPicker}
        onClose={() => setShowBreedPicker(false)}
        breeds={breedList}
        selectedBreed={form.breed}
        onSelect={(breed) => updateForm("breed", breed)}
        title={t.selectBreed}
        language={language}
      />

      {/* Weight Picker Modal */}
      <Modal
        visible={showWeightPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWeightPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={[styles.modalSheet, styles.weightModalSheet]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.weightSelect}</Text>
              <Pressable onPress={() => setShowWeightPicker(false)}>
                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.weightPickerContainer}>
              <View style={styles.weightSelectionBar} />
              <FlatList
                data={WEIGHT_VALUES}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                initialScrollIndex={weightIndex}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateForm("weight", item);
                      setShowWeightPicker(false);
                    }}
                    style={styles.weightItem}
                  >
                    <Text style={[
                      styles.weightItemText,
                      form.weight === item && styles.weightItemTextActive,
                    ]}>
                      {item} кг
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  photoButton: { alignSelf: "center", marginBottom: 28, position: "relative" },
  photoPreview: { width: 110, height: 110, borderRadius: 55 },
  photoPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.primaryLight, alignItems: "center",
    justifyContent: "center", gap: 6,
    borderWidth: 2, borderColor: Colors.border, borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.primary },
  photoBadge: {
    position: "absolute", bottom: 4, right: 4,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.surface,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10, marginLeft: 4,
  },
  speciesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  customSpeciesBox: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 6,
  },
  customSpeciesHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  customSpeciesInput: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    padding: 0,
  },
  speciesOption: {
    width: "22%",
    backgroundColor: Colors.surface, borderRadius: 14, padding: 10,
    alignItems: "center", gap: 4, borderWidth: 2, borderColor: Colors.border,
  },
  speciesOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  speciesIcon: { fontSize: 22 },
  speciesLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, textAlign: "center" },
  speciesLabelActive: { color: Colors.primary },
  genderRow: { flexDirection: "row", gap: 12 },
  genderOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
  },
  genderMaleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  genderFemaleActive: { backgroundColor: "#E91E63", borderColor: "#E91E63" },
  genderLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  genderLabelActive: { color: Colors.textLight },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  inputGroup: { paddingHorizontal: 16, paddingVertical: 14 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textTertiary, marginBottom: 4 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },
  saveButton: {
    backgroundColor: Colors.primary, borderRadius: 18, paddingVertical: 17,
    alignItems: "center", marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "70%",
  },
  weightModalSheet: { maxHeight: "55%" },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: "center", marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  breedRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 15,
  },
  breedRowActive: { backgroundColor: Colors.primaryLight },
  breedText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  breedTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  breedSeparator: { height: 1, backgroundColor: Colors.border, marginLeft: 20 },
  weightPickerContainer: { position: "relative", height: 220 },
  weightSelectionBar: {
    position: "absolute", top: "50%", left: 0, right: 0,
    height: ITEM_HEIGHT, marginTop: -ITEM_HEIGHT / 2,
    backgroundColor: Colors.primaryLight, borderRadius: 12, marginHorizontal: 16,
  },
  weightItem: { height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
  weightItemText: { fontSize: 20, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  weightItemTextActive: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.primary },
});
