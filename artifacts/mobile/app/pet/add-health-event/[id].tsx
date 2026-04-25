import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useLayoutEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { Colors } from "@/constants/colors";
import { HealthEventType, RecurrenceType, CycleSlot, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  requestNotificationPermissions,
  scheduleSeriesNotifications,
} from "@/utils/notifications";
import {
  BUILTIN_TEMPLATES,
  BuiltinTemplate,
  TemplateFieldDef,
  getHealthEventColor,
  getTemplateOrFallback,
  getSmartIntervalDefault,
  intervalLabel,
} from "@/utils/healthEvents";
import {
  defaultSlotsForCount,
  ordinalSlotName,
  SINGLE_SLOT_OPTIONS,
  slotsToStorage,
  storageToSlots,
  SlotConfig,
} from "@/utils/seriesUtils";

// ─── Interval unit options ────────────────────────────────────────────────────

const UNIT_OPTIONS: { unit: "day" | "week" | "month" | "year"; uk: string; en: string }[] = [
  { unit: "day",   uk: "днів",   en: "days"   },
  { unit: "week",  uk: "тижнів", en: "weeks"  },
  { unit: "month", uk: "міс.",   en: "months" },
  { unit: "year",  uk: "р.",     en: "years"  },
];

// ─── Resolve template ─────────────────────────────────────────────────────────

function resolveTemplate(
  templateKey: string,
  isCustom: boolean,
  customName: string,
  customIcon: string
): BuiltinTemplate {
  if (isCustom) {
    return {
      key: "custom" as HealthEventType,
      name: customName || "Власна подія",
      nameEn: customName || "Custom Event",
      icon: (customIcon || "star-circle-outline") as any,
      color: Colors.accentPurple,
      titleLabel: "Назва події",
      titleLabelEn: "Event name",
      titlePlaceholder: "Опишіть подію...",
      titlePlaceholderEn: "Describe the event...",
      extraFields: [],
    };
  }
  return getTemplateOrFallback(templateKey);
}

