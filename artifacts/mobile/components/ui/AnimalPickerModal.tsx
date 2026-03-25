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
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { ANIMAL_CATEGORIES, ALL_ANIMALS, AnimalEntry } from "@/constants/animals";

interface Props {
  visible: boolean;
  onSelect: (key: string) => void;
  onCustom: (name: string) => void;
  onClose: () => void;
  language: "uk" | "en";
}

function AnimalRow({ animal, onPress }: { animal: AnimalEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.animalRow, pressed && styles.animalRowPressed]}>
      <Text style={styles.animalEmoji}>{animal.emoji}</Text>
      <Text style={styles.animalName}>{animal.nameUk}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

export function AnimalPickerModal({ visible, onSelect, onCustom, onClose, language }: Props) {
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) handleClose();
      },
    })
  ).current;

  const sections = useMemo(() =>
    ANIMAL_CATEGORIES.map(cat => ({
      key: cat.key,
      title: language === "uk" ? cat.labelUk : cat.labelEn,
      data: cat.animals,
    })),
    [language]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_ANIMALS
      .filter(a =>
        a.nameUk.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q)
      )
      .sort((a, b) => a.nameUk.localeCompare(b.nameUk, "uk"));
  }, [query]);

  const handleSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery("");
    onSelect(key);
  };

  const handleCustom = () => {
    const name = query.trim();
    if (!name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuery("");
    onCustom(name);
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const showCustomRow = query.trim().length > 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
        >
          {/* Handle */}
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.headerCloseBtn}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle}>
              {language === "uk" ? "Оберіть тварину" : "Choose Animal"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={Colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={language === "uk" ? "Пошук тварини..." : "Search animal..."}
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* List */}
          {searchResults !== null ? (
            // Search mode — flat list
            <FlatList
              data={searchResults}
              keyExtractor={item => item.key}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <AnimalRow animal={item} onPress={() => handleSelect(item.key)} />
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>
                    {language === "uk" ? "Нічого не знайдено" : "Nothing found"}
                  </Text>
                </View>
              }
              ListFooterComponent={
                showCustomRow ? (
                  <Pressable onPress={handleCustom} style={styles.customRow}>
                    <View style={styles.customRowIcon}>
                      <MaterialCommunityIcons name="plus" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.customRowText}>
                      <Text style={styles.customRowLabel}>
                        {language === "uk" ? "Додати власну назву" : "Add custom name"}
                      </Text>
                      <Text style={styles.customRowValue} numberOfLines={1}>
                        «{query.trim()}»
                      </Text>
                    </View>
                  </Pressable>
                ) : null
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            // Browse mode — categorized sections
            <SectionList
              sections={sections}
              keyExtractor={item => item.key}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <AnimalRow animal={item} onPress={() => handleSelect(item.key)} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "60%",
  },
  handleWrap: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 10,
  },
  headerCloseBtn: { padding: 8, minWidth: 40 },
  headerTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14, marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 4,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.text, padding: 0, margin: 0,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    paddingTop: 18, paddingBottom: 6,
    backgroundColor: Colors.surface,
  },
  sectionHeaderText: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    color: Colors.textTertiary, letterSpacing: 1.2,
  },
  animalRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  animalRowPressed: { backgroundColor: Colors.background, borderRadius: 10, marginHorizontal: -8, paddingHorizontal: 8 },
  animalEmoji: { fontSize: 24, width: 32, textAlign: "center" },
  animalName: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  emptySearch: { paddingVertical: 32, alignItems: "center" },
  emptySearchText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  customRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginTop: 16, padding: 14, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  customRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  customRowText: { flex: 1 },
  customRowLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  customRowValue: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, marginTop: 1 },
});
