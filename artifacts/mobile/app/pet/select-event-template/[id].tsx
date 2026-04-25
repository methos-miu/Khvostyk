import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { usePets } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { BUILTIN_TEMPLATES } from "@/utils/healthEvents";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = "smart" | "frequent" | "recent" | "custom_first" | "alpha";

const SORT_STORAGE_KEY = "@event_template_sort";

interface TemplateUsage {
  template_key: string;
  use_count: number;
  last_used_at: string;
}

interface CustomTemplate {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

interface TemplateItem {
  key: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
}

// ─── Sort logic ───────────────────────────────────────────────────────────────

function sortTemplates(
  templates: TemplateItem[],
  sort: SortOption,
  usageMap: Map<string, TemplateUsage>
): TemplateItem[] {
  const usage = (key: string): TemplateUsage =>
    usageMap.get(key) ?? { template_key: key, use_count: 0, last_used_at: "0" };
  const alpha = (a: TemplateItem, b: TemplateItem) =>
    a.name.localeCompare(b.name, "uk");

  switch (sort) {
    case "smart": {
      const byRecent = [...templates].sort((a, b) => {
        const d = usage(b.key).last_used_at.localeCompare(usage(a.key).last_used_at);
        return d !== 0 ? d : alpha(a, b);
      });
      const recent3 = byRecent.filter(t => usageMap.has(t.key)).slice(0, 3);
      const recent3Keys = new Set(recent3.map(t => t.key));

      const byFreq = [...templates]
        .filter(t => usageMap.has(t.key) && !recent3Keys.has(t.key))
        .sort((a, b) => {
          const d = usage(b.key).use_count - usage(a.key).use_count;
          return d !== 0 ? d : alpha(a, b);
        });
      const frequent5 = byFreq.slice(0, 5);
      const topKeys = new Set([...recent3Keys, ...frequent5.map(t => t.key)]);

      const rest = [...templates].filter(t => !topKeys.has(t.key)).sort(alpha);
      return [...recent3, ...frequent5, ...rest];
    }
    case "frequent":
      return [...templates].sort((a, b) => {
        const d = usage(b.key).use_count - usage(a.key).use_count;
        return d !== 0 ? d : alpha(a, b);
      });
    case "recent":
      return [...templates].sort((a, b) => {
        const d = usage(b.key).last_used_at.localeCompare(usage(a.key).last_used_at);
        return d !== 0 ? d : alpha(a, b);
      });
    case "custom_first": {
      const custom  = templates.filter(t => t.isCustom).sort(alpha);
      const builtin = templates.filter(t => !t.isCustom).sort(alpha);
      return [...custom, ...builtin];
    }
    case "alpha":
    default:
      return [...templates].sort(alpha);
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SelectEventTemplateScreen() {
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { getPet } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 60 : insets.top;
  const lang = language as "uk" | "en";

  const pet = getPet(petId);
  const isDog = pet?.species === "dog";

  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("smart");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16 });
  const [usageMap, setUsageMap] = useState<Map<string, TemplateUsage>>(new Map());
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  const sortBtnRef = useRef<View>(null);

  // ── Load preferences ──────────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(SORT_STORAGE_KEY).then(v => {
      if (v) setSortOption(v as SortOption);
    });
  }, []);

  // ── Load / refresh Supabase data (also on focus) ──────────────────────────

  const refreshData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [usageRes, customRes] = await Promise.all([
        supabase
          .from("event_templates_usage")
          .select("template_key, use_count, last_used_at")
          .eq("user_id", user.id),
        supabase
          .from("custom_event_templates")
          .select("id, name, icon, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (usageRes.data) {
        const map = new Map<string, TemplateUsage>();
        usageRes.data.forEach(r => map.set(r.template_key, r));
        setUsageMap(map);
      }
      if (customRes.data) setCustomTemplates(customRes.data);
    } catch (e) {
      if (__DEV__) console.warn("SelectEventTemplate: load error", e);
    }
  }, []);

  useEffect(() => { refreshData(); }, []);

  // Refresh custom templates when screen comes back into focus
  useFocusEffect(useCallback(() => { refreshData(); }, []));

  // ── Combined template list ────────────────────────────────────────────────

  const allTemplates = useMemo((): TemplateItem[] => {
    const builtin: TemplateItem[] = BUILTIN_TEMPLATES
      .filter(tmpl => !tmpl.dogOnly || isDog)
      .map(tmpl => ({
        key: tmpl.key,
        name: lang === "uk" ? tmpl.name : tmpl.nameEn,
        icon: tmpl.icon as string,
        color: tmpl.color,
        isCustom: false,
      }));

    const custom: TemplateItem[] = customTemplates.map(ct => ({
      key: ct.id,
      name: ct.name,
      icon: ct.icon,
      color: Colors.accentPurple,
      isCustom: true,
    }));

    return [...builtin, ...custom];
  }, [customTemplates, isDog, lang]);

  const filtered = useMemo(() => {
    const sorted = sortTemplates(allTemplates, sortOption, usageMap);
    if (!search.trim()) return sorted;
    const q = search.trim().toLowerCase();
    return sorted.filter(tmpl => tmpl.name.toLowerCase().includes(q));
  }, [allTemplates, sortOption, usageMap, search]);

  // ── Track template usage ──────────────────────────────────────────────────

  const trackUsage = useCallback(async (templateKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc("increment_template_usage", {
        p_user_id: user.id,
        p_template_key: templateKey,
      });
    } catch { /* non-critical */ }
  }, []);

  // ── Select template ───────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    router.push({
      pathname: "/pet/create-custom-template/[id]",
      params: { id: petId },
    });
  }, [petId]);

  const handleSelect = useCallback((item: TemplateItem) => {
    Haptics.selectionAsync();

    // "Інше" → same flow as create custom event
    if (item.key === "other") {
      openCreate();
      return;
    }

    trackUsage(item.key);
    router.push({
      pathname: "/pet/add-health-event/[id]",
      params: {
        id: petId,
        templateKey: item.key,
        isCustomTemplate: item.isCustom ? "true" : "false",
        customTemplateName: item.isCustom ? item.name : "",
        customTemplateIcon: item.isCustom ? item.icon : "",
      },
    });
  }, [petId, trackUsage, openCreate]);

  // ── Long press on custom template → delete ────────────────────────────────

  const handleLongPress = useCallback((item: TemplateItem) => {
    if (!item.isCustom) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t.deleteTemplate,
      (t.deleteTemplateConfirm as (name: string) => string)(item.name),
      [
        { text: "Ні", style: "cancel" },
        {
          text: "Так",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("custom_event_templates").delete().eq("id", item.key);
              setCustomTemplates(prev => prev.filter(ct => ct.id !== item.key));
            } catch (e) {
              if (__DEV__) console.warn("Delete custom template:", e);
            }
          },
        },
      ]
    );
  }, [t]);

  // ── Sort dropdown ─────────────────────────────────────────────────────────

  const handleSortPress = useCallback(() => {
    Keyboard.dismiss();
    if (showSortDropdown) {
      setShowSortDropdown(false);
      return;
    }
    sortBtnRef.current?.measure((x, y, w, h, pageX, pageY) => {
      const screenWidth = Dimensions.get("window").width;
      setDropdownPos({
        top: pageY + h + 6,
        right: screenWidth - pageX - w,
      });
      setShowSortDropdown(true);
    });
  }, [showSortDropdown]);

  const handleSortChange = useCallback(async (opt: SortOption) => {
    setSortOption(opt);
    setShowSortDropdown(false);
    Haptics.selectionAsync();
    await AsyncStorage.setItem(SORT_STORAGE_KEY, opt);
  }, []);

  const SORT_LABELS: Record<SortOption, string> = {
    smart:        t.sortSmart,
    frequent:     t.sortFrequent,
    recent:       t.sortRecent,
    custom_first: t.sortCustomFirst,
    alpha:        t.sortAlpha,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: TemplateItem }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => handleSelect(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.color + "1A" }]}>
        <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
      {item.isCustom && (
        <View style={styles.customBadge}>
          <MaterialCommunityIcons name="pencil-outline" size={11} color={Colors.accentPurple} />
        </View>
      )}
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.border} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: topInset }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Pressable style={styles.header} onPress={Keyboard.dismiss}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.selectEventTitle}</Text>
        <Pressable style={styles.headerBtn} onPress={openCreate} hitSlop={8}>
          <MaterialCommunityIcons name="pencil-plus-outline" size={24} color={Colors.primary} />
        </Pressable>
      </Pressable>

      {/* ── Search + Sort ────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t.searchEventPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={17} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          ref={sortBtnRef}
          style={[styles.sortBtn, showSortDropdown && styles.sortBtnActive]}
          onPress={handleSortPress}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="sort-variant"
            size={22}
            color={showSortDropdown ? Colors.surface : Colors.primary}
          />
        </Pressable>
      </View>

      {/* ── Template list ────────────────────────────────────────────────── */}
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ListFooterComponent={
          <Pressable style={styles.createBtn} onPress={openCreate}>
            <LinearGradient
              colors={["#E8651A", "#C45215"]}
              style={styles.createBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textLight} />
              <Text style={styles.createBtnText}>{t.createCustomEvent}</Text>
            </LinearGradient>
          </Pressable>
        }
      />

      {/* ── Sort dropdown (positioned below sort button) ──────────────────── */}
      <Modal
        visible={showSortDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setShowSortDropdown(false)}
        >
          <View
            style={[styles.sortDropdown, { top: dropdownPos.top, right: dropdownPos.right }]}
            onStartShouldSetResponder={() => true}
          >
            {(["smart", "frequent", "recent", "custom_first", "alpha"] as SortOption[]).map((opt, i, arr) => (
              <Pressable
                key={opt}
                style={[
                  styles.dropdownRow,
                  i < arr.length - 1 && styles.dropdownRowBorder,
                  sortOption === opt && styles.dropdownRowActive,
                ]}
                onPress={() => handleSortChange(opt)}
              >
                <Text style={[styles.dropdownRowText, sortOption === opt && styles.dropdownRowTextActive]}>
                  {SORT_LABELS[opt]}
                </Text>
                {sortOption === opt && (
                  <MaterialCommunityIcons name="check" size={16} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  sortBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  rowPressed: {
    opacity: 0.7,
    backgroundColor: Colors.surfaceSecondary,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  customBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accentPurple + "1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.accentPurple + "44",
  },
  // "Створити власну подію" button — matches "Додати тварину" on main screen
  createBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 3,
    shadowRadius: 12,
    elevation: 6,
  },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    justifyContent: "center",
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textLight,
  },
  // Sort dropdown
  sortDropdown: {
    position: "absolute",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 210,
    overflow: "hidden",
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  dropdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownRowActive: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownRowText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  dropdownRowTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
