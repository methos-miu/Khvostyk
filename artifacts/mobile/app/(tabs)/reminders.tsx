import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import {
  Alert,
  Animated,
  FlatList,
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
import Reanimated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Pet, Vaccination, Reminder, ReminderType, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateShort, getDaysUntil, getVaccinationStatus, getNextBirthday, parseDate } from "@/utils/notifications";
import { DatePickerField } from "@/components/ui/DatePickerField";

type ReminderItem =
  | { kind: "vaccination"; pet: Pet; vaccination: Vaccination; days: number; status: "overdue" | "soon" | "upcoming" | "ok" }
  | { kind: "birthday"; pet: Pet; days: number }
  | { kind: "custom"; pet: Pet; reminder: Reminder; days: number; status: "overdue" | "soon" | "ok" };

const STATUS_CONFIG = {
  overdue: { color: "#FF4444", bg: "#FFF0F0", icon: "alert-circle" as const, labelUk: "Прострочено", labelEn: "Overdue" },
  soon: { color: "#FF9500", bg: "#FFF8F0", icon: "time" as const, labelUk: "Невдовзі", labelEn: "Due Soon" },
  upcoming: { color: Colors.primary, bg: Colors.primaryLight, icon: "calendar" as const, labelUk: "Цього місяця", labelEn: "This Month" },
  ok: { color: "#4CAF50", bg: "#F0FFF4", icon: "checkmark-circle" as const, labelUk: "Заплановано", labelEn: "Planned" },
  birthday: { color: "#E91E63", bg: "#FFF0F7", icon: "gift" as const, labelUk: "День народження", labelEn: "Birthday" },
};

const REMINDER_TYPES: { type: ReminderType; iconUk: string; iconEn: string; icon: string; color: string; bg: string }[] = [
  { type: "deworming", iconUk: "Глистогінні", iconEn: "Deworming", icon: "bug", color: "#8B5CF6", bg: "#F3F0FF" },
  { type: "flea_tick", iconUk: "Від бліх та кліщів", iconEn: "Flea & Tick", icon: "shield-checkmark", color: "#F59E0B", bg: "#FFFBEB" },
  { type: "birthday", iconUk: "День народження", iconEn: "Birthday", icon: "gift", color: "#EC4899", bg: "#FDF2F8" },
  { type: "checkup", iconUk: "Плановий огляд", iconEn: "Routine Checkup", icon: "medical", color: "#0EA5E9", bg: "#EFF9FF" },
];

function getReminderTypeCfg(type: ReminderType) {
  return REMINDER_TYPES.find(r => r.type === type) ?? REMINDER_TYPES[3];
}

function getDaysStatus(days: number): "overdue" | "soon" | "ok" {
  if (days < 0) return "overdue";
  if (days <= 14) return "soon";
  return "ok";
}

