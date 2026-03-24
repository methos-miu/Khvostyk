import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { parseDate } from "@/utils/notifications";

interface Props {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  label?: string;
}

function toDisplayDate(isoDate: string): string {
  const d = parseDate(isoDate);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePickerField({ value, onChange, placeholder, label }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const currentDate = parseDate(value) ?? new Date(2020, 0, 1);
  const displayValue = value ? toDisplayDate(value) : "";

  const handleAndroidChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      onChange(toISO(selected));
      Haptics.selectionAsync();
    }
  };

  const handleIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  const confirmIOS = () => {
    const finalDate = tempDate ?? currentDate;
    onChange(toISO(finalDate));
    setTempDate(null);
    setShowPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelIOS = () => {
    setTempDate(null);
    setShowPicker(false);
  };

  if (Platform.OS === "web") {
    return (
      <Pressable
        style={styles.fieldButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={[styles.fieldText, !displayValue && styles.fieldPlaceholder]}>
          {displayValue || (placeholder ?? "Оберіть дату")}
        </Text>
        <Ionicons name="calendar" size={18} color={Colors.primary} />
      </Pressable>
    );
  }

  if (Platform.OS === "android") {
    return (
      <>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPicker(true);
          }}
          style={styles.fieldButton}
        >
          <Text style={[styles.fieldText, !displayValue && styles.fieldPlaceholder]}>
            {displayValue || (placeholder ?? "Оберіть дату")}
          </Text>
          <Ionicons name="calendar" size={18} color={Colors.primary} />
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            minimumDate={new Date(1924, 0, 1)}
            onChange={handleAndroidChange}
          />
        )}
      </>
    );
  }

  // iOS — uses "inline" calendar view for best visibility
  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTempDate(null);
          setShowPicker(true);
        }}
        style={styles.fieldButton}
      >
        <Text style={[styles.fieldText, !displayValue && styles.fieldPlaceholder]}>
          {displayValue || (placeholder ?? "Оберіть дату")}
        </Text>
        <Ionicons name="calendar" size={18} color={Colors.primary} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={cancelIOS}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={cancelIOS} style={styles.modalBtn}>
                <Text style={styles.cancelBtn}>Скасувати</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{label ?? "Дата народження"}</Text>
              <Pressable onPress={confirmIOS} style={styles.modalBtn}>
                <Text style={styles.confirmBtn}>Готово</Text>
              </Pressable>
            </View>
            <View style={styles.calendarContainer}>
              <DateTimePicker
                value={tempDate ?? currentDate}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                minimumDate={new Date(1924, 0, 1)}
                onChange={handleIOSChange}
                themeVariant="light"
                accentColor={Colors.primary}
                style={styles.inlinePicker}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
  },
  fieldPlaceholder: {
    color: Colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalBtn: {
    padding: 8,
    minWidth: 80,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  cancelBtn: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
  },
  confirmBtn: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textAlign: "right",
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
  },
  inlinePicker: {
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
});
