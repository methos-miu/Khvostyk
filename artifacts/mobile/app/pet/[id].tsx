import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NetInfo from "@react-native-community/netinfo";

import { Colors } from "@/constants/colors";
import { usePets, MedicalProfile, Illness, HealthEvent, HealthEventStatus, CycleSlot } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { getSpeciesLabel } from "@/utils/speciesLabel";
import { calculateAge, formatDateShort, formatDate, getDaysUntil, parseDate } from "@/utils/notifications";
import { getAnimalEmoji } from "@/constants/animals";
import { getHealthEventIcon, getHealthEventColor } from "@/utils/healthEvents";
import {
  getDisplayEvents,
  computeEventStatusV2,
  isToday as isTodayStr,
  getTodayStr,
  getSeriesInterval,
  addInterval,
} from "@/utils/seriesUtils";

// ─── Status square (same logic as health-events screen) ───────────────────────

function StatusSquare({
  status,
  date,
  onPress,
  size = 28,
}: {
  status: HealthEventStatus;
  date: string;
  onPress: () => void;
  size?: number;
}) {
  const isToday = isTodayStr(date);
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
  } else if (isToday) {
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
      style={{ width: size + 8, height: size + 8, borderRadius: 8, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}
      hitSlop={6}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const COVER_HEIGHT = 290;

const UK_MONTHS = ["січня","лютого","березня","квітня","травня","червня","липня","серпня","вересня","жовтня","листопада","грудня"];
const UK_MONTHS_ABBR = ["січ","лют","бер","квіт","трав","черв","лип","серп","вер","жовт","лист","груд"];
const EN_MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const EN_MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getRelativeLabel(dateStr: string, language: string): string {
  const days = getDaysUntil(dateStr);
  if (language === "uk") {
    if (days === 0) return "Сьогодні";
    if (days === 1) return "Завтра";
    if (days === 2) return "Післязавтра";
    if (days === -1) return "Вчора";
    if (days === -2) return "Позавчора";
    if (days > 0) {
      if (days < 7) return `За ${days} дн.`;
      const weeks = Math.round(days / 7);
      if (days < 30) return `Через ${weeks} тиж.`;
      const months = Math.round(days / 30.5);
      if (days < 365) return `Через ${months} міс.`;
      return `Через ${Math.round(days / 365)} р.`;
    } else {
      const abs = Math.abs(days);
      if (abs < 7) return `${abs} дн. тому`;
      const weeks = Math.round(abs / 7);
      if (abs < 30) return `${weeks} тиж. тому`;
      const months = Math.round(abs / 30.5);
      if (abs < 365) return `${months} міс. тому`;
      return `${Math.round(abs / 365)} р. тому`;
    }
  } else {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === 2) return "In 2 days";
    if (days === -1) return "Yesterday";
    if (days === -2) return "2 days ago";
    if (days > 0) {
      if (days < 7) return `In ${days}d`;
      const weeks = Math.round(days / 7);
      if (days < 30) return `In ${weeks}w`;
      const months = Math.round(days / 30.5);
      if (days < 365) return `In ${months}mo`;
      return `In ${Math.round(days / 365)}yr`;
    } else {
      const abs = Math.abs(days);
      if (abs < 7) return `${abs}d ago`;
      const weeks = Math.round(abs / 7);
      if (abs < 30) return `${weeks}w ago`;
      const months = Math.round(abs / 30.5);
      if (abs < 365) return `${months}mo ago`;
      return `${Math.round(abs / 365)}yr ago`;
    }
  }
}

function getDateLabel(dateStr: string, language: string): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  const day = d.getDate();
  return language === "uk"
    ? `${day} ${UK_MONTHS_ABBR[d.getMonth()]}`
    : `${EN_MONTHS_SHORT[d.getMonth()]} ${day}`;
}


