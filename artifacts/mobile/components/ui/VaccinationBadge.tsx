import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { getVaccinationStatus, getDaysUntilVaccination } from "@/utils/notifications";

interface VaccinationBadgeProps {
  nextDate: string;
}

export function VaccinationBadge({ nextDate }: VaccinationBadgeProps) {
  const status = getVaccinationStatus(nextDate);
  const days = getDaysUntilVaccination(nextDate);

  const config = {
    overdue: { bg: "#FFE5E5", text: "#FF3B30", label: "Прострочено" },
    soon: { bg: "#FFF3E0", text: "#FF9500", label: days === 0 ? "Сьогодні" : `${days}д` },
    upcoming: { bg: "#E8F5E9", text: "#34C759", label: `${days}д` },
    ok: { bg: Colors.primaryLight, text: Colors.primary, label: `${days}д` },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {status === "overdue" ? config.label : config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
