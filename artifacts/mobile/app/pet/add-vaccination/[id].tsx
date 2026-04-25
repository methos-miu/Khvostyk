import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useLayoutEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { scheduleVaccinationReminder, requestNotificationPermissions } from "@/utils/notifications";

type FormData = {
  name: string;
  date: string;
  nextDate: string;
  vetName: string;
  notes: string;
};

const COMMON_VACCINES = [
  "Сказ",
  "Чума плотоядних",
  "Парвовірусний ентерит",
  "Лептоспіроз",
  "Гепатит",
  "Комплексна (DHPP)",
  "Лейкемія котів",
  "Кальцивіроз",
  "Ринотрахеїт",
];

export default function AddVaccinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, addVaccination } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const pet = getPet(id);

  const [form, setForm] = useState<FormData>({
    name: "",
    date: new Date().toISOString().split("T")[0],
    nextDate: "",
    vetName: "",
    notes: "",
  });

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary }}>
            {t.cancel}
          </Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleSave} style={{ marginRight: 4 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary }}>
            {t.done}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, language, form, loading]);

  const updateForm = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t.error, t.errorVaccineName);
      return;
    }
    if (!form.date.trim()) {
      Alert.alert(t.error, t.errorVaccineDate);
      return;
    }
    if (!form.nextDate.trim()) {
      Alert.alert(t.error, t.errorVaccineNextDate);
      return;
    }

    setLoading(true);
    try {
      await addVaccination(id, {
        name: form.name.trim(),
        date: form.date.trim(),
        nextDate: form.nextDate.trim(),
        vetName: form.vetName.trim(),
        notes: form.notes.trim(),
      });

      if (pet) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleVaccinationReminder(pet, {
            id: "temp",
            name: form.name.trim(),
            date: form.date.trim(),
            nextDate: form.nextDate.trim(),
            vetName: form.vetName.trim(),
            notes: form.notes.trim(),
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.quickPick}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chips}>
              {COMMON_VACCINES.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    Haptics.selectionAsync();
                    updateForm("name", name);
                  }}
                  style={[
                    styles.chip,
                    form.name === name && styles.chipActive,
                  ]}
                >
                  <Text style={[styles.chipText, form.name === name && styles.chipTextActive]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.vaccinationInfo}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vaccineName} *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => updateForm("name", v)}
                placeholder={t.vaccineName}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vaccineDate} *</Text>
              <DatePickerField
                value={form.date}
                onChange={(iso) => updateForm("date", iso)}
                placeholder={t.vaccineDate}
                label={t.vaccineDate}
                maximumDate={new Date()}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.nextVaccineDate} *</Text>
              <DatePickerField
                value={form.nextDate}
                onChange={(iso) => updateForm("nextDate", iso)}
                placeholder={t.nextVaccineDate}
                label={t.nextVaccineDate}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.additionalInfo}</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.vet}</Text>
              <TextInput
                style={styles.input}
                value={form.vetName}
                onChangeText={(v) => updateForm("vetName", v)}
                placeholder={t.vetNamePlaceholder}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.notes}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={form.notes}
                onChangeText={(v) => updateForm("notes", v)}
                placeholder={t.notesPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.notificationNote}>
          <MaterialCommunityIcons name="bell-outline" size={16} color={Colors.primary} />
          <Text style={styles.notificationNoteText}>{t.vaccineReminder}</Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {loading ? t.saving : t.saveVaccination}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
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
  chipsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    whiteSpace: "nowrap",
  },
  chipTextActive: {
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
  multilineInput: {
    height: 70,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  notificationNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  notificationNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
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
