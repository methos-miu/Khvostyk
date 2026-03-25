import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [customBreed, setCustomBreed] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const listRef = useRef<FlatList>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) handleClose();
      },
    })
  ).current;

  /*
   * Height budget for the list:
   *   window height × 0.78  → sheet top (roughly)
   *   minus handle (20), header (65), search bar (60), bottom padding (60)
   *   ≈ window × 0.78 − 205
   * Clamp between 180 (very small phones) and 420 (tablets).
   * This is a concrete pixel value so the FlatList always renders.
   */
  const LIST_HEIGHT = Math.max(
    180,
    Math.min(420, Math.round(windowHeight * 0.78 - 205))
  );

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
    // Always scroll to top when filter changes so results appear immediately
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
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
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/*
        Structure:
          1. Dim backdrop (full-screen absolute)
          2. KeyboardAvoidingView anchored to bottom — lifts sheet above keyboard
          3. Sheet sized by content; FlatList gets a concrete maxHeight (not flex:1)

        Why maxHeight on FlatList, not flex:1?
          flex:1 needs a parent with a defined height to grow into.
          The sheet has no explicit height (it's content-sized so it hugs
          the handle + header + search + list naturally).
          A concrete maxHeight gives the FlatList an actual size regardless
          of its parent's measurement.
      */}
      <View style={styles.root}>
        {/* Dim backdrop — tap to close */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* KAV wraps only the sheet so it rises above the keyboard */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          >
            {/* Drag handle */}
            <View {...panResponder.panHandlers} style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Header row */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Pressable onPress={handleClose} hitSlop={10}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={28}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Search bar — shown in normal mode */}
            {!showCustomInput && (
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={17} color={Colors.textTertiary} />
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
                />
                {query.length > 0 && (
                  <Pressable
                    onPress={() => handleSearchChange("")}
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={17}
                      color={Colors.textTertiary}
                    />
                  </Pressable>
                )}
              </View>
            )}

            {/* Custom breed input mode */}
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
                  <Pressable
                    onPress={handleCustomSave}
                    style={styles.customSaveBtn}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={Colors.textLight}
                    />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setShowCustomInput(false)}
                  style={styles.backBtn}
                >
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.backBtnText}>
                    {language === "uk" ? "Назад до списку" : "Back to list"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /*
               * The FlatList has a concrete maxHeight (calculated from screen
               * dimensions) so it always renders its items, independent of
               * what flex value the parent sheet has.
               */
              <FlatList
                ref={listRef}
                data={filtered}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                showsVerticalScrollIndicator
                style={{ maxHeight: LIST_HEIGHT }}
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
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={styles.separator} />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyResult}>
                    <MaterialCommunityIcons
                      name="magnify"
                      size={32}
                      color={Colors.textTertiary}
                    />
                    <Text style={styles.emptyResultText}>
                      {language === "uk"
                        ? "Породу не знайдено"
                        : "Breed not found"}
                    </Text>
                    <Text style={styles.emptyResultSub}>
                      {language === "uk"
                        ? "Введіть назву вручну нижче"
                        : "Enter name manually below"}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* Full-screen container — positions backdrop + sheet */
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  /* Semi-transparent dim — absolute so it doesn't affect sheet layout */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  /* Bottom sheet — content-sized (grows to fit children) */
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleWrap: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    margin: 12,
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
  listContent: { paddingBottom: 4 },
  emptyResult: { padding: 28, alignItems: "center", gap: 8 },
  emptyResultText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
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
  },
  otherBreedText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  customInputWrap: { padding: 16, gap: 12 },
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
