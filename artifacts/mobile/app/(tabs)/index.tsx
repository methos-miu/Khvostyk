import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Pet, usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { getSpeciesLabel } from "@/utils/speciesLabel";
import { calculateAge } from "@/utils/notifications";
import { getAnimalEmoji } from "@/constants/animals";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PetCard({ pet, index }: { pet: Pet; index: number }) {
  const scale = useSharedValue(1);
  const { t, language } = useLanguage();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const age = calculateAge(pet.birthdate, language);
  const displayWeight = pet.weightHistory && pet.weightHistory.length > 0
    ? [...pet.weightHistory].sort((a, b) => b.date.localeCompare(a.date))[0].weight.toFixed(1)
    : pet.weight;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(14)}>
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/pet/[id]", params: { id: pet.id } });
        }}
        style={[styles.card, animatedStyle]}
      >
        {/* Decorative paw watermark in corner */}
        <Text style={styles.cardPawWatermark}>🐾</Text>

        <View style={styles.cardPhotoWrap}>
          {pet.photoUri ? (
            <Image source={{ uri: pet.photoUri }} style={styles.cardPhoto} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.cardPhotoPlaceholder}
            >
              <Text style={styles.speciesEmoji}>{getAnimalEmoji(pet.species, pet.customSpecies)}</Text>
            </LinearGradient>
          )}
          {/* Gender badge */}
          {pet.gender ? (
            <View
              style={[
                styles.genderBadge,
                pet.gender === "male" ? styles.genderMale : styles.genderFemale,
              ]}
            >
              <Text style={{ fontSize: 10, color: "#fff" }}>
                {pet.gender === "male" ? "♂" : "♀"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{pet.name}</Text>
          <Text style={styles.cardBreed} numberOfLines={1}>
            {pet.breed || getSpeciesLabel(pet.species, pet.gender, language, pet.customSpecies)}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.agePill}>
              <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.primary} />
              <Text style={styles.agePillText}>{age}</Text>
            </View>
            {displayWeight ? (
              <View style={styles.weightPill}>
                <Text style={styles.weightPillText}>{displayWeight} кг</Text>
              </View>
            ) : null}
          </View>
          {pet.vaccinations.length > 0 && (
            <View style={styles.vaccinationChip}>
              <MaterialCommunityIcons name="shield-check" size={12} color={Colors.accentGreen} />
              <Text style={styles.vaccinationChipText}>
                {pet.vaccinations.length} {language === "uk" ? "вакц." : "vacc."}
              </Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.border} style={styles.chevron} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { pets } = usePets();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <Animated.View entering={FadeInUp.delay(50)} style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t.appName}</Text>
            <Text style={styles.headerSubtitle}>
              {pets.length === 0
                ? t.noPetsSubtitle
                : pets.length === 1
                ? t.onePet
                : t.manyPets(pets.length)}
            </Text>
          </View>
          <Animated.View entering={FadeInRight.delay(100)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/pet/add");
              }}
              style={styles.addButton}
            >
              <MaterialCommunityIcons name="plus" size={28} color={Colors.textLight} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </LinearGradient>

      {pets.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
          {/* Cute illustrated empty state */}
          <View style={styles.emptyIllustration}>
            <Text style={styles.emptyIllustrationPaw}>🐾</Text>
            <LinearGradient
              colors={["#E8651A", "#C45215"]}
              style={styles.emptyIconGradient}
            >
              <Text style={styles.emptyIconEmoji}>🐕🐈</Text>
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>{t.noPets}</Text>
          <Text style={styles.emptySubtitle}>{t.noPetsSubtitle}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/pet/add");
            }}
            style={styles.emptyButton}
          >
            <LinearGradient
              colors={["#E8651A", "#C45215"]}
              style={styles.emptyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={Colors.textLight} />
              <Text style={styles.emptyButtonText}>{t.addPet}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <PetCard pet={item} index={index} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 100 : 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>{t.pets}</Text>
            </View>
          }
          ListFooterComponent={() => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/pet/add");
              }}
              style={styles.addButton2}
            >
              <LinearGradient
                colors={["#E8651A", "#C45215"]}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textLight} />
                <Text style={styles.addButtonText}>{t.addPet}</Text>
              </LinearGradient>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  listContent: { padding: 16 },
  listHeader: { marginBottom: 12 },
  listHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  cardPawWatermark: {
    position: "absolute",
    top: 8,
    right: 36,
    fontSize: 22,
    opacity: 0.06,
    transform: [{ rotate: "15deg" }],
  },
  cardPhotoWrap: { position: "relative", marginRight: 14 },
  cardPhoto: { width: 70, height: 70, borderRadius: 18 },
  cardPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  speciesEmoji: { fontSize: 30 },
  genderBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  genderMale: { backgroundColor: "#5B9BD5" },
  genderFemale: { backgroundColor: "#C4506A" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  cardBreed: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  agePillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  weightPill: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weightPillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  vaccinationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  vaccinationChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accentGreen,
  },
  chevron: { marginLeft: 6 },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIllustration: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  emptyIllustrationPaw: {
    position: "absolute",
    top: -16,
    right: -10,
    fontSize: 24,
    opacity: 0.3,
    transform: [{ rotate: "20deg" }],
  },
  emptyIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 2,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyIconEmoji: { fontSize: 34 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textLight,
  },
  addButton2: {
    borderRadius: 18, overflow: "hidden", marginTop: 8,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 3, shadowRadius: 12, elevation: 6,
  },
  addButtonGradient: {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingHorizontal: 32, paddingVertical: 16,
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textLight,
  },
  });
