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
  TextInput,
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

  const currentDate = parseDate(value) ?? new Date(2020, 0, 1);
  const displayValue = value ? toDisplayDate(value) : "";

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selected) {
      onChange(toISO(selected));
      Haptics.selectionAsync();
    }
  };

  const handleConfirm = (selected?: Date) => {
    setShowPicker(false);
    if (selected) {
      onChange(toISO(selected));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.webRow}>
        <TextInput
          style={styles.webInput}
          value={displayValue}
          onChangeText={(v) => {
            const d = parseDate(v);
            if (d) onChange(toISO(d));
            else onChange(v);
          }}
          placeholder={placeholder ?? "DD.MM.YYYY"}
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numbers-and-punctuation"
        />
        <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} />
      </View>
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
            onChange={handleChange}
          />
        )}
      </>
    );
  }

  // iOS
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

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={styles.cancelBtn}>Скасувати</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{label ?? "Дата"}</Text>
              <Pressable onPress={() => handleConfirm(currentDate)}>
                <Text style={styles.confirmBtn}>Готово</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1924, 0, 1)}
              onChange={handleChange}
              style={styles.picker}
            />
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
    padding: 0,
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
  webRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  cancelBtn: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  confirmBtn: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  picker: {
    width: "100%",
    height: 200,
  },
});
