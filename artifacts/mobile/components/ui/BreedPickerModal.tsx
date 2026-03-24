import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const listRef = useRef<FlatList>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return breeds;
    return breeds.filter((b) => b.toLowerCase().includes(q));
  }, [breeds, query]);

  const otherLabel =
    language === "uk"
      ? "✏️ Інша порода (ввести вручну)"
      : "✏️ Other breed (enter manually)";

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

  const handleSearchChange = (text: string) => {
    setQuery(text);
    // Scroll to top whenever the query changes so results are visible
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  };

  function highlightText(text: string, q: string) {
    if (!q.trim()) return <Text style={styles.breedText}>{text}</Text>;
    const lower = q.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(lower);
    if (idx === -1) return <Text style={styles.breedText}>{text}</Text>;
    return (
      <Text style={styles.breedText}>
        {text.slice(0, idx)}
        <Text style={styles.breedTextHighlight}>
          {text.slice(idx, idx + lower.length)}
        </Text>
        {text.slice(idx + lower.length)}
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
      {/*
        KeyboardAvoidingView wraps the entire overlay.
        - iOS: behavior="padding" adds bottom padding equal to keyboard height,
          which pushes the sheet up so the list stays visible.
        - Android: behavior="height" shrinks the KAV's height instead,
          keeping the sheet above the keyboard.
        The overlay's justifyContent="flex-end" means the sheet always
        sticks to the bottom of available space.
      */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
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

          {/* Search bar — always shown when not in custom-input mode */}
          {!showCustomInput && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={handleSearchChange}
                placeholder={
                  language === "uk" ? "Пошук породи..." : "Search breed..."
                }
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                returnKeyType="search"
                /*
                 * Do NOT use clearButtonMode here — it conflicts with
                 * our manual clear button and causes layout jitter.
                 */
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => handleSearchChange("")}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color={Colors.textTertiary}
                  />
                </Pressable>
              )}
            </View>
          )}

          {/* Custom input mode */}
          {showCustomInput ? (
            <View style={styles.customInputWrap}>
              <Text style={styles.customInputLabel}>
                {language === "uk"
                  ? "Введіть назву породи:"
                  : "Enter breed name:"}
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  value={customBreed}
                  onChangeText={setCustomBreed}
                  placeholder={
                    language === "uk" ? "Назва породи..." : "Breed name..."
                  }
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSave}
                />
                <Pressable onPress={handleCustomSave} style={styles.customSaveBtn}>
                  <Ionicons name="checkmark" size={20} color={Colors.textLight} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowCustomInput(false)}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                <Text style={styles.backBtnText}>
                  {language === "uk" ? "Назад до списку" : "Back to list"}
                </Text>
              </Pressable>
            </View>
          ) : (
            /*
             * flex: 1 here is critical — it lets the FlatList fill all
             * remaining vertical space inside the sheet, so when the
             * KeyboardAvoidingView shrinks the sheet the list shrinks
             * too and stays fully scrollable above the keyboard.
             */
            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              style={styles.list}
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
                  <Ionicons
                    name="search"
                    size={32}
                    color={Colors.textTertiary}
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={styles.emptyResultText}>
                    {language === "uk"
                      ? "Породу не знайдено"
                      : "Breed not found"}
                  </Text>
                  <Text style={styles.emptyResultSub}>
                    {language === "uk"
                      ? 'Прокрутіть вниз щоб ввести вручну'
                      : 'Scroll down to enter manually'}
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  onPress={handleOtherBreed}
                  style={styles.otherBreedRow}
                >
                  <Text style={styles.otherBreedText}>{otherLabel}</Text>
                </TouchableOpacity>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
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
    /*
     * maxHeight caps the sheet at 85% of screen so it never goes full-screen.
     * flexShrink: 1 lets it yield space to the keyboard when needed.
     */
    maxHeight: "85%",
    flexShrink: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 14,
    marginBottom: 6,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  /* flex: 1 is the key fix — FlatList fills available space and shrinks with keyboard */
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  breedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  breedRowActive: { backgroundColor: Colors.primaryLight },
  breedText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
  },
  breedTextHighlight: {
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 20 },
  emptyResult: {
    padding: 32,
    alignItems: "center",
  },
  emptyResultText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptyResultSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  otherBreedRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  otherBreedText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  customInputWrap: {
    padding: 16,
    gap: 12,
  },
  customInputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    paddingVertical: 10,
  },
  customSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
});