export default function RemindersScreen() {
  const { pets, addReminder, deleteReminder } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [reminderType, setReminderType] = useState<ReminderType>("deworming");
  const [nextDate, setNextDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "vaccination" | "other">("all");

  const slideAnim = useRef(new Animated.Value(0)).current;

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowAddModal(false);
      slideAnim.setValue(0);
    });
  };

  const openAddModal = () => {
    slideAnim.setValue(0);
    setSelectedPetId(pets[0]?.id ?? "");
    setReminderType("deworming");
    setNextDate("");
    setNotes("");
    setShowAddModal(true);
  };

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          closeModal();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const reminderItems: ReminderItem[] = [];

  pets.forEach((pet) => {
    pet.vaccinations.forEach((vaccination) => {
      if (vaccination.nextDate) {
        reminderItems.push({
          kind: "vaccination",
          pet,
          vaccination,
          days: getDaysUntil(vaccination.nextDate),
          status: getVaccinationStatus(vaccination.nextDate),
        });
      }
    });

    if (pet.birthdate) {
      const nextBd = getNextBirthday(pet.birthdate);
      if (nextBd) {
        const now = new Date();
        const diff = Math.ceil((nextBd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 30) {
          reminderItems.push({ kind: "birthday", pet, days: diff });
        }
      }
    }

    (pet.reminders ?? []).forEach((reminder) => {
      if (reminder.nextDate) {
        reminderItems.push({
          kind: "custom",
          pet,
          reminder,
          days: getDaysUntil(reminder.nextDate),
          status: getDaysStatus(getDaysUntil(reminder.nextDate)),
        });
      }
    });
  });

  reminderItems.sort((a, b) => a.days - b.days);

  const filteredItems = reminderItems.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "vaccination") return item.kind === "vaccination";
    return item.kind !== "vaccination";
  });

  const urgentCount = reminderItems.filter(r =>
    (r.kind === "vaccination" && (r.status === "overdue" || r.status === "soon")) ||
    (r.kind === "custom" && (r.status === "overdue" || r.status === "soon")) ||
    (r.kind === "birthday" && r.days <= 7)
  ).length;

  const handleSaveReminder = async () => {
    if (!selectedPetId || !nextDate) {
      Alert.alert("", language === "uk" ? "Вкажіть дату" : "Please enter a date");
      return;
    }
    await addReminder(selectedPetId, { type: reminderType, date: new Date().toISOString().slice(0, 10), nextDate, notes });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  };

  function ReminderCard({ item, index }: { item: ReminderItem; index: number }) {
    const cfg = item.kind === "birthday"
      ? STATUS_CONFIG.birthday
      : item.kind === "vaccination"
      ? STATUS_CONFIG[item.status]
      : STATUS_CONFIG[item.status];

    const daysText =
      item.days < 0
        ? language === "uk" ? `${Math.abs(item.days)} дн. тому` : `${Math.abs(item.days)} days ago`
        : item.days === 0 ? t.today
        : language === "uk" ? `через ${item.days} дн.` : `in ${item.days} days`;

    let title = "";
    let subtitle = item.pet.name;

    if (item.kind === "vaccination") {
      title = item.vaccination.name;
    } else if (item.kind === "birthday") {
      title = language === "uk" ? `День народження ${item.pet.name}` : `${item.pet.name}'s Birthday`;
      subtitle = item.days === 0
        ? (language === "uk" ? "Сьогодні! 🎂" : "Today! 🎂")
        : "";
    } else {
      const typeCfg = getReminderTypeCfg(item.reminder.type);
      title = language === "uk" ? typeCfg.iconUk : typeCfg.iconEn;
    }

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.kind === "vaccination") {
        router.push({ pathname: "/pet/vaccinations/[id]", params: { id: item.pet.id } });
      } else if (item.kind !== "birthday") {
        Alert.alert(
          title,
          language === "uk" ? "Видалити це нагадування?" : "Delete this reminder?",
          [
            { text: t.cancel, style: "cancel" },
            { text: t.delete, style: "destructive", onPress: () => deleteReminder(item.pet.id, item.reminder.id) },
          ]
        );
      }
    };

    const typeIcon = item.kind === "custom" ? getReminderTypeCfg(item.reminder.type).icon : cfg.icon;

    return (
      <Reanimated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable onPress={handlePress} style={styles.card}>
          <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />
          <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={typeIcon as any} size={20} color={cfg.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.vaccineName} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.petName}>{subtitle}</Text> : null}
            <View style={styles.cardBottom}>
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusPillText, { color: cfg.color }]}>
                  {item.kind === "birthday"
                    ? (language === "uk" ? "День народження" : "Birthday")
                    : item.kind === "vaccination"
                    ? (language === "uk" ? STATUS_CONFIG[item.status].labelUk : STATUS_CONFIG[item.status].labelEn)
                    : (language === "uk" ? STATUS_CONFIG[item.status].labelUk : STATUS_CONFIG[item.status].labelEn)}
                </Text>
              </View>
              {item.kind !== "birthday" && (
                <Text style={styles.dateText}>
                  {item.kind === "vaccination"
                    ? formatDateShort(item.vaccination.nextDate)
                    : formatDateShort(item.reminder.nextDate)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.daysWrap}>
            <Text style={[styles.daysNum, { color: cfg.color }]}>
              {Math.abs(item.days)}
            </Text>
            <Text style={[styles.daysSub, { color: cfg.color }]}>
              {item.days < 0 ? (language === "uk" ? "тому" : "ago") : (language === "uk" ? "дн." : "days")}
            </Text>
          </View>
        </Pressable>
      </Reanimated.View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={[styles.header, { paddingTop: topInset + 12 }]}
        >
          <Reanimated.View entering={FadeInUp.delay(50)} style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t.reminders}</Text>
              <Text style={styles.headerSubtitle}>
                {reminderItems.length === 0
                  ? t.noRemindersSubtitle
                  : language === "uk" ? `${reminderItems.length} нагадувань` : `${reminderItems.length} reminders`}
              </Text>
            </View>
            {pets.length > 0 && (
              <Pressable onPress={openAddModal} style={styles.addHeaderBtn}>
                <MaterialCommunityIcons name="plus" size={22} color={Colors.textLight} />
              </Pressable>
            )}
          </Reanimated.View>

          <View style={styles.tabs}>
            {(["all", "vaccination", "other"] as const).map(tab => (
              <Pressable key={tab} onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
                style={[styles.tab, activeTab === tab && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === "all"
                    ? (language === "uk" ? "Всі" : "All")
                    : tab === "vaccination"
                    ? (language === "uk" ? "Вакцини" : "Vaccines")
                    : (language === "uk" ? "Інші" : "Others")}
                </Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {filteredItems.length === 0 ? (
          <Reanimated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <LinearGradient colors={["#E8651A", "#C45215"]} style={styles.emptyIconGradient}>
                <MaterialCommunityIcons name="bell" size={44} color={Colors.textLight} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === "all" ? t.noReminders : (language === "uk" ? "Немає нагадувань" : "No reminders")}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "vaccination"
                ? (language === "uk" ? "Додайте вакцинації щоб бачити їх тут" : "Add vaccinations to see them here")
                : activeTab === "other"
                ? (language === "uk" ? "Натисніть + щоб додати нагадування" : "Tap + to add a reminder")
                : t.noRemindersSubtitle}
            </Text>
            {pets.length > 0 && (
              <Pressable onPress={openAddModal} style={styles.addEmptyBtn}>
                <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textLight} />
                <Text style={styles.addEmptyBtnText}>
                  {language === "uk" ? "Додати нагадування" : "Add Reminder"}
                </Text>
              </Pressable>
            )}
          </Reanimated.View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item, i) => `${item.kind}-${i}`}
            renderItem={({ item, index }) => <ReminderCard item={item} index={index} />}
            contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 100 : 90 }]}
            ListFooterComponent={
              pets.length > 0 ? (
                <Pressable onPress={openAddModal} style={styles.addEmptyBtn}>
                  <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textLight} />
                  <Text style={styles.addEmptyBtnText}>
                    {language === "uk" ? "Додати нагадування" : "Add Reminder"}
                  </Text>
                </Pressable>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              urgentCount > 0 ? (
                <View style={styles.alertBanner}>
                  <MaterialCommunityIcons name="bell" size={16} color={Colors.primary} />
                  <Text style={styles.alertText}>
                    {language === "uk" ? `${urgentCount} нагадувань потребують уваги` : `${urgentCount} reminders need attention`}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Add reminder modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Animated.View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}>
              <View {...handlePanResponder.panHandlers} style={styles.handleWrap}>
                <View style={styles.modalHandle} />
              </View>
              <View style={styles.modalHeader}>
                <Pressable onPress={closeModal}>
                  <Text style={styles.modalCancel}>{t.cancel}</Text>
                </Pressable>
                <Text style={styles.modalTitle}>
                  {language === "uk" ? "Нове нагадування" : "New Reminder"}
                </Text>
                <Pressable onPress={handleSaveReminder}>
                  <Text style={styles.modalSave}>{language === "uk" ? "Додати" : "Add"}</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.addForm} keyboardShouldPersistTaps="handled">
                <Text style={styles.addLabel}>{language === "uk" ? "Тварина" : "Pet"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petPickerScroll}>
                  {pets.map(pet => (
                    <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)}
                      style={[styles.petChip, selectedPetId === pet.id && styles.petChipActive]}>
                      <Text style={[styles.petChipText, selectedPetId === pet.id && styles.petChipTextActive]}>
                        {pet.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.addLabel, { marginTop: 16 }]}>{language === "uk" ? "Тип нагадування" : "Reminder Type"}</Text>
                <View style={styles.typeGrid}>
                  {REMINDER_TYPES.map(rt => (
                    <Pressable key={rt.type} onPress={() => { Haptics.selectionAsync(); setReminderType(rt.type); }}
                      style={[styles.typeChip, { backgroundColor: rt.bg, borderColor: reminderType === rt.type ? rt.color : Colors.border }]}>
                      <MaterialCommunityIcons name={rt.icon as any} size={18} color={rt.color} />
                      <Text style={[styles.typeChipText, { color: rt.color }]}>
                        {language === "uk" ? rt.iconUk : rt.iconEn}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.addLabel, { marginTop: 16 }]}>{language === "uk" ? "Наступна дата" : "Next Date"}</Text>
                <View style={styles.dateFieldWrap}>
                  <DatePickerField
                    value={nextDate}
                    onChange={setNextDate}
                    placeholder={language === "uk" ? "Оберіть дату" : "Select date"}
                    label={language === "uk" ? "Наступна дата" : "Next Date"}
                    minimumDate={new Date()}
                  />
                </View>

                <Text style={[styles.addLabel, { marginTop: 16 }]}>{t.notes}</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={language === "uk" ? "Додаткові нотатки..." : "Additional notes..."}
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                />
              </ScrollView>
              </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textLight },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)", marginTop: 2 },
  addHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)" },
  tabActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  tabTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  listContent: { padding: 16 },
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 12, marginBottom: 12,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary, flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, marginBottom: 10,
    flexDirection: "row", alignItems: "center", overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  statusBar: { width: 4, alignSelf: "stretch" },
  statusIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", margin: 12 },
  cardContent: { flex: 1, paddingVertical: 14 },
  vaccineName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  petName: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  daysWrap: { alignItems: "center", paddingRight: 16, minWidth: 50 },
  daysNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  daysSub: { fontSize: 10, fontFamily: "Inter_500Medium" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIconWrap: {
    marginBottom: 20, borderRadius: 40, overflow: "hidden",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  emptyIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  addEmptyBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center",
  },
  addEmptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%",
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
  addForm: { padding: 16 },
  addLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  petPickerScroll: { flexGrow: 0 },
  petChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border,
  },
  petChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  petChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  petChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5,
  },
  typeChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dateFieldWrap: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  notesInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    minHeight: 70,
  },
});
