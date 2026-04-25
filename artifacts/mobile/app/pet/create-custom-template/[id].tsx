import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useLayoutEffect, useState } from "react";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { Colors } from "@/constants/colors";
import { RecurrenceType, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  requestNotificationPermissions,
  scheduleHealthEventReminders,
} from "@/utils/notifications";

// ─── Available icons ──────────────────────────────────────────────────────────

const ICON_OPTIONS: Array<React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = [
  "star-outline",           "heart-outline",        "paw-outline",
  "camera-outline",         "calendar-outline",     "bell-outline",
  "tag-outline",            "bookmark-outline",     "note-outline",
  "folder-outline",         "flag-outline",         "map-marker-outline",
  "alarm-outline",          "emoticon-happy-outline","gift-outline",
  "run",                    "bicycle",              "swim",
  "weight-lifter",          "food-apple-outline",   "pill",
  "hospital-box-outline",   "bandage",              "thermometer",
  "eye-outline",            "car-outline",          "airplane",
  "basket-outline",         "flash-outline",        "water-outline",
  "leaf-outline",           "flower-outline",       "fish-outline",
  "dog-service",            "cat",                  "rabbit-variant-outline",
  "shield-outline",         "lock-outline",         "key-outline",
  "phone-outline",          "email-outline",        "chart-line",
  "lightbulb-outline",      "wrench-outline",       "palette-outline",
  "music-note",             "dumbbell",             "yoga",
];

