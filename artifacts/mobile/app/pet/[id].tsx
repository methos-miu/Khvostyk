import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Alert,
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
import { useLanguage } from "@/context/LanguageContext";
import { calculateAge, formatDateShort, formatDate, getVaccinationStatus } from "@/utils/notifications";

const SPECIES_EMOJI: Record<string, string> = {
  cat: "🐈", dog: "🐕", rabbit: "🐇", hamster: "🐹",
  guinea_pig: "🐾", bird: "🐦", turtle: "🐢", reptile: "🦎",
  fish: "🐟", ferret: "🦡", hedgehog: "🦔", other: "🐾",
};

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, deletePet } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const pet = getPet(id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name ?? t.profile,
      headerRight: () =>
        pet ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                `${language === "uk" ? "Видалити" : "Delete"} ${pet.name}?`,
                t.deletePetConfirm,
                [
                  { text: t.cancel, style: "cancel" },
                  {
                    text: t.deletePet,
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
  }, [pet, navigation, t]);

  if (!pet) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="paw-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const upcomingVaccinations = [...pet.vaccinations]
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    .slice(0, 3);

  const speciesLabel = (t as any)[pet.species] ?? t.other;
  const age = calculateAge(pet.birthdate, language);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.heroAvatarWrap}>
              {pet.photoUri ? (
                <Image source={{ uri: pet.photoUri }} style={styles.heroPhoto} contentFit="cover" />
              ) : (
                <View style={styles.heroEmojiWrap}>
                  <Text style={styles.heroEmoji}>{SPECIES_EMOJI[pet.species] ?? "🐾"}</Text>
                </View>
              )}
              {pet.gender && (
                <View style={[styles.genderBadge, pet.gender === "male" ? styles.genderMale : styles.genderFemale]}>
                  <Ionicons name={pet.gender === "male" ? "male" : "female"} size={12} color={Colors.textLight} />
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{pet.name}</Text>
            <Text style={styles.heroBreed}>
              {speciesLabel}{pet.breed ? ` • ${pet.breed}` : ""}
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{age}</Text>
                <Text style={styles.heroStatLabel}>{t.age}</Text>
              </View>
              {pet.weight ? (
                <>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{pet.weight} кг</Text>
                    <Text style={styles.heroStatLabel}>{t.weight.replace(" (кг)", "")}</Text>
                  </View>
                </>
              ) : null}
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{pet.vaccinations.length}</Text>
                <Text style={styles.heroStatLabel}>{language === "uk" ? "Вакцин" : "Vacc."}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{pet.documents.length}</Text>
                <Text style={styles.heroStatLabel}>{language === "uk" ? "Докум." : "Docs"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.body}>
        {/* Info card */}
        <Animated.View entering={FadeInDown.delay(80)}>
          <View style={styles.infoCard}>
            <Text style={styles.cardSectionTitle}>{t.details}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoLabel}>{t.birthdate}</Text>
              <Text style={styles.infoValue}>{formatDate(pet.birthdate)}</Text>
            </View>
            {pet.color ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Ionicons name="color-palette-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoLabel}>{t.color}</Text>
                  <Text style={styles.infoValue}>{pet.color}</Text>
                </View>
              </>
            ) : null}
            {pet.gender ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Ionicons
                    name={pet.gender === "male" ? "male" : "female"}
                    size={18}
                    color={pet.gender === "male" ? "#2196F3" : "#E91E63"}
                  />
                  <Text style={styles.infoLabel}>{t.gender}</Text>
                  <Text style={styles.infoValue}>{pet.gender === "male" ? t.male : t.female}</Text>
                </View>
              </>
            ) : null}
          </View>
        </Animated.View>

        {/* Vaccinations */}
        <Animated.View entering={FadeInDown.delay(140)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.vaccinations}</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } });
              }}
            >
              <Text style={styles.seeAll}>{t.seeAll}</Text>
            </Pressable>
          </View>

          {upcomingVaccinations.length === 0 ? (
            <Pressable
              onPress={() => router.push({ pathname: "/pet/add-vaccination/[id]", params: { id: pet.id } })}
              style={styles.emptyCard}
            >
              <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
              <Text style={styles.emptyCardText}>{t.addVaccination}</Text>
            </Pressable>
          ) : (
            <View style={styles.card}>
              {upcomingVaccinations.map((v, i) => (
                <View key={v.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.vaccinationRow}>
                    <View style={styles.vaccinationInfo}>
                      <Text style={styles.vaccinationName}>{v.name}</Text>
                      <Text style={styles.vaccinationDate}>
                        {t.next}: {formatDateShort(v.nextDate)}
                      </Text>
                    </View>
                    <VaccinationBadge nextDate={v.nextDate} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <View style={styles.quickActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/vaccinations/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: Colors.primaryLight }]}
            >
              <Ionicons name="medical" size={26} color={Colors.primary} />
              <Text style={[styles.actionLabel, { color: Colors.primary }]}>{t.vaccinations}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/documents/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: "#FFF0F0" }]}
            >
              <Ionicons name="document-text" size={26} color={Colors.accent} />
              <Text style={[styles.actionLabel, { color: Colors.accent }]}>{t.documents}</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/pet/add-vaccination/[id]", params: { id: pet.id } });
              }}
              style={[styles.actionButton, { backgroundColor: "#F0FFF5" }]}
            >
              <Ionicons name="add-circle" size={26} color={Colors.accentGreen} />
              <Text style={[styles.actionLabel, { color: Colors.accentGreen }]}>{t.newVaccine}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {},
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  heroSection: { paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20 },
  heroContent: { alignItems: "center" },
  heroAvatarWrap: {
    position: "relative", marginBottom: 14,
    borderRadius: 54, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)",
    overflow: "visible",
  },
  heroPhoto: { width: 108, height: 108, borderRadius: 54 },
  heroEmojiWrap: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  heroEmoji: { fontSize: 50 },
  genderBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: Colors.primaryDark,
  },
  genderMale: { backgroundColor: "#2196F3" },
  genderFemale: { backgroundColor: "#E91E63" },
  heroName: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.textLight, marginBottom: 4 },
  heroBreed: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginBottom: 20 },
  heroStats: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18, padding: 14, gap: 12, alignItems: "center",
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.textLight },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  body: { padding: 16, gap: 16 },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  cardSectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.6,
    padding: 14, paddingBottom: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 14 },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  vaccinationRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  vaccinationInfo: { flex: 1 },
  vaccinationName: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  vaccinationDate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20,
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: Colors.border, borderStyle: "dashed", flexDirection: "row",
  },
  emptyCardText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.primary },
  quickActions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, borderRadius: 18, padding: 16, alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
