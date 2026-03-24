import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  breeds: string[];
  selectedBreed: string;
  onSelect: (breed: string) => void;
  title: string;
  language: "uk" | "en";
}

export function BreedPickerModal({
  visible,
  onClose,
  breeds,
  selectedBreed,
  onSelect,
  title,
  language,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [customBreed, setCustomBreed] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return breeds;
    return breeds.filter((b) => b.toLowerCase().includes(q));
  }, [breeds, query]);

  const otherLabel = language === "uk" ? "✏️ Інша порода (ввести вручну)" : "✏️ Other breed (enter manually)";

  const handleSelect = (breed: string) => {
    Haptics.selectionAsync();
    onSelect(breed);
    setQuery("");
    setShowCustomInput(false);
    onClose();
  };

  const handleOtherBreed = () => {
    Haptics.selectionAsync();
    setShowCustomInput(true);
  };

  const handleCustomSave = () => {
    const trimmed = customBreed.trim();
    if (trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(trimmed);
      setCustomBreed("");
      setQuery("");
      setShowCustomInput(false);
      onClose();
    }
  };

  const handleClose = () => {
    setQuery("");
    setCustomBreed("");
    setShowCustomInput(false);
    onClose();
  };

  function highlightText(text: string, query: string) {
    if (!query.trim()) return <Text style={styles.breedText}>{text}</Text>;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return <Text style={styles.breedText}>{text}</Text>;
    return (
      <Text style={styles.breedText}>
        {text.slice(0, idx)}
        <Text style={styles.breedTextHighlight}>{text.slice(idx, idx + q.length)}</Text>
        {text.slice(idx + q.length)}
      </Text>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search bar */}
          {!showCustomInput && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={language === "uk" ? "Пошук породи..." : "Search breed..."}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>
          )}

          {/* Custom input mode */}
          {showCustomInput ? (
            <View style={styles.customInputWrap}>
              <Text style={styles.customInputLabel}>
                {language === "uk" ? "Введіть назву породи:" : "Enter breed name:"}
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  value={customBreed}
                  onChangeText={setCustomBreed}
                  placeholder={language === "uk" ? "Назва породи..." : "Breed name..."}
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSave}
                />
                <Pressable onPress={handleCustomSave} style={styles.customSaveBtn}>
                  <Ionicons name="checkmark" size={20} color={Colors.textLight} />
                </Pressable>
              </View>
              <Pressable onPress={() => setShowCustomInput(false)} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                <Text style={styles.backBtnText}>
                  {language === "uk" ? "Назад до списку" : "Back to list"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.breedRow,
                    selectedBreed === item && styles.breedRowActive,
                  ]}
                >
                  {highlightText(item, query)}
                  {selectedBreed === item && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyResult}>
                  <Text style={styles.emptyResultText}>
                    {language === "uk" ? "Породу не знайдено" : "Breed not found"}
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity onPress={handleOtherBreed} style={styles.otherBreedRow}>
                  <Text style={styles.otherBreedText}>{otherLabel}</Text>
                </TouchableOpacity>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "80%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: "center", marginTop: 12,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 14, marginBottom: 4,
    backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    padding: 0,
  },
  breedRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  breedRowActive: { backgroundColor: Colors.primaryLight },
  breedText: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, flex: 1,
  },
  breedTextHighlight: {
    fontFamily: "Inter_700Bold", color: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 20 },
  listContent: { paddingBottom: 8 },
  otherBreedRow: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
    marginTop: 4,
  },
  otherBreedText: {
    fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.primary,
  },
  emptyResult: {
    padding: 24, alignItems: "center",
  },
  emptyResultText: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
  },
  customInputWrap: {
    padding: 16, gap: 12,
  },
  customInputLabel: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
  },
  customInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  customInput: {
    flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.text,
    paddingVertical: 10,
  },
  customSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    padding: 8,
  },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4,
  },
  backBtnText: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary,
  },
});
