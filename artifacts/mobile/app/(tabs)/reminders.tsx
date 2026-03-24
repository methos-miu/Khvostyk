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

import { PetAvatar } from "@/components/ui/PetAvatar";
import { VaccinationBadge } from "@/components/ui/VaccinationBadge";
import { Colors } from "@/constants/colors";
import { usePets, Vaccination, Pet } from "@/context/PetsContext";
import {
  formatDate,
  getDaysUntilVaccination,
  getVaccinationStatus,
} from "@/utils/notifications";

interface ReminderItem {
  pet: Pet;
  vaccination: Vaccination;
  status: "overdue" | "soon" | "upcoming" | "ok";
  days: number;
}

export default function RemindersScreen() {
  const { pets } = usePets();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const reminders: ReminderItem[] = [];

  for (const pet of pets) {
    for (const vaccination of pet.vaccinations) {
      const status = getVaccinationStatus(vaccination.nextDate);
      const days = getDaysUntilVaccination(vaccination.nextDate);
      reminders.push({ pet, vaccination, status, days });
    }
  }

  reminders.sort((a, b) => a.days - b.days);

  const overdueItems = reminders.filter((r) => r.status === "overdue");
  const soonItems = reminders.filter((r) => r.status === "soon");
  const upcomingItems = reminders.filter((r) => r.status === "upcoming");
  const okItems = reminders.filter((r) => r.status === "ok");

  const sections = [
    { title: "Прострочено", items: overdueItems, color: Colors.danger },
    { title: "Незабаром (7 днів)", items: soonItems, color: Colors.warning },
    { title: "Цього місяця", items: upcomingItems, color: Colors.accentGreen },
    { title: "Заплановано", items: okItems, color: Colors.primary },
  ].filter((s) => s.items.length > 0);

  function ReminderCard({ item, index }: { item: ReminderItem; index: number }) {
    const statusColors = {
      overdue: { bg: "#FFF5F5", border: "#FFD5D5", dot: Colors.danger },
      soon: { bg: "#FFFBF0", border: "#FFE4A0", dot: Colors.warning },
      upcoming: { bg: "#F0FFF5", border: "#B8F0CC", dot: Colors.accentGreen },
      ok: { bg: Colors.primaryLight, border: Colors.borderLight, dot: Colors.primary },
    }[item.status];

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push({ pathname: "/pet/[id]", params: { id: item.pet.id } });
          }}
          style={[styles.reminderCard, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}
        >
          <View style={[styles.statusBar, { backgroundColor: statusColors.dot }]} />
          <View style={styles.cardContent}>
            <PetAvatar photoUri={item.pet.photoUri} species={item.pet.species} size={44} />
            <View style={styles.cardInfo}>
              <Text style={styles.vaccineName}>{item.vaccination.name}</Text>
              <Text style={styles.petName}>{item.pet.name}</Text>
              <Text style={styles.dateText}>
                Наступна: {formatDate(item.vaccination.nextDate)}
              </Text>
            </View>
            <VaccinationBadge nextDate={item.vaccination.nextDate} />
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
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.headerTitle}>Нагадування</Text>
          <Text style={styles.headerSubtitle}>
            {reminders.length === 0
              ? "Немає запланованих вакцинацій"
              : `${reminders.length} вакцинацій заплановано`}
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        {reminders.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Немає нагадувань</Text>
            <Text style={styles.emptySubtitle}>
              Додайте вакцинації у профілях ваших тварин щоб отримувати нагадування
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(s) => s.title}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Platform.OS === "web" ? 100 : 80 },
            ]}
            renderItem={({ item: section }) => (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.items.length}</Text>
                </View>
                {section.items.map((item, index) => (
                  <ReminderCard key={`${item.pet.id}-${item.vaccination.id}`} item={item} index={index} />
                ))}
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
  },
  reminderCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  statusBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  petName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
