import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState, useMemo, useRef } from "react";
import {
  Alert,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";

import { Colors } from "@/constants/colors";
import { usePets, WeightEntry } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { parseDate } from "@/utils/notifications";

const WEIGHT_VALUES = Array.from({ length: 1000 }, (_, i) => ((i + 1) * 0.1).toFixed(1));
const ITEM_HEIGHT = 44;

function formatShortDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatFullDate(iso: string, lang: "uk" | "en"): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(lang === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function WeightChart({ entries, language }: { entries: WeightEntry[]; language: "uk" | "en" }) {
  const WIDTH = 320;
  const HEIGHT = 160;
  if (entries.length < 2) {
    return (
      <View style={{
        width: WIDTH, height: HEIGHT,
        borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 16 }}>
          {language === "uk" ? "Недостатньо записів для побудови графіка" : "Not enough entries to build a chart"}
        </Text>
      </View>
    );
  }
  const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map(e => e.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const points = sorted.map((e, i) => ({
    x: PADDING.left + (i / (sorted.length - 1)) * innerW,
    y: PADDING.top + innerH - ((e.weight - minW) / range) * innerH,
    weight: e.weight,
    date: e.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const gradientPathD = [
    ...points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${PADDING.top + innerH}`,
    `L ${points[0].x} ${PADDING.top + innerH}`,
    "Z",
  ].join(" ");

  return (
    <Svg width={WIDTH} height={HEIGHT}>
      {[0, 0.5, 1].map((frac, i) => {
        const y = PADDING.top + innerH - frac * innerH;
        const val = (minW + frac * range).toFixed(1);
        return (
          <React.Fragment key={i}>
            <Line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y}
              stroke="#E8EDF5" strokeWidth="1" strokeDasharray="4 4" />
            <SvgText x={PADDING.left - 4} y={y + 4} fontSize="9" fill={Colors.textTertiary} textAnchor="end">
              {val}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Path d={gradientPathD} fill={`${Colors.primary}20`} />
      <Path d={pathD} stroke={Colors.primary} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r="5" fill={Colors.primary} />
          <Circle cx={p.x} cy={p.y} r="2.5" fill="white" />
        </React.Fragment>
      ))}
      {points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map((p, i) => (
        <SvgText key={i} x={p.x} y={HEIGHT - 4} fontSize="9" fill={Colors.textTertiary} textAnchor="middle">
          {formatShortDate(p.date)}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function WeightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, addWeightEntry, updateWeightEntry, deleteWeightEntry } = usePets();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState("5.0");
  const [showEditPicker, setShowEditPicker] = useState(false);
  const [editingEntry, setEditingEntry] = useState<import("@/context/PetsContext").WeightEntry | null>(null);
  const [editPickerWeight, setEditPickerWeight] = useState("5.0");

  const pet = getPet(id);

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) setShowPicker(false);
      },
    })
  ).current;

  const onPickerScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(offset / ITEM_HEIGHT), WEIGHT_VALUES.length - 1));
    const newWeight = WEIGHT_VALUES[index];
    if (newWeight !== selectedWeight) {
      Haptics.selectionAsync();
      setSelectedWeight(newWeight);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: language === "uk" ? `Вага • ${pet?.name}` : `Weight • ${pet?.name}`,
      headerRight: () => (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPicker(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
          <MaterialCommunityIcons name="plus" size={22} color={Colors.primary} />
        </Pressable>
      ),
    });
  }, [pet, navigation, language]);

  const sorted = useMemo(() => {
    if (!pet?.weightHistory) return [];
    return [...pet.weightHistory].sort((a, b) => b.date.localeCompare(a.date));
  }, [pet?.weightHistory]);

  const handleAdd = async () => {
    if (!pet) return;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await addWeightEntry(pet.id, { date: iso, weight: parseFloat(selectedWeight) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPicker(false);
  };

  const editPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => { if (gs.dy > 50) setShowEditPicker(false); },
    })
  ).current;

  const onEditPickerScrollEnd = (event: any) => {
    const index = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT), WEIGHT_VALUES.length - 1));
    const v = WEIGHT_VALUES[index];
    if (v !== editPickerWeight) { Haptics.selectionAsync(); setEditPickerWeight(v); }
  };

  const handleEditOpen = (entry: WeightEntry) => {
    const initW = WEIGHT_VALUES.includes(entry.weight.toFixed(1)) ? entry.weight.toFixed(1) : "5.0";
    setEditPickerWeight(initW);
    setEditingEntry(entry);
    setShowEditPicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditSave = async () => {
    if (!pet || !editingEntry) return;
    await updateWeightEntry(pet.id, editingEntry.id, parseFloat(editPickerWeight));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditPicker(false);
    setEditingEntry(null);
  };

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert(
      language === "uk" ? "Видалити запис?" : "Delete entry?",
      language === "uk" ? "Цей запис ваги буде видалено." : "This weight entry will be deleted.",
      [
        { text: t.cancel, style: "cancel" },
        { text: t.delete, style: "destructive", onPress: () => { deleteWeightEntry(pet!.id, entry.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
      ]
    );
  };

  const handleAddOrPrompt = () => {
    const today = new Date();
    const todayIso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const todayEntry = sorted.find(e => e.date === todayIso);
    if (todayEntry) {
      Alert.alert(
        language === "uk" ? "Сьогоднішнє значення ваги вже додане" : "Today's weight already added",
        undefined,
        [
          { text: language === "uk" ? "Скасувати" : "Cancel", style: "cancel" },
          { text: language === "uk" ? "Редагувати" : "Edit", onPress: () => handleEditOpen(todayEntry) },
        ]
      );
    } else {
      setShowPicker(true);
    }
  };

  if (!pet) return null;

  const weightIndex = WEIGHT_VALUES.indexOf(selectedWeight);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Animated.View entering={FadeInDown.delay(60)} style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {language === "uk" ? "Графік ваги" : "Weight Chart"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <WeightChart entries={pet.weightHistory ?? []} language={language} />
          </ScrollView>
          {sorted.length >= 2 && (
            <View style={styles.chartStats}>
              <View style={styles.chartStat}>
                <Text style={styles.chartStatVal}>{sorted[0].weight.toFixed(1)} кг</Text>
                <Text style={styles.chartStatLabel}>{language === "uk" ? "Поточна" : "Current"}</Text>
              </View>
              <View style={styles.chartStat}>
                <Text style={styles.chartStatVal}>{Math.min(...(pet.weightHistory ?? []).map(e => e.weight)).toFixed(1)} кг</Text>
                <Text style={styles.chartStatLabel}>{language === "uk" ? "Мін." : "Min"}</Text>
              </View>
              <View style={styles.chartStat}>
                <Text style={styles.chartStatVal}>{Math.max(...(pet.weightHistory ?? []).map(e => e.weight)).toFixed(1)} кг</Text>
                <Text style={styles.chartStatLabel}>{language === "uk" ? "Макс." : "Max"}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {sorted.length > 0 && (
          <Pressable onPress={handleAddOrPrompt} style={[styles.addBtn, { marginBottom: 16 }]}>
            <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textLight} />
            <Text style={styles.addBtnText}>{language === "uk" ? "Додати вагу" : "Add weight"}</Text>
          </Pressable>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{language === "uk" ? "Журнал ваги" : "Weight Log"}</Text>
          <Text style={styles.listCount}>{sorted.length} {language === "uk" ? "записів" : "entries"}</Text>
        </View>

        {sorted.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="chart-line" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{language === "uk" ? "Немає записів" : "No entries yet"}</Text>
            <Text style={styles.emptySubtitle}>
              {language === "uk"
                ? `Натисніть + щоб додати перший запис ваги для ${pet.name}`
                : `Tap + to add the first weight entry for ${pet.name}`}
            </Text>
            <Pressable onPress={() => setShowPicker(true)} style={styles.addBtn}>
              <MaterialCommunityIcons name="plus" size={20} color={Colors.textLight} />
              <Text style={styles.addBtnText}>{language === "uk" ? "Додати вагу" : "Add weight"}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          sorted.map((entry, index) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(index * 50)}>
              <View style={styles.entryCard}>
                <View style={styles.entryIconWrap}>
                  <MaterialCommunityIcons name="scale-bathroom" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryWeight}>{entry.weight.toFixed(1)} кг</Text>
                  <Text style={styles.entryDate}>{formatFullDate(entry.date, language)}</Text>
                </View>
                {index === 0 && sorted.length > 1 && (
                  <View style={styles.diffBadge}>
                    <Text style={[styles.diffText, { color: entry.weight > sorted[1].weight ? "#FF4444" : Colors.accentGreen }]}>
                      {entry.weight > sorted[1].weight ? "+" : ""}
                      {(entry.weight - sorted[1].weight).toFixed(1)} кг
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => handleEditOpen(entry)} hitSlop={8} style={{ marginRight: 10 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(entry)} hitSlop={8}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.textTertiary} />
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Weight picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} />
          <Animated.View entering={FadeInDown.springify()} style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View {...handlePanResponder.panHandlers} style={styles.handleWrap}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={styles.modalCancel}>{t.cancel}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{language === "uk" ? "Вага сьогодні" : "Today's Weight"}</Text>
              <Pressable onPress={handleAdd}>
                <Text style={styles.modalSave}>{language === "uk" ? "Додати" : "Add"}</Text>
              </Pressable>
            </View>
            <View style={styles.pickerWrap}>
              <View style={styles.pickerSelectionBar} />
              <FlatList
                data={WEIGHT_VALUES}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                initialScrollIndex={weightIndex >= 0 ? weightIndex : 49}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onScrollEndDrag={onPickerScrollEnd}
                onMomentumScrollEnd={onPickerScrollEnd}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setSelectedWeight(item); }}
                    style={styles.pickerItem}
                  >
                    <Text style={[styles.pickerItemText, selectedWeight === item && styles.pickerItemActive]}>
                      {item} кг
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit weight picker modal */}
      <Modal visible={showEditPicker} transparent animationType="slide" onRequestClose={() => setShowEditPicker(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEditPicker(false)} />
          <Animated.View entering={FadeInDown.springify()} style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View {...editPanResponder.panHandlers} style={styles.handleWrap}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowEditPicker(false)}>
                <Text style={styles.modalCancel}>{t.cancel}</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editingEntry ? (language === "uk" ? `Редагувати ${editingEntry.date}` : `Edit ${editingEntry.date}`) : ""}
              </Text>
              <Pressable onPress={handleEditSave}>
                <Text style={styles.modalSave}>{language === "uk" ? "Зберегти" : "Save"}</Text>
              </Pressable>
            </View>
            <View style={styles.pickerWrap}>
              <View style={styles.pickerSelectionBar} />
              <FlatList
                data={WEIGHT_VALUES}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                initialScrollIndex={Math.max(0, WEIGHT_VALUES.indexOf(editPickerWeight))}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                onScrollEndDrag={onEditPickerScrollEnd}
                onMomentumScrollEnd={onEditPickerScrollEnd}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setEditPickerWeight(item); }}
                    style={styles.pickerItem}
                  >
                    <Text style={[styles.pickerItemText, editPickerWeight === item && styles.pickerItemActive]}>
                      {item} кг
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  chartCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  chartTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 12 },
  chartStats: { flexDirection: "row", marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  chartStat: { flex: 1, alignItems: "center" },
  chartStatVal: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  chartStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  listCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  addBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
  entryCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  entryIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  entryWeight: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  entryDate: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Colors.background, borderRadius: 8 },
  diffText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  handleWrap: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  modalCancel: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  pickerWrap: { position: "relative", height: 220 },
  pickerSelectionBar: {
    position: "absolute", top: "50%", left: 0, right: 0, height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2, backgroundColor: Colors.primaryLight, borderRadius: 12, marginHorizontal: 20,
  },
  pickerItem: { height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
  pickerItemText: { fontSize: 20, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  pickerItemActive: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.primary },
});
