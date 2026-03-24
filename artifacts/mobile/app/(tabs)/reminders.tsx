import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Pet, Vaccination, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateShort, getDaysUntilVaccination, getVaccinationStatus } from "@/utils/notifications";

type ReminderItem = {
  pet: Pet;
  vaccination: Vaccination;
  days: number;
  status: "overdue" | "soon" | "upcoming" | "ok";
};

const STATUS_CONFIG = {
  overdue: { color: "#FF4444", bg: "#FFF0F0", icon: "alert-circle" as const, labelUk: "Прострочено", labelEn: "Overdue" },
  soon: { color: "#FF9500", bg: "#FFF8F0", icon: "time" as const, labelUk: "Невдовзі", labelEn: "Due Soon" },
  upcoming: { color: Colors.primary, bg: Colors.primaryLight, icon: "calendar" as const, labelUk: "Цього місяця", labelEn: "This Month" },
  ok: { color: "#4CAF50", bg: "#F0FFF4", icon: "checkmark-circle" as const, labelUk: "Заплановано", labelEn: "Planned" },
};

export default function RemindersScreen() {
  const { pets } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const reminders: ReminderItem[] = [];
  pets.forEach((pet) => {
    pet.vaccinations.forEach((vaccination) => {
      if (vaccination.nextDate) {
        reminders.push({
          pet,
          vaccination,
          days: getDaysUntilVaccination(vaccination.nextDate),
          status: getVaccinationStatus(vaccination.nextDate),
        });
      }
    });
  });

  reminders.sort((a, b) => a.days - b.days);

  const totalScheduled = reminders.filter((r) => r.status !== "ok").length;

  function ReminderCard({ item, index }: { item: ReminderItem; index: number }) {
    const cfg = STATUS_CONFIG[item.status];
    const daysText =
      item.days < 0
        ? language === "uk" ? `${Math.abs(item.days)} дн. тому` : `${Math.abs(item.days)} days ago`
        : item.days === 0
        ? t.today
        : language === "uk"
        ? `через ${item.days} дн.`
        : `in ${item.days} days`;

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/pet/vaccinations/[id]", params: { id: item.pet.id } });
          }}
          style={styles.card}
        >
          <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />
          <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.vaccineName} numberOfLines={1}>{item.vaccination.name}</Text>
            <Text style={styles.petName}>{item.pet.name}</Text>
            <View style={styles.cardBottom}>
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusPillText, { color: cfg.color }]}>
                  {language === "uk" ? cfg.labelUk : cfg.labelEn}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDateShort(item.vaccination.nextDate)}</Text>
            </View>
          </View>
          <View style={styles.daysWrap}>
            <Text style={[styles.daysNum, { color: cfg.color }]}>
              {item.days < 0 ? Math.abs(item.days) : item.days}
            </Text>
            <Text style={[styles.daysSub, { color: cfg.color }]}>
              {language === "uk" ? "дн." : "days"}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <Animated.View entering={FadeInUp.delay(50)}>
          <Text style={styles.headerTitle}>{t.reminders}</Text>
          <Text style={styles.headerSubtitle}>
            {reminders.length === 0
              ? t.noRemindersSubtitle
              : t.remindersTotal(reminders.length)}
          </Text>
        </Animated.View>
      </LinearGradient>

      {reminders.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.emptyIconGradient}>
              <Ionicons name="notifications" size={44} color={Colors.textLight} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>{t.noReminders}</Text>
          <Text style={styles.emptySubtitle}>{t.noRemindersSubtitle}</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => `${item.pet.id}-${item.vaccination.id}`}
          renderItem={({ item, index }) => <ReminderCard item={item} index={index} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 100 : 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            totalScheduled > 0 ? (
              <View style={styles.alertBanner}>
                <Ionicons name="notifications" size={16} color={Colors.primary} />
                <Text style={styles.alertText}>
                  {language === "uk"
                    ? `${totalScheduled} вакцинацій потребують уваги`
                    : `${totalScheduled} vaccinations need attention`}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textLight },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)", marginTop: 2 },
  listContent: { padding: 16 },
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 12, marginBottom: 12,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary, flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, marginBottom: 10,
    flexDirection: "row", alignItems: "center", overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  statusBar: { width: 4, alignSelf: "stretch" },
  statusIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", margin: 12,
  },
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
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  emptyIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