function getCardHeader(dateStr: string, language: string): string {
  const days = getDaysUntil(dateStr);
  const d = parseDate(dateStr);
  if (!d) return "";
  const dayNum = d.getDate();
  const monthLabel = language === "uk" ? UK_MONTHS[d.getMonth()] : EN_MONTHS_SHORT[d.getMonth()];
  const dateLabel = `${dayNum} ${monthLabel}`;
  if (days === 0) return `${language === "uk" ? "Сьогодні" : "Today"} • ${dateLabel}`;
  if (days === 1) return `${language === "uk" ? "Завтра" : "Tomorrow"} • ${dateLabel}`;
  return dateLabel;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
}

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getPet, deletePet, updatePet,
    completeHealthEvent, markDoneAndAdvance, shiftSeriesAnchor, updateHealthEvent, deleteHealthEvent, addExceptionRecord,
  } = usePets();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const TILE_GAP = 8;
  const CONTAINER_PADDING = 32; // body paddingHorizontal: 16 × 2
  const STRIP_PADDING = 4;      // dateStrip contentContainerStyle paddingHorizontal: 2 × 2
  const tileWidth = (screenWidth - CONTAINER_PADDING - STRIP_PADDING - TILE_GAP * 4) / 5;

  const scrollRef = useRef<ScrollView>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const scrollViewHeight = useRef(0);
  const advancingSeriesRef = useRef<Set<string>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medForm, setMedForm] = useState<MedicalProfile>({});
  const [showIllnessForm, setShowIllnessForm] = useState(false);
  const [editingIllnessId, setEditingIllnessId] = useState<string | null>(null);
  const [illnessForm, setIllnessForm] = useState<Partial<Illness>>({});
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [expandedSlotEventId, setExpandedSlotEventId] = useState<string | null>(null);
  const [slotOverrides, setSlotOverrides] = useState<Record<string, { slots: CycleSlot[]; status: HealthEventStatus }>>({});
  const [myRole, setMyRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [memberEmailById, setMemberEmailById] = useState<Record<string, string>>({});

  useEffect(() => {
    setSlotOverrides(prev => ({ ...prev }));
  }, [pet?.healthEvents]);

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

  const deleteIllness = (illId: string) => {
    setMedForm(prev => ({ ...prev, illnesses: (prev.illnesses ?? []).filter(i => i.id !== illId) }));
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
  useEffect(() => {
    if (!pet?.id) return;
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      setCurrentUserId(uid);
      const { data: row } = await supabase.from("pet_memberships").select("role").eq("pet_id", pet.id).eq("user_id", uid).eq("status", "active").maybeSingle();
      setMyRole((row?.role as any) ?? null);
      const { data: memberRows } = await supabase.from("pet_memberships").select("user_id").eq("pet_id", pet.id).eq("status", "active");
      const ids = (memberRows ?? []).map((m: any) => m.user_id);
      if (ids.length) {
        const { data: users } = await supabase.from("users").select("id,email").in("id", ids);
        const map: Record<string, string> = {};
        (users ?? []).forEach((u: any) => { if (u?.id && u?.email) map[u.id] = u.email; });
        setMemberEmailById(map);
      } else {
        setMemberEmailById({});
      }
      const { data: petRow } = await supabase.from("pets").select("owner_id").eq("id", pet.id).maybeSingle();
      if (petRow?.owner_id) {
        const { data: owner } = await supabase.from("users").select("email").eq("id", petRow.owner_id).maybeSingle();
        setOwnerEmail(owner?.email ?? null);
      }
    });
  }, [pet?.id]);

  const todayForHandlers = getTodayStr();

  const handleShiftDialog = useCallback(async (event: HealthEvent, petId: string, modifiedFutureCount: number) => {
    const interval = getSeriesInterval(event);
    if (!interval) return;
    const newNextDate = addInterval(todayForHandlers, interval.value, interval.unit);
    const seriesId = event.seriesId ?? event.id;

    if (modifiedFutureCount === 0) {
      await shiftSeriesAnchor(petId, seriesId, newNextDate, false);
      return;
    }

    const single = modifiedFutureCount === 1;
    Alert.alert(
      language === "uk"
        ? (single ? "Одна подія має змінену дату" : `${modifiedFutureCount} подій мають змінені дати`)
        : (single ? "One event has a modified date" : `${modifiedFutureCount} events have modified dates`),
      language === "uk" ? "Що робити з нею?" : "What to do with them?",
      [
        {
          text: language === "uk" ? (single ? "Посунути" : "Посунути всі") : (single ? "Shift" : "Shift all"),
          onPress: async () => { await shiftSeriesAnchor(petId, seriesId, newNextDate, true); },
        },
        {
          text: language === "uk" ? (single ? "Лишити" : "Лишити всі") : (single ? "Keep" : "Keep all"),
          onPress: async () => { await shiftSeriesAnchor(petId, seriesId, newNextDate, false); },
        },
        { text: language === "uk" ? "Назад" : "Back", style: "cancel" },
      ]
    );
  }, [shiftSeriesAnchor, todayForHandlers, language]);

  const handleCompleteEvent = useCallback(async (event: HealthEvent) => {
    if (!pet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert(
        language === "uk" ? "Немає інтернету" : "No internet",
        language === "uk" ? "Позначити виконаним можна тільки з інтернет-з'єднанням" : "Completion requires an internet connection"
      );
      return;
    }

    const petId = pet.id;
    const { nextDate, modifiedFutureCount } = await completeHealthEvent(petId, event.id);

    if (event.recurrenceType === "one_time" || !nextDate) return;

    const interval = getSeriesInterval(event);
    if (!interval) return;

    if (event.date === todayForHandlers) {
      // On-time completion → silent advance
      await markDoneAndAdvance(petId, event.id, nextDate);
      return;
    }

    // Different day → ask about shifting
    Alert.alert(
      language === "uk" ? "Наступна подія" : "Next occurrence",
      language === "uk"
        ? `Наступна запланована на ${formatDateShort(nextDate)}. Посунути від сьогодні?`
        : `Next is scheduled for ${formatDateShort(nextDate)}. Shift from today?`,
      [
        {
          text: language === "uk" ? "Лишити" : "Keep",
          onPress: async () => { await markDoneAndAdvance(petId, event.id, nextDate); },
        },
        {
          text: language === "uk" ? "Посунути" : "Shift",
          onPress: () => handleShiftDialog(event, petId, modifiedFutureCount),
        },
      ]
    );
  }, [pet, completeHealthEvent, markDoneAndAdvance, handleShiftDialog, todayForHandlers, language]);

  const handleCompleteSlot = useCallback(async (event: HealthEvent, slotIndex: number) => {
    if (!pet) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const slots = event.cycleSlots ?? [];
    const slot = slots[slotIndex];
    if (!slot) return;

    const updatedSlots = slots.map((s, i) =>
      i === slotIndex
        ? s.completed_at
          ? { ...s, completed_at: undefined, completed_by: undefined }
          : { ...s, completed_at: new Date().toISOString(), completed_by: currentUserId ?? undefined }
        : s
    );

    const allDone = updatedSlots.every(s => !!s.completed_at);
    const newStatus: HealthEventStatus = allDone
      ? "done"
      : computeEventStatusV2({ status: "planned", date: event.date, type: event.type, cycleSlots: updatedSlots, time: event.time });

    if (event.isVirtual) {
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
      await addExceptionRecord(pet.id, exceptionEvent);
      return;
    }

    // Optimistic update: reflect the change in the UI immediately before any async work.
    // All subsequent async operations run against the database in the background;
    // intermediate PetsContext re-renders are masked by this override so the schedule
    // card and timeline never flicker or lose the event.
    setSlotOverrides(prev => ({ ...prev, [event.id]: { slots: updatedSlots, status: newStatus } }));

    const revert = (reason: string) => {
      console.log('REVERT called:', reason);
      setSlotOverrides(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    };

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      revert('no internet');
      Alert.alert(
        language === "uk" ? "Немає інтернету" : "No internet",
        language === "uk" ? "Позначити виконаним можна тільки з інтернет-з'єднанням" : "Completion requires an internet connection"
      );
      return;
    }

    try {
      if (allDone && event.recurrenceType === "regular") {
        // Guard against duplicate calls
        if (advancingSeriesRef.current.has(event.id)) return;
        advancingSeriesRef.current.add(event.id);

        const interval = getSeriesInterval(event);
        if (interval) {
          const nextDate = addInterval(event.date, interval.value, interval.unit);
          const withinEndDate = !event.repeatEndDate || nextDate <= event.repeatEndDate;
          if (nextDate > event.date && withinEndDate) {
            try {
              await markDoneAndAdvance(pet.id, event.id, nextDate, updatedSlots);
            } finally {
              advancingSeriesRef.current.delete(event.id);
            }
            return;
          }
        }
        advancingSeriesRef.current.delete(event.id);
      }

      const wasUnchecking = !!slot.completed_at;
      if (wasUnchecking && !allDone && event.isCurrent === false && event.date < todayForHandlers) {
        // Slot unchecked after series was advanced — restore this event as anchor.
        const seriesId = event.seriesId;
        if (seriesId) {
          const orphan = pet.healthEvents?.find(
            e => e.id !== event.id && e.seriesId === seriesId && e.date > event.date && e.isCurrent === true
          );
          if (orphan) await deleteHealthEvent(pet.id, orphan.id);
        }
        await updateHealthEvent(pet.id, event.id, { cycleSlots: updatedSlots, status: newStatus, isCurrent: true });
        return;
      }

      await updateHealthEvent(pet.id, event.id, { cycleSlots: updatedSlots, status: newStatus });
    } catch (error) {
      console.error('handleCompleteSlot error:', error);
      revert('catch block');
      Alert.alert(
        language === "uk" ? "Помилка" : "Error",
        language === "uk" ? "Не вдалося оновити" : "Failed to update"
      );
    }
  }, [pet, updateHealthEvent, markDoneAndAdvance, deleteHealthEvent, addExceptionRecord, language, todayForHandlers, currentUserId]);

  const handleUndoComplete = useCallback((event: HealthEvent) => {
    if (!pet) return;
    Alert.alert(
      language === "uk" ? "Скасувати виконання?" : "Undo completion?",
      "",
      [
        { text: language === "uk" ? "Ні" : "No", style: "cancel" },
        {
          text: language === "uk" ? "Так" : "Yes",
          onPress: async () => {
            await updateHealthEvent(pet.id, event.id, { status: "planned", isCurrent: true });
          },
        },
      ]
    );
  }, [pet, updateHealthEvent, language]);

  const timelineEvents = useMemo<HealthEvent[]>(() => {
    if (!pet) return [];
    return getDisplayEvents(pet.healthEvents ?? [])
      .filter((e) => e.status !== "cancelled")
      .map((e) => {
        const ov = slotOverrides[e.id];
        return ov ? { ...e, cycleSlots: ov.slots, status: ov.status } : e;
      })
      .sort((a, b) => {
        const da = parseDate(a.date)?.getTime() ?? 0;
        const db = parseDate(b.date)?.getTime() ?? 0;
        return da - db;
      });
  }, [pet?.healthEvents, slotOverrides]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, HealthEvent[]> = {};
    for (const e of timelineEvents) {
      const dateStr = e.date;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(e);
    }
    return map;
  }, [timelineEvents]);

  const uniqueDates = useMemo(() => Object.keys(eventsByDate).sort(), [eventsByDate]);

  const todayStr = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Single chronological array: past + today + future. Today is always included.
  const allDates = useMemo(() => {
    if (uniqueDates.includes(todayStr)) return uniqueDates;
    return [...uniqueDates, todayStr].sort();
  }, [uniqueDates, todayStr]);

  const todayIndex = allDates.indexOf(todayStr);

  const futureDates = useMemo(() => uniqueDates.filter(d => d > todayStr), [uniqueDates, todayStr]);
  const hasFutureEvents = futureDates.length > 0;
  const futureTilesCount = futureDates.length;
  const plusTileWidth = futureTilesCount === 0 ? tileWidth * 4 + TILE_GAP * 3
                      : futureTilesCount === 1 ? tileWidth * 3 + TILE_GAP * 2
                      : futureTilesCount === 2 ? tileWidth * 2 + TILE_GAP * 1
                      : tileWidth;

  useEffect(() => {
    setActiveDateStr(todayStr);
  }, [todayStr]);

  // checkAndUpdateEventStatuses runs once after Supabase sync (in PetsContext).
  // Running it on every focus causes duplicate rule creation due to races with
  // user-initiated completions. The status will be re-evaluated on next app open.

  const handleOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const editLabel = language === "uk" ? "Редагувати" : "Edit";
    const deleteLabel = language === "uk" ? "Видалити" : "Delete";
    const cancelLabel = language === "uk" ? "Скасувати" : "Cancel";

    if (Platform.OS === "ios") {
      const options = myRole === "owner" ? [cancelLabel, editLabel, deleteLabel] : [cancelLabel, editLabel];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: myRole === "owner" ? 2 : undefined, cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) router.push({ pathname: "/pet/edit/[id]", params: { id: pet!.id } });
          else if (index === 2 && myRole === "owner") confirmDelete();
        }
      );
    } else {
      Alert.alert(pet?.name ?? "", undefined, myRole === "owner" ? [
        { text: editLabel, onPress: () => router.push({ pathname: "/pet/edit/[id]", params: { id: pet!.id } }) },
        { text: deleteLabel, style: "destructive", onPress: confirmDelete },
        { text: cancelLabel, style: "cancel" },
      ] : [
        { text: editLabel, onPress: () => router.push({ pathname: "/pet/edit/[id]", params: { id: pet!.id } }) },
        { text: cancelLabel, style: "cancel" },
      ]);
    }
  };

  const handleOpenShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/pet/share/[id]", params: { id: pet?.id } });
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

  if (!pet) {
    return (
      <View style={styles.notFound}>
        <MaterialCommunityIcons name="paw-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const speciesLabel = getSpeciesLabel(pet.species, pet.gender, language, pet.customSpecies);
  const age = calculateAge(pet.birthdate, language);
  const latestWeight = (pet.weightHistory ?? []).length > 0
    ? [...pet.weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const med = pet.medicalProfile;
  const hasMedical = med && (med.allergies || med.chronicConditions || med.vetName || med.vetPhone || med.bloodType || (med.illnesses && med.illnesses.length > 0));

  const activeEvents = activeDateStr ? (eventsByDate[activeDateStr] ?? []) : [];
  const sortedActiveEvents = useMemo(() => {
    const getFirstSlotTime = (e: HealthEvent) => e.cycleSlots?.[0]?.exact_time ?? e.time ?? "";
    const timed = activeEvents.filter(e => getFirstSlotTime(e)).sort((a, b) => getFirstSlotTime(a).localeCompare(getFirstSlotTime(b)));
    const untimed = activeEvents.filter(e => !getFirstSlotTime(e));
    return [...timed, ...untimed];
  }, [activeEvents]);
  const cardHeader = activeDateStr ? getCardHeader(activeDateStr, language) : "";

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, h) => setShowScrollTop(h > scrollViewHeight.current)}
        onLayout={(e) => { scrollViewHeight.current = e.nativeEvent.layout.height; }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* ── Cover Photo Header ───────────────────────────── */}
        <Animated.View entering={FadeIn}>
          <View style={styles.cover}>
            {pet.photoUri ? (
              <Image source={{ uri: pet.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.coverEmojiBackground]}>
                <Text style={styles.coverEmoji}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
              </View>
            )}
            {/* Bottom gradient */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.72)"]}
              locations={[0.25, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* Nav row */}
            <View style={[styles.coverNavRow, { paddingTop: insets.top + 6 }]}>
              <Pressable onPress={() => router.back()} style={styles.coverNavBtn} hitSlop={8}>
                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
                <Text style={styles.coverNavText}>{t.back}</Text>
              </Pressable>
              <View style={styles.coverNavActions}>
                <Pressable onPress={handleOpenShare} style={styles.coverNavBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color="#fff" />
                </Pressable>
                <Pressable onPress={handleOptions} style={styles.coverNavBtn} hitSlop={8}>
                  <Text style={styles.coverDotsText}>⋯</Text>
                </Pressable>
              </View>
            </View>
            {/* Pet name & subtitle */}
            <View style={styles.coverInfo}>
              <Text style={styles.coverName} numberOfLines={1}>{pet.name}</Text>
              {myRole ? <Text style={styles.coverRole}>{myRole === "owner" ? (language === "uk" ? "Власник" : "Owner") : myRole === "editor" ? (language === "uk" ? "Співвласник" : "Co-owner") : (language === "uk" ? "Читач" : "Reader")}</Text> : null}
              {ownerEmail ? <Text style={styles.coverOwnerText}>{language === "uk" ? `Власник: ${ownerEmail}` : `Owner: ${ownerEmail}`}</Text> : null}
              <Text style={styles.coverSubtitle} numberOfLines={1}>
                {[speciesLabel, pet.breed, age].filter(Boolean).join(" • ")}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.body}>
          {/* ── Upcoming Events Card ─────────────────────── */}
          <Animated.View entering={FadeInDown.delay(40)} style={styles.eventCardOverlap}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/health-events", params: { petId: pet.id } }); }}
              style={styles.eventCard}
            >
              <Text style={styles.eventCardHeader}>{cardHeader}</Text>
              <View style={{ flex: 1, gap: 6 }}>
                {sortedActiveEvents.map((event, index) => {
                  const isMultiSlot = (event.timesPerCycle ?? 1) > 1 && (event.cycleSlots?.length ?? 0) > 1;
                  const isExpanded = expandedSlotEventId === event.id;
                  const doneSlots = event.cycleSlots?.filter(s => !!s.completed_at).length ?? 0;
                  const totalSlots = event.cycleSlots?.length ?? 1;
                  const firstSlotTime = event.cycleSlots?.[0]?.exact_time ?? event.time ?? "";
                  const statusV2 = computeEventStatusV2({
                    status: event.status, date: event.date, type: event.type,
                    cycleSlots: event.cycleSlots, time: event.time,
                  });
                  const aggregateStatus: HealthEventStatus = isMultiSlot ? (() => {
                    if (doneSlots === totalSlots) return "done";
                    const base = computeEventStatusV2({ status: "planned", date: event.date, type: event.type, cycleSlots: event.cycleSlots, time: event.time });
                    return base === "overdue" ? "overdue" : "planned";
                  })() : statusV2;

                  return (
                    <View key={`${event.id}_${index}`}>
                      {/* ── Main row ── */}
                      <View style={styles.eventRow}>
                        <Text style={styles.eventTimeCol}>{firstSlotTime || "—"}</Text>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                          {(t as any)[`he_${event.type}`] ?? event.title}
                          {isMultiSlot ? `  ${doneSlots}/${totalSlots} ✓` : ""}
                        </Text>
                        {isMultiSlot && (
                          <Pressable
                            onPress={(ev) => { ev.stopPropagation?.(); setExpandedSlotEventId(isExpanded ? null : event.id); }}
                            hitSlop={8}
                            style={{ padding: 2 }}
                          >
                            <MaterialCommunityIcons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={Colors.textTertiary}
                            />
                          </Pressable>
                        )}
                        {isMultiSlot ? (
                          <View pointerEvents="none">
                            <StatusSquare status={aggregateStatus} date={event.date} onPress={() => {}} size={24} />
                          </View>
                        ) : (
                          <Pressable onPress={(ev) => { ev.stopPropagation?.(); event.status === "done" ? handleUndoComplete(event) : handleCompleteEvent(event); }}>
                            <StatusSquare status={statusV2} date={event.date} onPress={() => { event.status === "done" ? handleUndoComplete(event) : handleCompleteEvent(event); }} size={24} />
                          </Pressable>
                        )}
                      </View>

                      {/* ── Expanded slots ── */}
                      {isMultiSlot && isExpanded && event.cycleSlots!.map((slot, i) => {
                        const slotDone = !!slot.completed_at;
                        const slotStatus: HealthEventStatus = slotDone ? "done" : statusV2 === "overdue" ? "overdue" : "planned";
                        return (
                          <View key={i} style={[styles.eventRow, { paddingLeft: 42, marginTop: 2 }]}>
                            <Text style={[styles.eventTimeCol, { width: 50 }]}>{slot.exact_time || "—"}</Text>
                            <Text style={[styles.eventTitle, { fontSize: 13, color: slotDone ? Colors.textTertiary : Colors.text }]} numberOfLines={1}>
                              {slot.slot_name}
                            </Text>
                            {!!slot.completed_by && <Text numberOfLines={1} style={styles.slotByText}>{language === "uk" ? `✓ ${slot.completed_by === currentUserId ? "Ви" : (memberEmailById[slot.completed_by] ?? "користувач")}` : `✓ by ${slot.completed_by === currentUserId ? "you" : (memberEmailById[slot.completed_by] ?? "user")}`}</Text>}
                            <StatusSquare status={slotStatus} date={event.date} onPress={() => handleCompleteSlot(event, i)} size={20} />
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
                {sortedActiveEvents.length === 0 && (
                  <Text style={styles.eventCardEmpty}>
                    {activeDateStr === todayStr
                      ? (language === "uk" ? `У ${pet.name} на сьогодні нічого не заплановано` : `Nothing planned for ${pet.name} today`)
                      : (language === "uk" ? "Немає подій" : "No events")}
                  </Text>
                )}
              </View>
              <View style={styles.eventCardFooter}>
                <Text style={styles.eventCardSeeAll}>{language === "uk" ? "Всі події" : "All events"}</Text>
                <MaterialCommunityIcons name="chevron-right" size={15} color={Colors.primary} />
              </View>
            </Pressable>
          </Animated.View>

          {/* ── Date Strip Calendar ──────────────────────── */}
          <ScrollView
            horizontal
            ref={dateScrollRef}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
            onContentSizeChange={() => {
              dateScrollRef.current?.scrollTo({ x: todayIndex * (tileWidth + TILE_GAP), animated: false });
            }}
          >
            {allDates.map((dateStr) => {
              const isActive = dateStr === activeDateStr;
              const isToday = dateStr === todayStr;
              const relLabel = getRelativeLabel(dateStr, language);
              const parsedDate = parseDate(dateStr);
              const dayNum = parsedDate ? String(parsedDate.getDate()) : "";
              const monthFull = parsedDate
                ? (language === "uk" ? UK_MONTHS[parsedDate.getMonth()] : EN_MONTHS_FULL[parsedDate.getMonth()])
                : "";
              const evts = eventsByDate[dateStr] ?? [];
              const sortedEvts = [...evts].sort((a, b) => (a.cycleSlots?.[0]?.exact_time ?? a.time ?? "").localeCompare(b.cycleSlots?.[0]?.exact_time ?? b.time ?? ""));
              const hasEvents = sortedEvts.length > 0;
              const firstEvent = sortedEvts[0];
              const firstColor = hasEvents ? getHealthEventColor(firstEvent.type) : Colors.textTertiary;
              const firstIcon = hasEvents ? getHealthEventIcon(firstEvent.type) : "circle-small";
              const extraCount = sortedEvts.length - 1;
              const hasOverdue = sortedEvts.some((e) => {
                const effectiveStatus = computeEventStatusV2({
                  status: e.status,
                  date: e.date,
                  type: e.type,
                  cycleSlots: e.cycleSlots,
                  time: e.time,
                });
                return effectiveStatus === "overdue";
              });
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => { Haptics.selectionAsync(); setActiveDateStr(dateStr); }}
                  style={[styles.dateTile, isActive && styles.dateTileActive, { width: tileWidth, marginRight: TILE_GAP, overflow: "visible" }]}
                >
                  {hasOverdue && (
                    <View style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.danger, zIndex: 10 }} />
                  )}
                  <View style={{ alignItems: "center", gap: 0, marginTop: 0 }}>
                    <Text style={[styles.dateTileDate, isActive && styles.dateTileDateActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{dayNum}</Text>
                    <Text style={[styles.dateTileTopLabel, isActive && styles.dateTileTopLabelActive, { marginTop: -2 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{monthFull}</Text>
                  </View>
                  {(hasEvents || isToday) ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <View style={[styles.dateTileIconWrap, { backgroundColor: firstColor + "33" }]}>
                        <MaterialCommunityIcons name={firstIcon as any} size={11} color={firstColor} />
                      </View>
                      {extraCount > 0 && <Text style={[styles.dateTileExtraBadge, { color: firstColor }]}>+{extraCount}</Text>}
                    </View>
                  ) : null}
                  <Text style={[styles.dateTileTopLabel, isActive && styles.dateTileTopLabelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{relLabel}</Text>
                  {isToday && (
                    <View style={{ position: "absolute", bottom: -7, alignSelf: "center", zIndex: 20, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#E53935" }} />
                  )}
                </Pressable>
              );
            })}
            {!hasFutureEvents ? (
              <View style={[styles.dateTileEmpty, { width: tileWidth * 4 + TILE_GAP * 3 }]}>
                <Text style={styles.dateTileEmptyText}>
                  {language === "uk" ? "Ще нічого не заплановано" : "Nothing planned yet"}
                </Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/select-event-template/[id]", params: { id: pet.id } }); }}
                  style={styles.addEventTileBtn}
                >
                  <Text style={styles.addEventTileBtnText}>
                    {language === "uk" ? "+ Додати подію" : "+ Add event"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/select-event-template/[id]", params: { id: pet.id } }); }}
                style={[styles.dateTilePlus, { width: plusTileWidth }]}
              >
                <MaterialCommunityIcons name="plus" size={26} color={Colors.primary} />
              </Pressable>
            )}
          </ScrollView>

          {/* ── Section Tabs ─────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(80)}>
            <View style={styles.quickActions}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/health-events", params: { petId: pet.id } }); }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <MaterialCommunityIcons name="calendar-month" size={24} color={Colors.primary} />
                <Text style={styles.actionLabel}>{language === "uk" ? "Події" : "Events"}</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/documents/[id]", params: { id: pet.id } }); }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.primary} />
                <Text style={styles.actionLabel}>{t.documents}</Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/pet/weight/[id]", params: { id: pet.id } }); }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <MaterialCommunityIcons name="chart-line" size={24} color={Colors.primary} />
                <Text style={styles.actionLabel}>{language === "uk" ? "Вага" : "Weight"}</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Details ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>{t.details}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoLabel}>{t.birthdate}</Text>
                <Text style={styles.infoValue}>{formatDate(pet.birthdate)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoLabel}>{t.age}</Text>
                <Text style={styles.infoValue}>{age}</Text>
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
              {(latestWeight || pet.weight) ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="scale-bathroom" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Вага" : "Weight"}</Text>
                    <Text style={styles.infoValue}>{latestWeight ? latestWeight.weight.toFixed(1) : pet.weight} кг</Text>
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
            <Animated.View entering={FadeInDown.delay(120)}>
              <View style={styles.infoCard}>
                <Text style={styles.cardSectionTitle}>{language === "uk" ? "Характер та опис" : "Personality & Description"}</Text>
                {pet.personality ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="heart-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoLabel}>{language === "uk" ? "Характер" : "Personality"}</Text>
                    <Text style={styles.infoValue}>{pet.personality}</Text>
                  </View>
                ) : null}
                {pet.personality && pet.description ? <View style={styles.divider} /> : null}
                {pet.description ? (
                  <View style={{ padding: 12, paddingHorizontal: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <MaterialCommunityIcons name="note-text-outline" size={18} color={Colors.primary} />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Опис" : "Description"}</Text>
                    </View>
                    <Text style={[styles.infoValue, { textAlign: "left" }]}>{pet.description}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          {/* Medical Profile */}
          <Animated.View entering={FadeInDown.delay(130)}>
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
                    <Text style={styles.infoValue}>{med.allergies}</Text>
                  </View>
                ) : null}
                {med?.chronicConditions ? (
                  <>
                    {med?.allergies && <View style={styles.divider} />}
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="heart-pulse" size={18} color="#FF9500" />
                      <Text style={styles.infoLabel}>{language === "uk" ? "Хроніч. хвороби" : "Chronic Conditions"}</Text>
                      <Text style={styles.infoValue}>{med.chronicConditions}</Text>
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
        </View>
      </ScrollView>

      {showScrollTop && scrollY > 100 && (
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.scrollTopBtn}
        >
          <MaterialCommunityIcons name="arrow-up" size={22} color={Colors.textLight} />
        </Pressable>
      )}

      {/* Medical Profile Modal */}
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

  // ── Cover Photo Header ────────────────────────────────
  cover: { height: COVER_HEIGHT, width: "100%" },
  coverEmojiBackground: {
    backgroundColor: Colors.gradientStart,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: { fontSize: 90, opacity: 0.85 },
  coverNavRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  coverNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  coverNavActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coverNavText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },
  coverDotsText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 24,
    paddingHorizontal: 4,
  },
  coverInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 50,
    zIndex: 10,
  },
  coverName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverRole: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  coverOwnerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Body ──────────────────────────────────────────────
  body: { paddingTop: 0, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  eventCardOverlap: { marginTop: -30, zIndex: 2 },

  // ── Upcoming Events Card ──────────────────────────────
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    minHeight: 124,
    shadowColor: '#3D1C02',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  eventCardHeader: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    marginBottom: 2,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventTimeCol: {
    width: 42,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  slotByText: { fontSize: 11, color: Colors.textSecondary, marginRight: 8, flexShrink: 1, maxWidth: 140, textAlign: "right" },
  eventCardEmpty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: 4,
  },
  eventCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
    gap: 2,
  },
  eventCardSeeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },

  // ── Date Strip Calendar ───────────────────────────────
  dateStrip: {
    paddingHorizontal: 2,
    flexDirection: "row",
    paddingVertical: 2,
  },
  dateTile: {
    width: 72,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateTileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dateTilePlus: {
    width: 72,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  dateTileEmpty: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#3D1C02',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  dateTileEmptyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 140,
  },
  addEventTileBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addEventTileBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  dateTileTopLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  dateTileTopLabelActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  dateTileDate: {
    fontSize: 22,
    lineHeight: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  dateTileDateActive: {
    color: Colors.primary,
  },
  dateTileIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  dateTileExtraBadge: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },

  // ── Section Tabs ──────────────────────────────────────
  quickActions: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1, borderRadius: 18, padding: 14, alignItems: "center", gap: 8,
    backgroundColor: "#F5EDE6",
    shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: "#E8D5C0",
  },
  actionButtonPressed: {
    backgroundColor: "#EAD9CC",
  },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#3D1C02", textAlign: "center" },

  // ── Info Cards ────────────────────────────────────────
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardSectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.6, padding: 14, paddingBottom: 8, paddingLeft: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 14 },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, textAlign: "left" },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20,
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: Colors.border, borderStyle: "dashed", flexDirection: "row",
    shadowColor: '#3D1C02', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  emptyCardText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.primary },

  // ── Scroll Top Button ─────────────────────────────────
  scrollTopBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  // ── Medical Modal ─────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  kavWrap: { justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: Colors.border, maxHeight: "80%",
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
