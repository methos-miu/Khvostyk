import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { HealthEvent, HealthEventStatus, HealthEventType, Pet, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { cancelHealthEventNotifications, refreshAllEventNotifications } from "@/utils/notifications";
import { formatDateShort, parseDate } from "@/utils/notifications";
import { getAnimalEmoji } from "@/constants/animals";
import { getHealthEventIcon, getHealthEventColor, getTemplateByKey } from "@/utils/healthEvents";
import {
  computeEventStatusV2,
  isToday,
  getTodayStr,
  addInterval,
  getSeriesInterval,
  getDisplayEvents,
  getNextOccurrenceAfter,
} from "@/utils/seriesUtils";

export { getHealthEventIcon, getHealthEventColor };

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ─── Status square button ─────────────────────────────────────────────────────

function StatusSquare({
  status,
  date,
  onPress,
}: {
  status: HealthEventStatus;
  date: string;
  onPress: () => void;
}) {
  const today = isToday(date);

  let bg: string;
  let icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  let color: string;

  if (status === "done") {
    bg = Colors.accentGreen + "20";
    icon = "checkbox-marked";
    color = Colors.accentGreen;
  } else if (status === "overdue") {
    bg = Colors.danger + "20";
    icon = "close-box";
    color = Colors.danger;
  } else if (today) {
    bg = "#FF8C0020";
    icon = "checkbox-blank-outline";
    color = "#FF8C00";
  } else {
    bg = Colors.textTertiary + "20";
    icon = "checkbox-blank-outline";
    color = Colors.textTertiary;
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.statusSquare, { backgroundColor: bg }]}
      hitSlop={8}
    >
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </Pressable>
  );
}

// ─── Multi-slot progress badge ────────────────────────────────────────────────

