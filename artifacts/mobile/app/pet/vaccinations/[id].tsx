import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VaccinationBadge } from "@/components/ui/VaccinationBadge";
import { Colors } from "@/constants/colors";
import { usePets, Vaccination } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/notifications";

export default function VaccinationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, deleteVaccination } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const pet = getPet(id);

  const handleAddVaccination = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/pet/add-vaccination/[id]", params: { id } });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${t.vaccinations} • ${pet?.name ?? ""}`,
      headerRight: () => (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/pet/add-vaccination/[id]", params: { id } });
          }}
          style={{ marginRight: 16 }}
        >
          <MaterialCommunityIcons name="plus" size={26} color={Colors.primary} />
        </Pressable>
      ),
    });
  }, [pet, navigation, id, t]);

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const sorted = [...pet.vaccinations].sort(
    (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()
  );

  function VaccinationItem({ item, index }: { item: Vaccination; index: number }) {
    const statusColors = {
      overdue: Colors.danger,
      soon: Colors.warning,
      upcoming: Colors.accentGreen,
      ok: Colors.primary,
    };

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <View style={styles.vaccinationCard}>
          <View style={styles.vaccinationContent}>
            <View style={styles.vaccinationHeader}>
              <View style={styles.vaccinationTitleArea}>
                <Text style={styles.vaccinationName}>{item.name}</Text>
                <VaccinationBadge nextDate={item.nextDate} />
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    t.deleteVaccination,
                    t.deleteVaccinationConfirm,
                    [
                      { text: t.cancel, style: "cancel" },
                      {
                        text: t.delete,
                        style: "destructive",
                        onPress: () => deleteVaccination(pet.id, item.id),
                      },
                    ]
                  );
                }}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.datesRow}>
              <View style={styles.dateItem}>
                <MaterialCommunityIcons name="check-circle" size={14} color={Colors.accentGreen} />
                <View>
                  <Text style={styles.dateLabel}>{t.done}</Text>
                  <Text style={styles.dateValue}>{formatDate(item.date)}</Text>
                </View>
              </View>
              <View style={styles.dateSep} />
              <View style={styles.dateItem}>
                <MaterialCommunityIcons name="arrow-right-circle" size={14} color={Colors.primary} />
                <View>
                  <Text style={styles.dateLabel}>{t.next}</Text>
                  <Text style={styles.dateValue}>{formatDate(item.nextDate)}</Text>
                </View>
              </View>
            </View>

            {item.vetName ? (
              <View style={styles.vetRow}>
                <MaterialCommunityIcons name="account-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.vetText}>{item.vetName}</Text>
              </View>
            ) : null}

            {item.notes ? (
              <Text style={styles.notes}>{item.notes}</Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="medical-bag" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t.noVaccinations}</Text>
          <Text style={styles.emptySubtitle}>
            {language === "uk"
              ? `Додайте першу вакцинацію для ${pet.name}`
              : `Add the first vaccination for ${pet.name}`}
          </Text>
          <Pressable onPress={handleAddVaccination} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFAF6" />
            <Text style={styles.addBtnText}>{language === "uk" ? "Додати вакцинацію" : "Add Vaccination"}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <VaccinationItem item={item} index={index} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable onPress={handleAddVaccination} style={styles.addBtn}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFAF6" />
              <Text style={styles.addBtnText}>{language === "uk" ? "Додати вакцинацію" : "Add Vaccination"}</Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  listContent: { padding: 16 },
  vaccinationCard: {
    backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 12,
    overflow: "hidden",
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  vaccinationContent: { padding: 16, gap: 12 },
  vaccinationHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  vaccinationTitleArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  vaccinationName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  datesRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  dateItem: { flexDirection: "row", gap: 8, alignItems: "flex-start", flex: 1 },
  dateSep: { width: 1, height: 36, backgroundColor: Colors.border },
  dateLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  dateValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 1 },
  vetRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vetText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  notes: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18,
    backgroundColor: Colors.background, borderRadius: 10, padding: 10,
  },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", marginBottom: 8, lineHeight: 20,
  },
  addBtn: {
    backgroundColor: "#E8651A", paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center", marginTop: 16,
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFAF6" },
});