const DEFAULT_ICON = "help-circle-outline";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCustomTemplateScreen() {
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { getPet, addHealthEvent, updateHealthEvent } = usePets();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const lang = language as "uk" | "en";

  const pet = getPet(petId);

  // ── Template identity ──────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState("");
  const [templateIcon, setTemplateIcon] = useState(DEFAULT_ICON);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);

  // ── Event fields ───────────────────────────────────────────────────────────
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("one_time");
  const [repeatN, setRepeatN] = useState("1");
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months">("months");
  const [repeatRule, setRepeatRule] = useState<"yearly" | "">("");
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("");

  const [saving, setSaving] = useState(false);

  // ── Header ─────────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      title: lang === "uk" ? "Моя власна подія" : "My Custom Event",
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 4 }}>
          <Text style={styles.headerBtn}>{t.cancel}</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={saving} style={{ marginRight: 4 }}>
          <Text style={[styles.headerBtn, styles.headerBtnPrimary, saving && styles.headerBtnDisabled]}>
            {lang === "uk" ? "Зберегти" : "Save"}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, saving, templateName, templateIcon, date, time, notes, photos,
      recurrenceType, repeatN, repeatUnit, repeatRule, nextDate, nextTime, lang]);

  // ── Photo picker ───────────────────────────────────────────────────────────

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionTitle, t.cameraDenied);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert(
        t.error,
        lang === "uk" ? "Введіть назву події" : "Enter an event name"
      );
      return;
    }
    if (!date.trim()) {
      Alert.alert(t.error, t.errorEventDate ?? (lang === "uk" ? "Введіть дату" : "Enter a date"));
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Save template to DB, get back its ID
      const { data: tmplData, error: tmplError } = await supabase
        .from("custom_event_templates")
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          icon: templateIcon,
        })
        .select("id")
        .single();

      if (tmplError) throw tmplError;
      const newTemplateId: string = tmplData.id;

      // 2. Build recurrence values
      const nVal = Math.max(1, parseInt(repeatN, 10) || 1);
      const resolvedRepeatRule: "yearly" | undefined = repeatRule === "yearly" ? "yearly" : undefined;
      const resolvedIntervalDays =
        recurrenceType === "regular" && !resolvedRepeatRule
          ? (repeatUnit === "days" ? nVal : repeatUnit === "weeks" ? nVal * 7 : nVal * 30)
          : undefined;

      // 3. Save event
      const newEvent = await addHealthEvent(petId, {
        type: "custom",
        templateKey: newTemplateId,
        title: templateName.trim(),
        date,
        time: time || undefined,
        nextDate: undefined,
        nextTime: undefined,
        recurrenceType,
        repeatIntervalDays: resolvedIntervalDays,
        repeatRule: resolvedRepeatRule,
        notes: notes.trim() || undefined,
        photos,
        extraFields: undefined,
        status: "planned",
        notificationIds: [],
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 4. Navigate back to pet profile
      router.navigate(`/pet/${petId}`);

      // 5. Schedule notifications in background
      requestNotificationPermissions().then(async (permitted) => {
        if (permitted && pet) {
          const notifIds = await scheduleHealthEventReminders(pet, newEvent, language);
          if (notifIds.length > 0) {
            await updateHealthEvent(petId, newEvent.id, { notificationIds: notifIds });
          }
        }
      });
    } catch (e) {
      if (__DEV__) console.error("createCustomTemplate:", e);
      Alert.alert(t.error, String(e));
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isDefaultIcon = templateIcon === DEFAULT_ICON;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Icon + Name card ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.identityRow}>
            {/* Icon selector */}
            <Pressable
              style={styles.iconWrap}
              onPress={() => {
                Haptics.selectionAsync();
                setIconPickerVisible(true);
              }}
            >
              <MaterialCommunityIcons
                name={templateIcon}
                size={32}
                color={isDefaultIcon ? Colors.textTertiary : Colors.primary}
              />
              {/* Pencil edit badge */}
              <View style={styles.iconEditBadge}>
                <MaterialCommunityIcons name="pencil" size={10} color={Colors.textLight} />
              </View>
            </Pressable>

            {/* Name input */}
            <View style={styles.nameWrap}>
              <Text style={styles.label}>
                {lang === "uk" ? "Назва події" : "Event name"}
              </Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={lang === "uk" ? "Моя власна подія..." : "My custom event..."}
                placeholderTextColor={Colors.textTertiary}
                maxLength={60}
                autoFocus
              />
            </View>
          </View>

          <Text style={styles.iconHint}>
            {lang === "uk" ? "Натисніть на іконку, щоб змінити її" : "Tap the icon to change it"}
          </Text>
        </View>

        {/* ── Date & Time card ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {lang === "uk" ? "Дата та час" : "Date & Time"}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t.eventDate ?? (lang === "uk" ? "Дата" : "Date")}</Text>
            <DatePickerField value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t.eventTime ?? (lang === "uk" ? "Час" : "Time")}</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
            />
          </View>

        </View>

        {/* ── Recurrence card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.recurrenceLabel}</Text>
          <View style={styles.recurrenceRow}>
            {(["one_time", "regular"] as RecurrenceType[]).map(rt => {
              const label = rt === "one_time" ? t.recurrenceOneTime : t.recurrenceRegular;
              const active = recurrenceType === rt;
              return (
                <Pressable
                  key={rt}
                  style={[styles.recChip, active && styles.recChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRecurrenceType(rt);
                    if (rt === "regular") setRepeatRule("");
                  }}
                >
                  <Text style={[styles.recChipText, active && styles.recChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {recurrenceType === "regular" && (
            <View style={styles.intervalRow}>
              {repeatRule !== "yearly" && (
                <>
                  <Text style={styles.intervalLabel}>{t.repeatIntervalLabel}</Text>
                  <TextInput
                    style={styles.intervalInput}
                    value={repeatN}
                    onChangeText={v => setRepeatN(v.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  {(["days", "weeks", "months"] as const).map(unit => {
                    const unitLabel = unit === "days" ? t.repeatUnitDays : unit === "weeks" ? t.repeatUnitWeeks : t.repeatUnitMonths;
                    return (
                      <Pressable
                        key={unit}
                        style={[styles.unitChip, repeatUnit === unit && styles.unitChipActive]}
                        onPress={() => { Haptics.selectionAsync(); setRepeatUnit(unit); }}
                      >
                        <Text style={[styles.unitChipText, repeatUnit === unit && styles.unitChipTextActive]}>
                          {unitLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              )}
              <Pressable
                style={[styles.unitChip, repeatRule === "yearly" && styles.unitChipActive]}
                onPress={() => { Haptics.selectionAsync(); setRepeatRule(prev => prev === "yearly" ? "" : "yearly"); }}
              >
                <Text style={[styles.unitChipText, repeatRule === "yearly" && styles.unitChipTextActive]}>
                  {lang === "uk" ? "щороку" : "yearly"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Notes card ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.notes}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t.notesPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Photos card ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{lang === "uk" ? "Фото" : "Photos"}</Text>
            <Pressable style={styles.addPhotoBtn} onPress={pickPhoto}>
              <MaterialCommunityIcons name="camera-plus-outline" size={18} color={Colors.primary} />
              <Text style={styles.addPhotoBtnText}>{lang === "uk" ? "Додати" : "Add"}</Text>
            </Pressable>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                  <Pressable
                    style={styles.photoRemove}
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <MaterialCommunityIcons name="close-circle" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Notification hint ────────────────────────────────────────────── */}
        <View style={styles.infoNote}>
          <MaterialCommunityIcons name="bell-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoNoteText}>
            {lang === "uk"
              ? "Ви отримаєте нагадування за 7, 3 та 1 день до події"
              : "You will get reminders 7, 3 and 1 day before the event"}
          </Text>
        </View>

      </ScrollView>

      {/* ── Footer save button ──────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <LinearGradient
            colors={["#E8651A", "#C45215"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            <Text style={styles.saveBtnText}>
              {saving
                ? (lang === "uk" ? "Збереження..." : "Saving...")
                : (lang === "uk" ? "Зберегти подію" : "Save Event")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Icon picker modal ───────────────────────────────────────────────── */}
      <Modal
        visible={iconPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIconPickerVisible(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setIconPickerVisible(false)}>
          <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 24 }]}>
            {/* Handle */}
            <View style={styles.pickerHandle} />

            <Text style={styles.pickerTitle}>
              {lang === "uk" ? "Оберіть іконку" : "Choose an icon"}
            </Text>

            <FlatList
              data={ICON_OPTIONS}
              keyExtractor={item => item}
              numColumns={6}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.iconGrid}
              renderItem={({ item: icon }) => {
                const active = templateIcon === icon;
                return (
                  <Pressable
                    style={[styles.iconCell, active && styles.iconCellActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTemplateIcon(icon);
                      setIconPickerVisible(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={26}
                      color={active ? Colors.primary : Colors.textSecondary}
                    />
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Identity row
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEditBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  iconHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: -4,
  },
  nameWrap: {
    flex: 1,
    gap: 6,
  },
  // Fields
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  // Recurrence
  recurrenceRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  recChip: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  recChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  recChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  recChipTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  intervalLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    width: 48,
    textAlign: "center",
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  unitChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  unitChipTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  // Photos
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "44",
    backgroundColor: Colors.primaryLight,
  },
  addPhotoBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  photosRow: {
    marginTop: 4,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
    overflow: "visible",
  },
  photoImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.surface,
    borderRadius: 9,
  },
  // Info note
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
    lineHeight: 18,
  },
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textLight,
  },
  // Header buttons
  headerBtn: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  headerBtnPrimary: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  headerBtnDisabled: {
    color: Colors.textTertiary,
  },
  // Icon picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  pickerHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  iconGrid: {
    gap: 8,
    paddingBottom: 8,
  },
  iconCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  iconCellActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
});
