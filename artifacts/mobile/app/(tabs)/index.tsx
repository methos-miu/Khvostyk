import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetAvatar } from "@/components/ui/PetAvatar";
import { VaccinationBadge } from "@/components/ui/VaccinationBadge";
import { Colors } from "@/constants/colors";
import { Pet, usePets } from "@/context/PetsContext";
import { calculateAge, getVaccinationStatus } from "@/utils/notifications";
import { requestNotificationPermissions } from "@/utils/notifications";

function PetCard({ pet, index }: { pet: Pet; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const upcomingVaccinations = pet.vaccinations.filter((v) => {
    const status = getVaccinationStatus(v.nextDate);
    return status === "overdue" || status === "soon";
  });

  const petColors = [
    Colors.primaryLight,
    "#FFF0F0",
    "#F0FFF4",
    "#FFF8E7",
  ];
  const cardAccentColors = [
    Colors.primary,
    Colors.accent,
    Colors.accentGreen,
    Colors.accentOrange,
  ];

  const colorIndex = index % 4;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()} style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={() => {
          Haptics.selectionAsync();
          router.push({ pathname: "/pet/[id]", params: { id: pet.id } });
        }}
        style={styles.petCard}
      >
        <View style={styles.petCardInner}>
          <View style={styles.petCardLeft}>
            <View style={[styles.avatarContainer, { backgroundColor: petColors[colorIndex] }]}>
              <PetAvatar
                photoUri={pet.photoUri}
                species={pet.species}
                size={60}
                color={petColors[colorIndex]}
              />
            </View>
          </View>

          <View style={styles.petInfo}>
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petBreed}>
              {pet.species === "cat" ? "Кіт" : pet.species === "dog" ? "Пес" : "Тварина"} •{" "}
              {pet.breed || "Порода не вказана"}
            </Text>
            <View style={styles.petMeta}>
              <View style={styles.metaBadge}>
                <Ionicons name="calendar-outline" size={11} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{calculateAge(pet.birthdate)}</Text>
              </View>
              {pet.weight ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="scale-outline" size={11} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{pet.weight} кг</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.petCardRight}>
            {upcomingVaccinations.length > 0 ? (
              <View style={styles.alertDot} />
            ) : null}
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </View>
        </View>

        {upcomingVaccinations.length > 0 ? (
          <View style={styles.vaccinationAlert}>
            <Ionicons name="medical-outline" size={13} color={Colors.warning} />
            <Text style={styles.vaccinationAlertText}>
              {upcomingVaccinations.length === 1
                ? `Вакцинація "${upcomingVaccinations[0].name}" незабаром`
                : `${upcomingVaccinations.length} вакцинації потребують уваги`}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { pets, isLoaded } = usePets();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <Animated.View entering={FadeInUp.delay(100)} style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>ВетПомічник</Text>
            <Text style={styles.subtitle}>
              {pets.length === 0
                ? "Додайте свого улюбленця"
                : pets.length === 1
                ? "1 тварина"
                : `${pets.length} тварин`}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/pet/add");
            }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={26} color={Colors.textLight} />
          </Pressable>
        </Animated.View>
      </LinearGradient>

      <View style={styles.listContainer}>
        {!isLoaded ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : pets.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="paw" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Немає тварин</Text>
            <Text style={styles.emptySubtitle}>
              Натисніть кнопку + щоб додати свого улюбленця
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/pet/add");
              }}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Додати тварину</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <FlatList
            data={pets}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <PetCard pet={item} index={index} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 100 : 80,
  },
  petCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  petCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  petCardLeft: {
    marginRight: 12,
  },
  avatarContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  petBreed: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  petMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  petCardRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingLeft: 8,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  vaccinationAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFF8EE",
    borderTopWidth: 1,
    borderTopColor: "#FFE9C2",
  },
  vaccinationAlertText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
  },
  loadingContainer: {
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 90,
    borderRadius: 16,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textLight,
  },
});