// ─── Field row component ──────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  onChange,
  lang,
}: {
  field: TemplateFieldDef;
  value: string;
  onChange: (v: string) => void;
  lang: "uk" | "en";
}) {
  const label = lang === "uk" ? field.label : field.labelEn;
  const placeholder = (lang === "uk" ? field.placeholder : field.placeholderEn) ?? "";
  const [showPicker, setShowPicker] = useState(false);

  if (field.type === "date") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <DatePickerField value={value} onChange={onChange} placeholder="YYYY-MM-DD" />
      </View>
    );
  }

  if (field.type === "picker" && field.options) {
    const options = lang === "uk" ? field.options : (field.optionsEn ?? field.options);
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Pressable style={[styles.input, styles.pickerInput]} onPress={() => setShowPicker(true)}>
          <Text style={[styles.pickerText, !value && { color: Colors.textTertiary }]}>
            {value || placeholder || (lang === "uk" ? "Оберіть..." : "Select...")}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.textTertiary} />
        </Pressable>
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setShowPicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              {options.map((opt, i) => {
                const storeVal = field.options![i];
                const isSelected = value === storeVal;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => { Haptics.selectionAsync(); onChange(storeVal); setShowPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>{opt}</Text>
                    {isSelected && <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  if (field.type === "multiline") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={Colors.textTertiary}
          multiline numberOfLines={3} textAlignVertical="top"
        />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

// ─── Slot editor component ────────────────────────────────────────────────────

function SlotEditor({
  slot,
  index,
  timesPerCycle,
  onChange,
  lang,
}: {
  slot: SlotConfig;
  index: number;
  timesPerCycle: number;
  onChange: (updated: SlotConfig) => void;
  lang: "uk" | "en";
}) {
  const [showNamePicker, setShowNamePicker] = useState(false);
  const nameOptions = timesPerCycle === 1 ? SINGLE_SLOT_OPTIONS : null;
  const isExactMode = slot.use_exact_time || slot.slot_name === "Точний час";

  return (
    <View style={styles.slotRow}>
      {/* Slot name */}
      {nameOptions ? (
        <>
          <Pressable
            style={styles.slotNameBtn}
            onPress={() => setShowNamePicker(true)}
          >
            <Text style={styles.slotNameText} numberOfLines={1}>
              {slot.slot_name}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={14} color={Colors.textSecondary} />
          </Pressable>
          <Modal visible={showNamePicker} transparent animationType="slide" onRequestClose={() => setShowNamePicker(false)}>
            <Pressable style={styles.pickerOverlay} onPress={() => setShowNamePicker(false)}>
              <View style={styles.pickerSheet}>
                <View style={styles.pickerHandle} />
                <Text style={styles.pickerTitle}>{lang === "uk" ? "Час доби" : "Time of day"}</Text>
                {nameOptions.map(opt => {
                  const isSelected = slot.slot_name === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        const useExact = opt === "Точний час";
                        onChange({ ...slot, slot_name: opt, use_exact_time: useExact });
                        setShowNamePicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>{opt}</Text>
                      {isSelected && <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Modal>
        </>
      ) : (
        <View style={styles.slotNameEditable}>
          <TextInput
            style={styles.slotNameInput}
            value={slot.slot_name}
            onChangeText={v => onChange({ ...slot, slot_name: v })}
            placeholder={lang === "uk" ? ordinalSlotName(index + 1) : `Slot ${index + 1}`}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      )}

      {/* Exact time toggle (for multi-slot) or auto for "Точний час" single-slot */}
      {(timesPerCycle > 1 || isExactMode) && (
        <View style={styles.slotTimeRow}>
          {timesPerCycle > 1 && (
            <View style={styles.slotExactToggle}>
              <Text style={styles.slotExactLabel}>{lang === "uk" ? "Точний час" : "Exact time"}</Text>
              <Switch
                value={slot.use_exact_time}
                onValueChange={v => onChange({ ...slot, use_exact_time: v, exact_time: v ? slot.exact_time : "" })}
                trackColor={{ true: Colors.primary }}
                thumbColor={slot.use_exact_time ? Colors.primary : Colors.border}
              />
            </View>
          )}
          {(slot.use_exact_time || isExactMode) && (
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={slot.exact_time}
              onChangeText={v => onChange({ ...slot, exact_time: v })}
              placeholder="09:00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
            />
          )}
        </View>
      )}

      {/* Reminder */}
      <View style={styles.slotReminderRow}>
        <MaterialCommunityIcons name="bell-outline" size={14} color={Colors.textTertiary} />
        <Text style={styles.slotReminderLabel}>
          {slot.use_exact_time || isExactMode
            ? (lang === "uk" ? `За ${slot.reminder_minutes} хв` : `${slot.reminder_minutes} min before`)
            : (lang === "uk" ? "О 10:00" : "At 10:00")}
        </Text>
        {(slot.use_exact_time || isExactMode) && (
          <TextInput
            style={styles.reminderInput}
            value={String(slot.reminder_minutes)}
            onChangeText={v => {
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 0) onChange({ ...slot, reminder_minutes: n });
            }}
            keyboardType="numeric"
            maxLength={3}
          />
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddHealthEventScreen() {
  const {
    id,
    templateKey: templateKeyParam,
    isCustomTemplate,
    customTemplateName,
    customTemplateIcon,
    eventId,
    eventType,
    eventTitle,
    eventDate,
    eventTime,
    eventNotes,
    eventPhotos,
    eventContactName,
    eventContactPhone,
    eventContactAddress,
    eventRecurrenceType,
    eventRepeatIntervalDays,
    eventRepeatRule,
    eventExtraFields,
    eventRepeatIntervalValue,
    eventRepeatIntervalUnit,
    eventRepeatEndDate,
    eventTimesPerCycle,
    eventCycleSlots,
    eventSeriesId,
    editScope,
  } = useLocalSearchParams<{
    id: string;
    templateKey?: string;
    isCustomTemplate?: string;
    customTemplateName?: string;
    customTemplateIcon?: string;
    eventId?: string;
    eventType?: string;
    eventTitle?: string;
    eventDate?: string;
    eventTime?: string;
    eventNotes?: string;
    eventPhotos?: string;
    eventContactName?: string;
    eventContactPhone?: string;
    eventContactAddress?: string;
    eventRecurrenceType?: string;
    eventRepeatIntervalDays?: string;
    eventRepeatRule?: string;
    eventExtraFields?: string;
    eventRepeatIntervalValue?: string;
    eventRepeatIntervalUnit?: string;
    eventRepeatEndDate?: string;
    eventTimesPerCycle?: string;
    eventCycleSlots?: string;
    eventSeriesId?: string;
    editScope?: string; // "this" | "future"
  }>();

  const { getPet, addHealthEvent, updateHealthEvent, updateSeriesScope, updatePet, upsertBirthdayEvent } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const isEditMode = !!eventId;
  const pet = getPet(id);
  const lang = language as "uk" | "en";

  // ── Template resolution ───────────────────────────────────────────────────
  const resolvedTemplateKey = templateKeyParam ?? eventType ?? "other";
  const isCustom = isCustomTemplate === "true";
  const template = useMemo<BuiltinTemplate>(() =>
    resolveTemplate(resolvedTemplateKey, isCustom, customTemplateName ?? "", customTemplateIcon ?? ""),
    [resolvedTemplateKey, isCustom, customTemplateName, customTemplateIcon]
  );

  const isBirthday = template.key === "birthday" || (isEditMode && eventType === "birthday");
  const isFamilyDay = template.key === "family_day" || (isEditMode && eventType === "family_day");
  const isYearlyFixed = isBirthday || isFamilyDay;
  const eventTypeForSave: HealthEventType = isCustom ? "custom" : (template.key as HealthEventType);

  // ── Smart defaults ────────────────────────────────────────────────────────
  const smartDefault = useMemo(() => getSmartIntervalDefault(eventTypeForSave), [eventTypeForSave]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(eventTitle || "");
  const [birthDate, setBirthDate] = useState(isBirthday ? (eventDate || pet?.birthdate || "") : "");
  const [date, setDate] = useState(eventDate || "");
  const [saving, setSaving] = useState(false);

  // Repeat toggle
  const initRepeatOn = isEditMode
    ? (eventRecurrenceType === "regular" || !!eventRepeatIntervalDays || !!eventRepeatIntervalValue)
    : (isYearlyFixed); // yearly fixed = always on but hidden
  const [repeatOn, setRepeatOn] = useState(initRepeatOn);

  // Interval
  const initIntervalValue = eventRepeatIntervalValue
    ? Number(eventRepeatIntervalValue)
    : (eventRepeatIntervalDays ? Number(eventRepeatIntervalDays) : (smartDefault?.value ?? 1));
  const initIntervalUnit = (eventRepeatIntervalUnit as "day"|"week"|"month"|"year") ??
    (eventRepeatIntervalDays ? "day" : (smartDefault?.unit ?? "month"));

  const [intervalValue, setIntervalValue] = useState(String(initIntervalValue));
  const [intervalUnit, setIntervalUnit] = useState<"day"|"week"|"month"|"year">(initIntervalUnit);
  const [repeatEndDate, setRepeatEndDate] = useState(eventRepeatEndDate || "");

  // Times per day / slots
  const initTimesPerCycle = eventTimesPerCycle ? Number(eventTimesPerCycle) : 1;
  const [timesPerCycle, setTimesPerCycle] = useState(initTimesPerCycle);

  const initSlots: SlotConfig[] = useMemo(() => {
    if (eventCycleSlots) {
      try {
        const stored = JSON.parse(eventCycleSlots);
        if (Array.isArray(stored) && stored.length > 0) return storageToSlots(stored);
      } catch {}
    }
    return defaultSlotsForCount(initTimesPerCycle);
  }, []);
  const [slots, setSlots] = useState<SlotConfig[]>(initSlots);

  const updateSlot = useCallback((index: number, updated: SlotConfig) => {
    setSlots(prev => prev.map((s, i) => i === index ? updated : s));
  }, []);

  const handleTimesChange = useCallback((newCount: number) => {
    setTimesPerCycle(newCount);
    setSlots(defaultSlotsForCount(newCount));
  }, []);

  // Extra fields
  const [extraFields, setExtraFields] = useState<Record<string, string>>(() => {
    if (eventExtraFields) { try { return JSON.parse(eventExtraFields); } catch {} }
    return {};
  });
  const setExtra = (key: string, val: string) => setExtraFields(prev => ({ ...prev, [key]: val }));

  // Notes + photos
  const [notes, setNotes] = useState(eventNotes || "");
  const [photos, setPhotos] = useState<string[]>(eventPhotos ? JSON.parse(eventPhotos) : []);

  // Details expansion
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const hasDetails = template.extraFields.length > 0 || true; // notes + photos always present

  // ── Header ────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const titleLabel = isEditMode
      ? (lang === "uk" ? "Редагувати подію" : "Edit Event")
      : (lang === "uk" ? template.name : template.nameEn);
    navigation.setOptions({
      title: titleLabel,
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary }}>{t.cancel}</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleSave} disabled={saving} style={{ marginRight: 4 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: saving ? Colors.textTertiary : Colors.primary }}>
            {t.done}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, saving, title, date, birthDate, template, notes, photos, slots, timesPerCycle,
      repeatOn, intervalValue, intervalUnit, repeatEndDate, extraFields, isEditMode, lang]);

  if (!pet) {
    return <View style={styles.notFound}><Text style={styles.notFoundText}>{t.notFound}</Text></View>;
  }

  // ── Photo picker ──────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(t.permissionTitle, t.cameraDenied); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.8,
    });
    if (!result.canceled) setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { Alert.alert(t.error, t.errorEventTitle); return; }
    if (isBirthday) {
      if (!birthDate.trim()) { Alert.alert(t.error, lang === "uk" ? "Введіть дату народження" : "Enter birth date"); return; }
    } else if (!date.trim()) { Alert.alert(t.error, t.errorEventDate); return; }

    // Offline check
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        lang === "uk" ? "Немає інтернету" : "No internet",
        lang === "uk" ? "Перевірте з'єднання та спробуйте знову" : "Check your connection and try again"
      );
      return;
    }

    setSaving(true);
    try {
      // Birthday special case
      if (isBirthday) {
        await updatePet(pet.id, { birthdate: birthDate });
        await upsertBirthdayEvent(pet.id, birthDate, title.trim() || (lang === "uk" ? "День народження" : "Birthday"));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
        return;
      }

      const resolvedIntervalValue = repeatOn ? Math.max(1, parseInt(intervalValue, 10) || 1) : undefined;
      const resolvedIntervalUnit = repeatOn ? intervalUnit : undefined;
      const resolvedRepeatRule: "yearly" | undefined = isYearlyFixed ? "yearly" : undefined;

      const cycleSlotsFinal: CycleSlot[] = slotsToStorage(slots);

      const eventPayload = {
        type: eventTypeForSave,
        title: title.trim(),
        date,
        recurrenceType: (repeatOn ? "regular" : "one_time") as RecurrenceType,
        repeatIntervalValue: resolvedIntervalValue,
        repeatIntervalUnit: resolvedIntervalUnit,
        repeatEndDate: repeatEndDate || undefined,
        repeatRule: resolvedRepeatRule,
        timesPerCycle,
        cycleSlots: cycleSlotsFinal,
        notes: notes.trim() || undefined,
        photos,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
        templateKey: isCustom ? (templateKeyParam ?? undefined) : (resolvedTemplateKey !== "other" ? resolvedTemplateKey : undefined),
      };

      if (isEditMode) {
        const scope = (editScope === "future" ? "future" : "this") as "this" | "future";
        if (eventSeriesId) {
          await updateSeriesScope(pet.id, eventId!, eventPayload, scope);
        } else {
          await updateHealthEvent(pet.id, eventId!, eventPayload);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        const newEvent = await addHealthEvent(pet.id, {
          ...eventPayload,
          status: "planned",
          notificationIds: [],
          seriesId: undefined, // addHealthEvent generates its own seriesId
          isCurrent: true,
          isModified: false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();

        // Schedule notifications in background
        requestNotificationPermissions().then(async (permitted) => {
          if (!permitted) return;
          await scheduleSeriesNotifications(pet, newEvent, language as "uk" | "en", 3);
        });
      }
    } catch (e) {
      if (__DEV__) console.error("addHealthEvent:", e);
      Alert.alert(t.error, String(e));
    } finally {
      setSaving(false);
    }
  };

  const accentColor = isCustom ? Colors.accentPurple : getHealthEventColor(eventTypeForSave);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* ── Template header ─────────────────────────────────────────────── */}
        <View style={[styles.templateBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "44" }]}>
          <MaterialCommunityIcons name={template.icon} size={20} color={accentColor} />
          <Text style={[styles.templateBadgeText, { color: accentColor }]}>
            {lang === "uk" ? template.name : template.nameEn}
          </Text>
        </View>

        {/* ── Main card: title + date ──────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>{lang === "uk" ? template.titleLabel : template.titleLabelEn}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={lang === "uk" ? template.titlePlaceholder : template.titlePlaceholderEn}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* Date */}
          {isBirthday ? (
            <View style={styles.field}>
              <Text style={styles.label}>{lang === "uk" ? "Дата народження" : "Date of birth"}</Text>
              <DatePickerField value={birthDate} onChange={setBirthDate} placeholder="YYYY-MM-DD" maximumDate={new Date()} />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>{t.eventDate}</Text>
              <DatePickerField value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
            </View>
          )}
        </View>

        {/* ── Repeat section ───────────────────────────────────────────────── */}
        {!isBirthday && !isFamilyDay && (
          <View style={styles.card}>
            <View style={styles.repeatHeaderRow}>
              <Text style={styles.cardTitle}>{lang === "uk" ? "Повторювати" : "Repeat"}</Text>
              <Switch
                value={repeatOn}
                onValueChange={v => { Haptics.selectionAsync(); setRepeatOn(v); }}
                trackColor={{ true: Colors.primary }}
                thumbColor={repeatOn ? Colors.primary : Colors.border}
              />
            </View>

            {repeatOn && (
              <>
                {/* Interval picker */}
                <View style={styles.intervalRow}>
                  <Text style={styles.intervalLabel}>{lang === "uk" ? "Кожні" : "Every"}</Text>
                  <TextInput
                    style={styles.intervalInput}
                    value={intervalValue}
                    onChangeText={v => setIntervalValue(v.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <View style={styles.unitRow}>
                    {UNIT_OPTIONS.map(u => (
                      <Pressable
                        key={u.unit}
                        style={[styles.unitChip, intervalUnit === u.unit && styles.unitChipActive]}
                        onPress={() => { Haptics.selectionAsync(); setIntervalUnit(u.unit); }}
                      >
                        <Text style={[styles.unitChipText, intervalUnit === u.unit && styles.unitChipTextActive]}>
                          {lang === "uk" ? u.uk : u.en}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Smart default hint */}
                {smartDefault && (
                  <Pressable
                    style={styles.defaultHint}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIntervalValue(String(smartDefault.value));
                      setIntervalUnit(smartDefault.unit);
                    }}
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.primary} />
                    <Text style={styles.defaultHintText}>
                      {lang === "uk"
                        ? `Рекомендовано: ${intervalLabel(smartDefault.value, smartDefault.unit, "uk")} — натисніть щоб застосувати`
                        : `Recommended: ${intervalLabel(smartDefault.value, smartDefault.unit, "en")} — tap to apply`}
                    </Text>
                  </Pressable>
                )}

                {/* Repeat until */}
                <View style={styles.field}>
                  <Text style={styles.label}>{lang === "uk" ? "Повторювати до:" : "Repeat until:"}</Text>
                  <DatePickerField
                    value={repeatEndDate}
                    onChange={setRepeatEndDate}
                    placeholder={lang === "uk" ? "Без кінця" : "No end date"}
                  />
                  {!!repeatEndDate && (
                    <Pressable onPress={() => setRepeatEndDate("")} style={styles.clearBtn}>
                      <Text style={styles.clearBtnText}>{lang === "uk" ? "Очистити (без кінця)" : "Clear (no end)"}</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Times per day + slots ────────────────────────────────────────── */}
        {!isBirthday && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{lang === "uk" ? "Раз на день" : "Times per day"}</Text>
            <View style={styles.timesRow}>
              {[1, 2, 3, 4].map(n => (
                <Pressable
                  key={n}
                  style={[styles.timesChip, timesPerCycle === n && styles.timesChipActive]}
                  onPress={() => { Haptics.selectionAsync(); handleTimesChange(n); }}
                >
                  <Text style={[styles.timesChipText, timesPerCycle === n && styles.timesChipTextActive]}>
                    {n === 4 ? "4+" : String(n)}
                  </Text>
                </Pressable>
              ))}
              {timesPerCycle > 4 && (
                <View style={styles.timesCountRow}>
                  <Pressable
                    style={styles.timesStepBtn}
                    onPress={() => { if (timesPerCycle > 1) handleTimesChange(timesPerCycle - 1); }}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={Colors.primary} />
                  </Pressable>
                  <Text style={styles.timesCountText}>{timesPerCycle}</Text>
                  <Pressable style={styles.timesStepBtn} onPress={() => handleTimesChange(timesPerCycle + 1)}>
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              )}
              {timesPerCycle >= 4 && (
                <Pressable style={styles.timesStepBtn} onPress={() => handleTimesChange(timesPerCycle + 1)}>
                  <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                </Pressable>
              )}
            </View>

            {/* Slot editors */}
            {slots.map((slot, i) => (
              <SlotEditor
                key={i}
                slot={slot}
                index={i}
                timesPerCycle={timesPerCycle}
                onChange={updated => updateSlot(i, updated)}
                lang={lang}
              />
            ))}
          </View>
        )}

        {/* ── Details (expandable) ─────────────────────────────────────────── */}
        <Pressable
          style={styles.detailsToggle}
          onPress={() => { Haptics.selectionAsync(); setDetailsExpanded(v => !v); }}
        >
          <MaterialCommunityIcons
            name={detailsExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.primary}
          />
          <Text style={styles.detailsToggleText}>
            {lang === "uk" ? "Деталі" : "Details"}
          </Text>
        </Pressable>

        {detailsExpanded && (
          <View style={styles.card}>
            {/* Template extra fields */}
            {template.extraFields.length > 0 && template.extraFields.map(field => (
              <FieldRow
                key={field.key}
                field={field}
                value={extraFields[field.key] ?? ""}
                onChange={val => setExtra(field.key, val)}
                lang={lang}
              />
            ))}

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>{t.notes}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={notes} onChangeText={setNotes}
                placeholder={t.notesPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                multiline numberOfLines={4} textAlignVertical="top"
              />
            </View>

            {/* Photos */}
            <View style={styles.field}>
              <View style={styles.cardHeader}>
                <Text style={styles.label}>{lang === "uk" ? "Фото" : "Photos"}</Text>
                <Pressable style={styles.addPhotoBtn} onPress={pickPhoto}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={16} color={Colors.primary} />
                  <Text style={styles.addPhotoBtnText}>{lang === "uk" ? "Додати" : "Add"}</Text>
                </Pressable>
              </View>
              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {photos.map((uri, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                      <Pressable style={styles.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={Colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* ── Save button ──────────────────────────────────────────────────── */}
        <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>
              {saving ? t.savingHealthEvent : isEditMode ? (lang === "uk" ? "Зберегти зміни" : "Save Changes") : t.saveHealthEvent}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  scroll: { padding: 16, gap: 14 },
  templateBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  templateBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
  },
  multilineInput: { minHeight: 80, paddingTop: 10, textAlignVertical: "top" },
  timeInput: { width: 90, textAlign: "center" },
  pickerInput: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, flex: 1 },

  // Repeat
  repeatHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intervalRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  intervalLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  intervalInput: {
    width: 56, height: 38, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, textAlign: "center",
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text,
  },
  unitRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  unitChip: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  unitChipActive: { backgroundColor: Colors.primary + "18", borderColor: Colors.primary },
  unitChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  unitChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  defaultHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  defaultHintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.primary },
  clearBtn: { alignSelf: "flex-start", marginTop: 4 },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textDecorationLine: "underline" },

  // Times per day
  timesRow: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  timesChip: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    borderColor: Colors.border, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  timesChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timesChipText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  timesChipTextActive: { color: "#fff" },
  timesCountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timesCountText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, minWidth: 28, textAlign: "center" },
  timesStepBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.primary, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },

  // Slot editor
  slotRow: {
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12,
    padding: 12, gap: 8, backgroundColor: Colors.background,
  },
  slotNameBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  slotNameText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  slotNameEditable: { flex: 1 },
  slotNameInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14,
    fontFamily: "Inter_500Medium", color: Colors.text, backgroundColor: Colors.surface,
  },
  slotTimeRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  slotExactToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  slotExactLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  slotReminderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  slotReminderLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, flex: 1 },
  reminderInput: {
    width: 48, height: 30, borderRadius: 6, borderWidth: 1,
    borderColor: Colors.border, textAlign: "center", fontSize: 13,
    fontFamily: "Inter_500Medium", color: Colors.text, backgroundColor: Colors.surface,
  },

  // Details toggle
  detailsToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  detailsToggleText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },

  // Photos
  addPhotoBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary + "33",
  },
  addPhotoBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  photoThumb: { position: "relative", marginRight: 8, width: 80, height: 80, borderRadius: 10, overflow: "visible" },
  photoImg: { width: 80, height: 80, borderRadius: 10 },
  photoRemove: { position: "absolute", top: -6, right: -6, zIndex: 10, backgroundColor: Colors.surface, borderRadius: 9 },

  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32,
  },
  pickerTitle: {
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text,
    textAlign: "center", marginBottom: 8,
  },
  pickerHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 12 },
  pickerOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  pickerOptionSelected: {},
  pickerOptionText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerOptionTextSelected: { fontFamily: "Inter_600SemiBold", color: Colors.primary },

  // Save button
  saveBtn: { borderRadius: 14, overflow: "hidden" },
  saveBtnGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
});
