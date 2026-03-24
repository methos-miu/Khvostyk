import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetAvatar } from "@/components/ui/PetAvatar";
import { VaccinationBadge } from "@/components/ui/VaccinationBadge";
import { Colors } from "@/constants/colors";
import { usePets } from "@/context/PetsContext";
import {
  calculateAge,
  formatDateShort,
  formatDate,
  getVaccinationStatus,
} from "@/utils/notifications";

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, deletePet } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const pet = getPet(id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name ?? "Тварина",
      headerRight: () =>
        pet ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                `Видалити ${pet.name}?`,
                "Всі дані тварини будуть видалені безповоротно.",
                [
                  { text: "Скасувати", style: "cancel" },
                  {
                    text: "Видалити",
                    style: "destructive",
                    onPress: async () => {
                      await deletePet(pet.id);
                      router.back();
                    },
                  },
                ]
              );
            }}
            style={{ marginRight: 4 }}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </Pressable>
        ) : null,
    });
  }, [pet, navigation]);

  if (!pet) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="paw-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>Тварину не знайдено</Text>
      </View>
    );
  }

  const upcomingVaccinations = pet.vaccinations
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    .slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroAvatar}>
              {pet.photoUri ? (
                <Image
                  source={{ uri: pet.photoUri }}
                  style={styles.heroPhoto}
                  contentFit="cover"
                />
              ) : (
                <PetAvatar
                  photoUri={pet.photoUri}
                  species={pet.species}
                  size={100}
                  color="rgba(255,255,255,0.2)"
                />
              )}
            </View>
            <Text style={styles.heroName}>{pet.name}</Text>
            <Text style={styles.heroBreed}>
              {pet.species === "cat" ? "Кіт" : pet.species === "dog" ? "Пес" : "Тварина"}
              {pet.breed ? ` • ${pet.breed}` : ""}
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{calculateAge(pet.birthdate)}</Text>
                <Text style={styles.heroStatLabel}>Вік</Text>
              </View>
              {pet.weight ? (
                <>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{pet.weight} кг</Text>
                    <Text style={styles.heroStatLabel}>Вага</Text>
                  </View>
                </>
              ) : null}
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{pet.vaccinations.length}</Text>
                <Text style={styles.heroStatLabel}>Вакцин</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{pet.documents.length}</Text>
                <Text style={styles.heroStatLabel}>Докум.</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Деталі</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoLabel}>Дата народження</Text>
              <Text style={styles.infoValue}>{formatDate(pet.birthdate)}</Text>
            </View>
            {pet.color ? (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
                <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoLabel}>Забарвлення</Text>
                <Text style={styles.infoValue}>{pet.color}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Вакцинації</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } });
              }}
            >
              <Text style={styles.seeAll}>Всі</Text>
            </Pressable>
          </View>

          {upcomingVaccinations.length === 0 ? (
            <Pressable
              onPress={() => router.push({ pathname: "/pet/add-vaccination/[id]", params: { id: pet.id } })}
              style={styles.emptyCard}
            >
              <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
              <Text style={styles.emptyCardText}>Додати вакцинацію</Text>
            </Pressable>
          ) : (
            <View style={styles.card}>
              {upcomingVaccinations.map((v, i) => {
                const status = getVaccinationStatus(v.nextDate);
                return (
                  <View key={v.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.vaccinationRow}>
                      <View style={styles.vaccinationInfo}>
                        <Text style={styles.vaccinationName}>{v.name}</Text>
                        <Text style={styles.vaccinationDate}>
                          Наступна: {formatDateShort(v.nextDate)}
                        </Text>
                      </View>
                      <VaccinationBadge nextDate={v.nextDate} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.quickActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: Colors.primaryLight }]}
            >
              <Ionicons name="medical" size={24} color={Colors.primary} />
              <Text style={[styles.actionLabel, { color: Colors.primary }]}>Вакцинації</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/documents/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: "#FFF0F0" }]}
            >
              <Ionicons name="document-text" size={24} color={Colors.accent} />
              <Text style={[styles.actionLabel, { color: Colors.accent }]}>Документи</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/add-vaccination/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: "#F0FFF5" }]}
            >
              <Ionicons name="add-circle" size={24} color={Colors.accentGreen} />
              <Text style={[styles.actionLabel, { color: Colors.accentGreen }]}>Нова вакцина</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  heroSection: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: "center",
  },
  heroAvatar: {
    marginBottom: 14,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  heroName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
    marginBottom: 4,
  },
  heroBreed: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 20,
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    alignItems: "center",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  body: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    padding: 14,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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
  vaccinationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  vaccinationInfo: {
    flex: 1,
  },
  vaccinationName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  vaccinationDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 14,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    flexDirection: "row",
  },
  emptyCardText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
