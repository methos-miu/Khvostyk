import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { parseDate } from "@/utils/notifications";

interface Props {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toDisplayDate(isoDate: string, lang: "uk" | "en"): string {
  const d = parseDate(isoDate);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${d.getFullYear()}`;
  }
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MIN_DATE = new Date(1924, 0, 1);

export function DatePickerField({ value, onChange, placeholder, label, minimumDate, maximumDate }: Props) {
  const { language } = useLanguage();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) cancelIOS();
      },
    })
  ).current;

  const currentDate = parseDate(value) ?? (maximumDate ? new Date(Math.min(maximumDate.getTime(), Date.now())) : new Date());
  const displayValue = value ? toDisplayDate(value, language) : "";

  const effectiveMin = minimumDate ?? MIN_DATE;
  const effectiveMax = maximumDate;

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

  const cancelLabel = language === "uk" ? "Скасувати" : "Cancel";
  const confirmLabel = language === "uk" ? "Готово" : "Done";
  const modalTitle = label ?? (language === "uk" ? "Оберіть дату" : "Select Date");

  if (Platform.OS === "web") {
    return (
      <Pressable style={styles.fieldButton} onPress={() => setShowPicker(!showPicker)}>
        <Text style={[styles.fieldText, !displayValue && styles.fieldPlaceholder]}>
          {displayValue || (placeholder ?? (language === "uk" ? "Оберіть дату" : "Select date"))}
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
            {displayValue || (placeholder ?? (language === "uk" ? "Оберіть дату" : "Select date"))}
          </Text>
          <Ionicons name="calendar" size={18} color={Colors.primary} />
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="default"
            maximumDate={effectiveMax}
            minimumDate={effectiveMin}
            onChange={handleAndroidChange}
          />
        )}
      </>
    );
  }

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
          {displayValue || (placeholder ?? (language === "uk" ? "Оберіть дату" : "Select date"))}
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
          <Pressable style={StyleSheet.absoluteFill} onPress={cancelIOS} />
          <Animated.View entering={FadeInDown.springify()} style={styles.modalSheet}>
            <View {...panResponder.panHandlers} style={styles.handleWrap}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Pressable onPress={cancelIOS} style={styles.modalBtn}>
                <Text style={styles.cancelBtn}>{cancelLabel}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Pressable onPress={confirmIOS} style={styles.modalBtn}>
                <Text style={styles.confirmBtn}>{confirmLabel}</Text>
              </Pressable>
            </View>
            <View style={styles.calendarContainer}>
              <DateTimePicker
                value={tempDate ?? currentDate}
                mode="date"
                display="inline"
                maximumDate={effectiveMax}
                minimumDate={effectiveMin}
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
  handleWrap: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: "center",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
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