function SlotProgress({ event }: { event: HealthEvent }) {
  if (!event.cycleSlots || event.cycleSlots.length <= 1) return null;
  const total = event.cycleSlots.length;
  const done = event.cycleSlots.filter(s => !!s.completed_at).length;
  return (
    <View style={styles.slotProgress}>
      <Text style={styles.slotProgressText}>{done}/{total} ✓</Text>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EventWithPet = { event: HealthEvent; pet: Pet };
type TimeFilter = "" | "past" | "future";

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HealthEventsScreen() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const {
    pets,
    updateHealthEvent,
    deleteHealthEvent,
    deleteSeriesScope,
    completeHealthEvent,
    markDoneAndAdvance,
    shiftSeriesAnchor,
    checkAndUpdateEventStatuses,
    addExceptionRecord,
  } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const lang = language as "uk" | "en";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [petFilter, setPetFilter] = useState<string>(petId ?? "");
  const [typeFilter, setTypeFilter] = useState<HealthEventType | "">("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("");
  const [activeDropdown, setActiveDropdown] = useState<"pet" | "type" | "time" | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");

  // Refresh on mount
  useEffect(() => {
    const l = lang;
    refreshAllEventNotifications(pets, l).catch(() => {});
  }, []);

  const today = getTodayStr();

  // ── Build flat event list — real records only (no virtual occurrences)
  const allItems = useMemo<EventWithPet[]>(() => {
    const items: EventWithPet[] = [];
    const today = getTodayStr();
    pets.forEach(pet => {
      if (petFilter && pet.id !== petFilter) return;
      (pet.healthEvents ?? []).forEach(event => {
        if (event.isVirtual) return;
        if (typeFilter && event.type !== typeFilter) return;
        const isPast = (event.status === 'done' || event.status === 'overdue') && event.isCurrent !== true;
        const isRule = event.isCurrent === true && event.status !== 'done' && event.status !== 'cancelled';
        if (timeFilter === 'past' && !isPast) return;
        if (timeFilter === 'future' && !isRule) return;
        items.push({ event, pet });
      });
    });
    return items.sort((a, b) => b.event.date.localeCompare(a.event.date));
  }, [pets, petFilter, typeFilter, timeFilter]);

  // ── Completion handler ────────────────────────────────────────────────────
  const handleComplete = useCallback(async (event: HealthEvent, petId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert(
        lang === "uk" ? "Немає інтернету" : "No internet",
        lang === "uk" ? "Позначити виконаним можна тільки з інтернет-з'єднанням" : "Completion requires an internet connection"
      );
      return;
    }

    // Virtual future event on timeline: create exception record
    if (event.isVirtual) {
      await completeHealthEvent(petId, event.id);
      setExpandedId(null);
      return;
    }

    // One-time event: just complete it
    if (event.recurrenceType === "one_time") {
      await completeHealthEvent(petId, event.id);
      setExpandedId(null);
      return;
    }

    // Past record (overdue): just mark done, no new rule needed
    if (event.isCurrent !== true) {
      await completeHealthEvent(petId, event.id);
      setExpandedId(null);
      return;
    }

    // Rule record (isCurrent=true): compute next date and advance
    const interval = getSeriesInterval(event);
    if (!interval) {
      await completeHealthEvent(petId, event.id);
      setExpandedId(null);
      return;
    }

    let nextDate: string | undefined;
    if (event.rrule) {
      nextDate = getNextOccurrenceAfter(event.rrule, event.date);
    } else {
      nextDate = addInterval(event.date, interval.value, interval.unit);
    }
    if (event.repeatEndDate && nextDate && nextDate > event.repeatEndDate) {
      nextDate = undefined;
    }

    if (!nextDate) {
      await completeHealthEvent(petId, event.id);
      setExpandedId(null);
      return;
    }

    // Atomically mark done and create next rule record
    await markDoneAndAdvance(petId, event.id, nextDate);
    setExpandedId(null);
  }, [completeHealthEvent, markDoneAndAdvance, lang]);

  const handleShiftDialog = useCallback(async (event: HealthEvent, petId: string, modifiedFutureCount: number) => {
    const interval = getSeriesInterval(event);
    if (!interval) return;
    const newNextDate = addInterval(today, interval.value, interval.unit);
    const seriesId = event.seriesId ?? event.id;

    if (modifiedFutureCount === 0) {
      await shiftSeriesAnchor(petId, seriesId, newNextDate, false);
      setExpandedId(null);
      return;
    }

    const countStr = String(modifiedFutureCount);
    const single = modifiedFutureCount === 1;

    Alert.alert(
      lang === "uk"
        ? (single ? "Одна з подій має змінену дату" : `${countStr} подій мають змінені дати`)
        : (single ? "One event has a modified date" : `${countStr} events have modified dates`),
      lang === "uk" ? "Що робити з нею?" : "What to do with them?",
      [
        {
          text: lang === "uk" ? (single ? "Посунути" : "Посунути всі") : (single ? "Shift" : "Shift all"),
          onPress: async () => { await shiftSeriesAnchor(petId, seriesId, newNextDate, true); setExpandedId(null); },
        },
        {
          text: lang === "uk" ? (single ? "Лишити" : "Лишити всі") : (single ? "Keep" : "Keep all"),
          onPress: async () => { await shiftSeriesAnchor(petId, seriesId, newNextDate, false); setExpandedId(null); },
        },
        { text: lang === "uk" ? "Назад" : "Back", style: "cancel" },
      ]
    );
  }, [shiftSeriesAnchor, today, lang]);

  const handleUndoComplete = useCallback((event: HealthEvent, petId: string) => {
    Alert.alert(
      lang === "uk" ? "Скасувати виконання?" : "Undo completion?",
      "",
      [
        { text: lang === "uk" ? "Ні" : "No", style: "cancel" },
        {
          text: lang === "uk" ? "Так" : "Yes",
          onPress: async () => {
            await updateHealthEvent(petId, event.id, { status: "planned", isCurrent: true });
          },
        },
      ]
    );
  }, [updateHealthEvent, lang]);

  const handleCompleteSlot = useCallback(async (event: HealthEvent, petId: string, slotIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert(
        lang === "uk" ? "Немає інтернету" : "No internet",
        lang === "uk" ? "Позначити виконаним можна тільки з інтернет-з'єднанням" : "Completion requires an internet connection"
      );
      return;
    }

    // Virtual future event: create exception record with updated slot
    if (event.isVirtual) {
      const updatedSlots = (event.cycleSlots ?? []).map((slot, i) =>
        i === slotIndex
          ? { ...slot, completed_at: new Date().toISOString(), completed_by: 'user' }
          : slot
      );
      const allDone = updatedSlots.every(s => !!s.completed_at);
      const newStatus: HealthEventStatus = allDone ? 'done' :
        computeEventStatusV2({ status: 'planned', date: event.date, type: event.type, cycleSlots: updatedSlots, time: event.time });
      const exceptionEvent: HealthEvent = {
        ...event,
        id: generateId(),
        isVirtual: undefined,
        isCurrent: false,
        isModified: true,
        recurrenceId: event.date,
        rrule: undefined,
        status: newStatus,
        cycleSlots: updatedSlots,
        createdAt: new Date().toISOString(),
      };
      await addExceptionRecord(petId, exceptionEvent);
      return;
    }

    const slots = event.cycleSlots ?? [];
    const slot = slots[slotIndex];
    if (!slot) return;

    const updatedSlots = slots.map((s, i) =>
      i === slotIndex
        ? s.completed_at
          ? { ...s, completed_at: undefined, completed_by: undefined }
          : { ...s, completed_at: new Date().toISOString(), completed_by: undefined }
        : s
    );

    const allDone = updatedSlots.every(s => !!s.completed_at);
    const newStatus: HealthEventStatus = allDone
      ? 'done'
      : computeEventStatusV2({ status: 'planned', date: event.date, type: event.type, cycleSlots: updatedSlots, time: event.time });

    if (allDone && event.isCurrent === true && event.recurrenceType === 'regular') {
      // Rule record fully completed — markDoneAndAdvance handles done + new rule atomically
      let nextDate: string | undefined;
      if (event.rrule) {
        nextDate = getNextOccurrenceAfter(event.rrule, event.date);
      } else {
        const interval = getSeriesInterval(event);
        if (interval) nextDate = addInterval(event.date, interval.value, interval.unit);
      }
      if (event.repeatEndDate && nextDate && nextDate > event.repeatEndDate) nextDate = undefined;
      if (nextDate) {
        // Save completed slots on current record first
        await updateHealthEvent(petId, event.id, { cycleSlots: updatedSlots });
        // Then atomically mark done and create new rule
        await markDoneAndAdvance(petId, event.id, nextDate);
      } else {
        // Series ended — just mark done
        await updateHealthEvent(petId, event.id, { cycleSlots: updatedSlots, status: 'done', isCurrent: false });
      }
    } else {
      // Past record (isCurrent=false) OR partial completion — just update this record only
      // NEVER call markDoneAndAdvance for past records
      await updateHealthEvent(petId, event.id, { cycleSlots: updatedSlots, status: newStatus });
    }
  }, [updateHealthEvent, addExceptionRecord, markDoneAndAdvance, lang]);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = useCallback((event: HealthEvent, petId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isRegular = event.recurrenceType === "regular";

    const doDelete = async (scope: "this" | "future") => {
      if (event.isVirtual) {
        if (scope === "this") {
          // Insert a cancelled exception so future generation skips this date
          const cancelledEvent: HealthEvent = {
            ...event,
            id: generateId(),
            isVirtual: undefined,
            isCurrent: false,
            isModified: true,
            recurrenceId: event.date,
            rrule: undefined,
            status: "cancelled",
            createdAt: new Date().toISOString(),
          };
          await addExceptionRecord(petId, cancelledEvent);
        } else {
          // Truncate the series at the day before this occurrence
          const seriesId = event.seriesId;
          const currentPet = pets.find(p => p.id === petId);
          const anchor = currentPet?.healthEvents?.find(e => e.seriesId === seriesId && e.isCurrent === true);
          if (anchor) {
            const dayBefore = addInterval(event.date, -1, "day");
            await updateHealthEvent(petId, anchor.id, { repeatEndDate: dayBefore });
          }
        }
        if (expandedId === event.id) setExpandedId(null);
        return;
      }

      if (event.notificationIds?.length) {
        await cancelHealthEventNotifications(event.notificationIds);
      }
      if (isRegular && event.seriesId) {
        await deleteSeriesScope(petId, event.id, scope);
      } else {
        await deleteHealthEvent(petId, event.id);
      }
      if (expandedId === event.id) setExpandedId(null);
    };

    if (!isRegular) {
      Alert.alert(t.deleteHealthEvent, t.deleteHealthEventConfirm, [
        { text: t.cancel, style: "cancel" },
        { text: t.delete, style: "destructive", onPress: () => doDelete("this") },
      ]);
      return;
    }

    Alert.alert(
      lang === "uk" ? "Видалити подію" : "Delete event",
      "",
      [
        { text: lang === "uk" ? "Лише цю" : "Only this", onPress: () => doDelete("this") },
        { text: lang === "uk" ? "Всі майбутні" : "All future", style: "destructive", onPress: () => doDelete("future") },
        { text: t.cancel, style: "cancel" },
      ]
    );
  }, [deleteHealthEvent, deleteSeriesScope, updateHealthEvent, addExceptionRecord, pets, expandedId, lang, t]);

  // ── Edit handler ──────────────────────────────────────────────────────────
  const handleEdit = useCallback((event: HealthEvent, petId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isRegular = event.recurrenceType === "regular" && !!event.seriesId;

    const doEdit = (scope: "this" | "future") => {
      router.push({
        pathname: "/pet/add-health-event/[id]",
        params: {
          id: petId,
          templateKey: event.templateKey ?? event.type,
          eventId: event.id,
          eventType: event.type,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time ?? "",
          eventNotes: event.notes ?? "",
          eventPhotos: event.photos?.length ? JSON.stringify(event.photos) : "",
          eventRecurrenceType: event.recurrenceType,
          eventRepeatIntervalValue: event.repeatIntervalValue ? String(event.repeatIntervalValue) : "",
          eventRepeatIntervalUnit: event.repeatIntervalUnit ?? "",
          eventRepeatEndDate: event.repeatEndDate ?? "",
          eventTimesPerCycle: String(event.timesPerCycle ?? 1),
          eventCycleSlots: event.cycleSlots?.length ? JSON.stringify(event.cycleSlots) : "",
          eventSeriesId: event.seriesId ?? "",
          eventRrule: event.rrule ?? "",
          editScope: scope,
          eventExtraFields: event.extraFields && Object.keys(event.extraFields).length > 0
            ? JSON.stringify(event.extraFields) : "",
        },
      });
    };

    if (!isRegular) { doEdit("this"); return; }

    Alert.alert(
      lang === "uk" ? "Редагувати подію" : "Edit event",
      "",
      [
        { text: lang === "uk" ? "Лише цю" : "Only this", onPress: () => doEdit("this") },
        { text: lang === "uk" ? "Всі майбутні" : "All future", onPress: () => doEdit("future") },
        { text: t.cancel, style: "cancel" },
      ]
    );
  }, [lang, t]);

  const openAddEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pets.length === 0) return;
    if (petFilter) { router.push({ pathname: "/pet/select-event-template/[id]", params: { id: petFilter } }); return; }
    if (pets.length === 1) { router.push({ pathname: "/pet/select-event-template/[id]", params: { id: pets[0].id } }); return; }
    setSelectedPetId(pets[0]?.id ?? "");
    setShowPetPicker(true);
  };

  const typeLabel = (type: HealthEventType) => {
    const key = `he_${type}` as keyof typeof t;
    return (t[key] as string) ?? type;
  };

  const timeLabel = (f: TimeFilter) => {
    if (f === "past") return lang === "uk" ? "Минулі" : "Past";
    if (f === "future") return lang === "uk" ? "Майбутні" : "Upcoming";
    return lang === "uk" ? "Всі події" : "All Events";
  };

  // ── Event card ────────────────────────────────────────────────────────────
  const renderEvent = ({ event, pet }: EventWithPet) => {
    const color = getHealthEventColor(event.type);
    const icon = getHealthEventIcon(event.type);
    const isExpanded = expandedId === event.id;
    const isMultiSlot = (event.cycleSlots?.length ?? 0) > 1;

    const statusForSquare: HealthEventStatus = (() => {
      if (isMultiSlot) {
        const doneCount = event.cycleSlots!.filter(s => !!s.completed_at).length;
        if (doneCount === event.cycleSlots!.length) return "done";
        const baseStatus = computeEventStatusV2({ status: "planned", date: event.date, type: event.type, cycleSlots: event.cycleSlots, time: event.time });
        return baseStatus === "overdue" ? "overdue" : "planned";
      }
      return computeEventStatusV2({ status: event.status, date: event.date, type: event.type, cycleSlots: event.cycleSlots, time: event.time });
    })();

    const isDone = statusForSquare === "done";

    return (
      <Pressable
        key={event.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpandedId(isExpanded ? null : event.id);
        }}
        style={[styles.eventCard, isToday(event.date) && styles.eventCardToday]}
      >
        {/* Collapsed row */}
        <View style={styles.cardRow}>
          {/* Pet avatar */}
          <View style={styles.petAvatar}>
            {pet.photoUri ? (
              <Image source={{ uri: pet.photoUri }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
            ) : (
              <Text style={styles.petAvatarEmoji}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
            )}
          </View>

          <View style={styles.eventInfo}>
            <View style={styles.eventMetaRow}>
              <Text style={styles.petName} numberOfLines={1}>{pet.name}</Text>
              <View style={[styles.typeIconWrap, { backgroundColor: color + "22" }]}>
                <MaterialCommunityIcons name={icon} size={13} color={color} />
              </View>
              <Text style={[styles.typeBadgeText, { color }]} numberOfLines={1}>{typeLabel(event.type)}</Text>
            </View>
            <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
            <View style={styles.eventDateRow}>
              <Text style={[styles.eventDate, isToday(event.date) && styles.eventDateToday]}>
                {isToday(event.date) ? (lang === "uk" ? "Сьогодні" : "Today") : formatDateShort(event.date)}
              </Text>
              {event.cycleSlots && event.cycleSlots.length > 0 && (
                <Text style={styles.slotHint}>
                  {event.cycleSlots.map(s => s.exact_time ? s.exact_time : s.slot_name).join(", ")}
                </Text>
              )}
            </View>
            <SlotProgress event={event} />
          </View>

          <View style={styles.eventRight}>
            {isMultiSlot ? (
              <View pointerEvents="none">
                <StatusSquare status={statusForSquare} date={event.date} onPress={() => {}} />
              </View>
            ) : (
              <StatusSquare
                status={statusForSquare}
                date={event.date}
                onPress={() => {
                  if (isDone) {
                    handleUndoComplete(event, pet.id);
                  } else {
                    handleComplete(event, pet.id);
                  }
                }}
              />
            )}
            <MaterialCommunityIcons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Colors.textTertiary}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>

        {/* Expanded section */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedDivider} />

            {/* Date */}
            <View style={styles.expandedRow}>
              <MaterialCommunityIcons name="calendar-outline" size={15} color={Colors.primary} />
              <Text style={styles.expandedLabel}>{t.eventDate}</Text>
              <Text style={styles.expandedValue}>{formatDateShort(event.date)}</Text>
            </View>

            {/* Slots details */}
            {event.cycleSlots && event.cycleSlots.length > 0 && event.cycleSlots.map((slot, i) => {
              if (!isMultiSlot) {
                return (
                  <View key={i} style={styles.expandedRow}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color={Colors.primary} />
                    <Text style={styles.expandedLabel}>{slot.slot_name}</Text>
                    <Text style={styles.expandedValue}>
                      {slot.exact_time ?? (lang === "uk" ? "Без точного часу" : "No exact time")}
                      {slot.completed_at ? " ✓" : ""}
                    </Text>
                  </View>
                );
              }
              const slotDone = !!slot.completed_at;
              const slotStatus: HealthEventStatus = slotDone ? "done" : statusForSquare === "overdue" ? "overdue" : "planned";
              return (
                <View key={i} style={[styles.expandedRow, { alignItems: "center" }]}>
                  <MaterialCommunityIcons name="clock-outline" size={15} color={Colors.primary} />
                  <Text style={[styles.expandedLabel, { color: slotDone ? Colors.textTertiary : Colors.text }]}>{slot.slot_name}</Text>
                  <Text style={[styles.expandedValue, { color: slotDone ? Colors.textTertiary : Colors.text }]}>
                    {slot.exact_time ?? (lang === "uk" ? "Без точного часу" : "No exact time")}
                  </Text>
                  <StatusSquare status={slotStatus} date={event.date} onPress={() => handleCompleteSlot(event, pet.id, i)} />
                </View>
              );
            })}

            {/* Notes */}
            {event.notes ? (
              <View style={[styles.expandedRow, { alignItems: "flex-start" }]}>
                <MaterialCommunityIcons name="note-text-outline" size={15} color={Colors.primary} style={{ marginTop: 1 }} />
                <Text style={styles.expandedLabel}>{t.notes}</Text>
                <Text style={[styles.expandedValue, { flex: 2 }]}>{event.notes}</Text>
              </View>
            ) : null}

            {/* Extra fields */}
            {event.extraFields && Object.keys(event.extraFields).length > 0 && (() => {
              const tmpl = getTemplateByKey(event.templateKey ?? event.type);
              return Object.entries(event.extraFields).map(([key, val]) => {
                if (!val) return null;
                const fieldDef = tmpl?.extraFields.find(f => f.key === key);
                const label = fieldDef ? (lang === "uk" ? fieldDef.label : fieldDef.labelEn) : key;
                return (
                  <View key={key} style={[styles.expandedRow, { alignItems: "flex-start" }]}>
                    <MaterialCommunityIcons name="information-outline" size={15} color={Colors.primary} style={{ marginTop: 1 }} />
                    <Text style={styles.expandedLabel}>{label}</Text>
                    <Text style={[styles.expandedValue, { flex: 2 }]}>{val}</Text>
                  </View>
                );
              });
            })()}

            {/* Contact */}
            {(event.contactName || event.contactPhone || event.contactAddress) && (
              <View style={styles.contactSection}>
                {event.contactPhone && (
                  <ScrollView horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} style={styles.contactBtnsRow}>
                    <Pressable onPress={() => Linking.openURL(`tel:${event.contactPhone}`)} style={styles.contactBtn}>
                      <MaterialCommunityIcons name="phone" size={14} color={Colors.primary} />
                      <Text style={[styles.contactBtnText, { color: Colors.primary }]}>{t.callBtn}</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(`viber://chat?number=${event.contactPhone}`)} style={[styles.contactBtn, { backgroundColor: "#EDE9FF" }]}>
                      <MaterialCommunityIcons name="phone-classic" size={14} color="#7360F2" />
                      <Text style={[styles.contactBtnText, { color: "#7360F2" }]}>{t.viberBtn}</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(`https://t.me/${event.contactPhone}`)} style={[styles.contactBtn, { backgroundColor: "#E3F4FD" }]}>
                      <MaterialCommunityIcons name="send" size={14} color="#229ED9" />
                      <Text style={[styles.contactBtnText, { color: "#229ED9" }]}>{t.telegramBtn}</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(`whatsapp://send?phone=${event.contactPhone}`)} style={[styles.contactBtn, { backgroundColor: "#E8F8EF" }]}>
                      <MaterialCommunityIcons name="whatsapp" size={14} color="#25D366" />
                      <Text style={[styles.contactBtnText, { color: "#25D366" }]}>{t.whatsappBtn}</Text>
                    </Pressable>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Photos */}
            {(event.photos?.length ?? 0) > 0 && (
              <ScrollView horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} style={styles.photosRow} contentContainerStyle={{ gap: 8 }}>
                {event.photos!.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                ))}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.expandedActions}>
              <Pressable
                onPress={() => { handleEdit(event, pet.id); }}
                style={[styles.expandedActionBtn, { backgroundColor: "#EEF2FF" }]}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.primary} />
                <Text style={[styles.expandedActionText, { color: Colors.primary }]}>
                  {lang === "uk" ? "Редагувати" : "Edit"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { handleDelete(event, pet.id); }}
                style={[styles.expandedActionBtn, { backgroundColor: "#FFF0F0" }]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.danger} />
                <Text style={[styles.expandedActionText, { color: Colors.danger }]}>{t.delete}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const hasAnyEvents = allItems.length > 0;

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={[styles.header, { paddingTop: topInset + 12 }]}
        >
          <View style={styles.headerNavRow}>
            {petId ? (
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBackBtn}>
                <MaterialCommunityIcons name="arrow-left" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerBackText}>{lang === "uk" ? "Назад" : "Back"}</Text>
              </Pressable>
            ) : <View style={styles.headerSideSlot} />}
            <Text style={styles.headerTitle}>{lang === "uk" ? "Події" : "Events"}</Text>
            {pets.length > 0 ? (
              <Pressable onPress={openAddEvent} style={[styles.headerSideSlot, { alignItems: "flex-end" }]}>
                <View style={styles.headerAddBtnInner}>
                  <MaterialCommunityIcons name="plus" size={28} color={Colors.textLight} />
                </View>
              </Pressable>
            ) : <View style={styles.headerSideSlot} />}
          </View>
        </LinearGradient>

        {/* Three filter pills */}
        <View
          style={styles.filterRow}
          onLayout={e => setDropdownTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
          {/* Pet filter */}
          <Pressable
            style={[styles.filterPill, petFilter !== "" && styles.filterPillActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveDropdown(activeDropdown === "pet" ? null : "pet"); }}
          >
            <Text style={[styles.filterText, petFilter !== "" && styles.filterTextActive]} numberOfLines={1}>
              {petFilter ? (pets.find(p => p.id === petFilter)?.name ?? (lang === "uk" ? "Всі тварини" : "All Pets")) : (lang === "uk" ? "Всі тварини" : "All Pets")}
            </Text>
            <MaterialCommunityIcons name={activeDropdown === "pet" ? "chevron-up" : "chevron-down"} size={14} color={petFilter !== "" ? Colors.primary : Colors.textSecondary} />
          </Pressable>

          {/* Type filter */}
          <Pressable
            style={[styles.filterPill, typeFilter !== "" && styles.filterPillActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveDropdown(activeDropdown === "type" ? null : "type"); }}
          >
            <Text style={[styles.filterText, typeFilter !== "" && styles.filterTextActive]} numberOfLines={1}>
              {typeFilter ? typeLabel(typeFilter) : (lang === "uk" ? "Всі типи" : "All Types")}
            </Text>
            <MaterialCommunityIcons name={activeDropdown === "type" ? "chevron-up" : "chevron-down"} size={14} color={typeFilter !== "" ? Colors.primary : Colors.textSecondary} />
          </Pressable>

          {/* Time filter */}
          <Pressable
            style={[styles.filterPill, timeFilter !== "" && styles.filterPillActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveDropdown(activeDropdown === "time" ? null : "time"); }}
          >
            <Text style={[styles.filterText, timeFilter !== "" && styles.filterTextActive]} numberOfLines={1}>
              {timeLabel(timeFilter)}
            </Text>
            <MaterialCommunityIcons name={activeDropdown === "time" ? "chevron-up" : "chevron-down"} size={14} color={timeFilter !== "" ? Colors.primary : Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 80 }]}
          directionalLockEnabled
          showsVerticalScrollIndicator={false}
        >
          {!hasAnyEvents ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>{t.noHealthEvents}</Text>
              <Text style={styles.emptySubtext}>{t.noHealthEventsSubtitle}</Text>
              {pets.length > 0 && (
                <Pressable onPress={openAddEvent} style={styles.addBtn}>
                  <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFAF6" />
                  <Text style={styles.addBtnText}>{lang === "uk" ? "Додати подію" : "Add Event"}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {allItems.map(item => renderEvent(item))}
              {pets.length > 0 && (
                <Pressable onPress={openAddEvent} style={styles.addBtn}>
                  <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFAF6" />
                  <Text style={styles.addBtnText}>{lang === "uk" ? "Додати подію" : "Add Event"}</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Dropdown overlays */}
      <Modal visible={activeDropdown !== null} transparent animationType="none" onRequestClose={() => setActiveDropdown(null)}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setActiveDropdown(null)} />
        <View style={[styles.dropdownCard, { top: dropdownTop }]}>
          {activeDropdown === "pet" && (
            <ScrollView style={{ maxHeight: 300 }} directionalLockEnabled contentContainerStyle={{ padding: 8 }} showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => { setPetFilter(""); setExpandedId(null); setActiveDropdown(null); }} style={[styles.petRow, petFilter === "" && styles.petRowActive]}>
                <Text style={[styles.petRowName, petFilter === "" && { color: Colors.primary }]}>{lang === "uk" ? "Всі тварини" : "All Pets"}</Text>
                {petFilter === "" && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
              </Pressable>
              {pets.map(pet => (
                <Pressable key={pet.id} onPress={() => { setPetFilter(pet.id); setExpandedId(null); setActiveDropdown(null); }} style={[styles.petRow, petFilter === pet.id && styles.petRowActive]}>
                  <View style={styles.petRowAvatar}>
                    {pet.photoUri ? (
                      <Image source={{ uri: pet.photoUri }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
                    )}
                  </View>
                  <Text style={[styles.petRowName, petFilter === pet.id && { color: Colors.primary }]}>{pet.name}</Text>
                  {petFilter === pet.id && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          )}
          {activeDropdown === "type" && (
            <ScrollView style={{ maxHeight: 300 }} directionalLockEnabled contentContainerStyle={{ padding: 8 }} showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => { setTypeFilter(""); setExpandedId(null); setActiveDropdown(null); }} style={[styles.typeRow, typeFilter === "" && styles.typeRowActive]}>
                <Text style={[styles.typeRowText, typeFilter === "" && { color: Colors.primary }]}>{lang === "uk" ? "Всі типи" : "All Types"}</Text>
                {typeFilter === "" && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
              </Pressable>
              {(["vaccination","deworming","flea_tick","vet","checkup","grooming","nail_trim","bath","ear_cleaning","teeth_cleaning","medication","analysis","birthday","family_day","insurance","registration","certification","other"] as HealthEventType[]).map(type => {
                const color = getHealthEventColor(type);
                const icon = getHealthEventIcon(type);
                const isSelected = typeFilter === type;
                return (
                  <Pressable key={type} onPress={() => { setTypeFilter(type); setExpandedId(null); setActiveDropdown(null); }} style={[styles.typeRow, isSelected && styles.typeRowActive]}>
                    <View style={[styles.typeIconWrap, { backgroundColor: color + "22", width: 32, height: 32, borderRadius: 10 }]}>
                      <MaterialCommunityIcons name={icon} size={18} color={color} />
                    </View>
                    <Text style={[styles.typeRowText, isSelected && { color: Colors.primary }]}>{typeLabel(type)}</Text>
                    {isSelected && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {activeDropdown === "time" && (
            <View style={{ padding: 8 }}>
              {(["", "future", "past"] as TimeFilter[]).map(val => (
                <Pressable key={val || "all"} onPress={() => { setTimeFilter(val); setExpandedId(null); setActiveDropdown(null); }} style={[styles.typeRow, timeFilter === val && styles.typeRowActive]}>
                  <Text style={[styles.typeRowText, timeFilter === val && { color: Colors.primary }]}>{timeLabel(val)}</Text>
                  {timeFilter === val && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Pet picker modal */}
      <Modal visible={showPetPicker} transparent animationType="slide" onRequestClose={() => setShowPetPicker(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPetPicker(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handleWrap}><View style={styles.modalHandle} /></View>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowPetPicker(false)}><Text style={styles.modalCancel}>{t.cancel}</Text></Pressable>
              <Text style={styles.modalTitle}>{lang === "uk" ? "Оберіть тварину" : "Select Pet"}</Text>
              <Pressable onPress={() => { setShowPetPicker(false); router.push({ pathname: "/pet/select-event-template/[id]", params: { id: selectedPetId } }); }}>
                <Text style={styles.modalSave}>{lang === "uk" ? "Далі" : "Next"}</Text>
              </Pressable>
            </View>
            <ScrollView directionalLockEnabled contentContainerStyle={{ padding: 16 }}>
              {pets.map(pet => (
                <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={[styles.petRow, selectedPetId === pet.id && styles.petRowActive]}>
                  <View style={styles.petRowAvatar}>
                    {pet.photoUri ? (
                      <Image source={{ uri: pet.photoUri }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
                    )}
                  </View>
                  <Text style={[styles.petRowName, selectedPetId === pet.id && { color: Colors.primary }]}>{pet.name}</Text>
                  {selectedPetId === pet.id && <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  headerNavRow: { flexDirection: "row", alignItems: "center" },
  headerBackBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 72 },
  headerBackText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)" },
  headerSideSlot: { width: 72, alignItems: "flex-end" },
  headerAddBtnInner: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },

  filterRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  filterPillActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterText: { flexShrink: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  dropdownCard: {
    position: "absolute", left: 12, right: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: "hidden",
  },

  list: { padding: 16, gap: 8 },

  eventCard: {
    backgroundColor: Colors.surface, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  eventCardToday: { borderColor: "#FF8C0044", borderWidth: 2 },

  cardRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  petAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  petAvatarEmoji: { fontSize: 22 },
  eventInfo: { flex: 1, gap: 2 },
  eventMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  petName: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary, flexShrink: 1 },
  typeIconWrap: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 1 },
  eventTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  eventDateRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  eventDate: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  eventDateToday: { color: "#FF8C00", fontFamily: "Inter_600SemiBold" },
  slotHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, flexShrink: 1 },
  slotProgress: { alignSelf: "flex-start" },
  slotProgressText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.accentGreen },

  eventRight: { alignItems: "flex-end", gap: 4 },
  statusSquare: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },

  expandedSection: { paddingHorizontal: 12, paddingBottom: 14 },
  expandedDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  expandedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  expandedLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, width: 80 },
  expandedValue: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  contactSection: { backgroundColor: Colors.background, borderRadius: 10, padding: 10, marginBottom: 8 },
  contactBtnsRow: { marginTop: 4 },
  contactBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, marginRight: 6,
  },
  contactBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  photosRow: { marginBottom: 10, marginTop: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  expandedActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  expandedActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  expandedActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  addBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center", marginTop: 16,
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center" },

  typeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, marginBottom: 4 },
  typeRowActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: 12 },
  typeRowText: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.text },

  petRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, marginBottom: 4 },
  petRowActive: { backgroundColor: Colors.primaryLight, paddingHorizontal: 12 },
  petRowAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  petRowName: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.text },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: Colors.border, maxHeight: "70%",
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
});
