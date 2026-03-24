import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Species, usePets } from "@/context/PetsContext";

type FormData = {
  name: string;
  species: Species;
  breed: string;
  birthdate: string;
  weight: string;
  color: string;
  photoUri: string;
};

export default function AddPetScreen() {
  const { addPet } = usePets();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    species: "dog",
    breed: "",
    birthdate: "",
    weight: "",
    color: "",
    photoUri: "",
  });

  const updateForm = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm("photoUri", result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Дозвіл", "Потрібен дозвіл на використання камери");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateForm("photoUri", result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Фото тварини", "Оберіть джерело", [
      { text: "Камера", onPress: takePhoto },
      { text: "Галерея", onPress: pickPhoto },
      { text: "Скасувати", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Помилка", "Вкажіть ім'я тварини");
      return;
    }
    if (!form.birthdate.trim()) {
      Alert.alert("Помилка", "Вкажіть дату народження");
      return;
    }

    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addPet({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim(),
        birthdate: form.birthdate.trim(),
        weight: form.weight.trim(),
        color: form.color.trim(),
        photoUri: form.photoUri,
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const speciesOptions: { value: Species; label: string; icon: string }[] = [
    { value: "dog", label: "Пес", icon: "🐕" },
    { value: "cat", label: "Кіт", icon: "🐈" },
    { value: "other", label: "Інше", icon: "🐾" },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100)}>
          <Pressable onPress={showPhotoOptions} style={styles.photoButton}>
            {form.photoUri ? (
              <Image
                source={{ uri: form.photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={36} color={Colors.primary} />
                <Text style={styles.photoPlaceholderText}>Додати фото</Text>
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={14} color={Colors.textLight} />
            </View>
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Вид тварини</Text>
            <View style={styles.speciesRow}>
              {speciesOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateForm("species", opt.value);
                  }}
                  style={[
                    styles.speciesOption,
                    form.species === opt.value && styles.speciesOptionActive,
                  ]}
                >
                  <Text style={styles.speciesIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.speciesLabel,
                      form.species === opt.value && styles.speciesLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Основна інформація</Text>
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ім'я *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => updateForm("name", v)}
                  placeholder="Ім'я вашої тварини"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Порода</Text>
                <TextInput
                  style={styles.input}
                  value={form.breed}
                  onChangeText={(v) => updateForm("breed", v)}
                  placeholder="Порода (необов'язково)"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Дата народження *</Text>
                <TextInput
                  style={styles.input}
                  value={form.birthdate}
                  onChangeText={(v) => updateForm("birthdate", v)}
                  placeholder="РРРР-ММ-ДД"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Вага (кг)</Text>
                <TextInput
                  style={styles.input}
                  value={form.weight}
                  onChangeText={(v) => updateForm("weight", v)}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Забарвлення</Text>
                <TextInput
                  style={styles.input}
                  value={form.color}
                  onChangeText={(v) => updateForm("color", v)}
                  placeholder="Колір/забарвлення"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={loading}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>
              {loading ? "Збереження..." : "Зберегти тварину"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  photoButton: {
    alignSelf: "center",
    marginBottom: 28,
    position: "relative",
  },
  photoPreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  photoBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  speciesRow: {
    flexDirection: "row",
    gap: 10,
  },
  speciesOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  speciesOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  speciesIcon: {
    fontSize: 24,
  },
  speciesLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  speciesLabelActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textLight,
  },
});
