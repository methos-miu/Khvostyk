import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { usePets, Document, DocumentCategory } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/notifications";

type CategoryInfo = {
  key: DocumentCategory;
  labelUk: string;
  labelEn: string;
  icon: string;
  color: string;
  bg: string;
};

const CATEGORIES: CategoryInfo[] = [
  { key: "analysis", labelUk: "Аналізи", labelEn: "Lab Results", icon: "flask", color: "#8B5CF6", bg: "#F3F0FF" },
  { key: "prescription", labelUk: "Рецепти", labelEn: "Prescriptions", icon: "document-text", color: "#0EA5E9", bg: "#EFF9FF" },
  { key: "insurance", labelUk: "Страховка", labelEn: "Insurance", icon: "shield-checkmark", color: "#10B981", bg: "#ECFDF5" },
  { key: "passport", labelUk: "Ветпаспорт", labelEn: "Vet Passport", icon: "card", color: Colors.primary, bg: Colors.primaryLight },
  { key: "other", labelUk: "Інше", labelEn: "Other", icon: "document-attach", color: Colors.textSecondary, bg: Colors.background },
];

function getCategoryInfo(cat?: DocumentCategory): CategoryInfo {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

function getDocumentIcon(type: string, category?: DocumentCategory): { name: string; color: string; bg: string } {
  const catInfo = CATEGORIES.find(c => c.key === category);
  if (catInfo && category !== "other") return { name: catInfo.icon, color: catInfo.color, bg: catInfo.bg };
  if (type.includes("pdf")) return { name: "document", color: "#FF6B6B", bg: "#FFF0F0" };
  if (type.includes("image")) return { name: "image", color: Colors.primary, bg: Colors.primaryLight };
  if (type.includes("word") || type.includes("doc")) return { name: "document-text", color: "#2B7BF5", bg: "#EEF4FF" };
  return { name: "document-attach", color: Colors.textSecondary, bg: Colors.background };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function DocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, addDocument, deleteDocument } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<Omit<Document, "id" | "category"> | null>(null);
  const [filterCat, setFilterCat] = useState<DocumentCategory | "all">("all");

  const pet = getPet(id);

  const saveDocumentWithCategory = async (doc: Omit<Document, "id">) => {
    await addDocument(id, doc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const promptCategory = (doc: Omit<Document, "id" | "category">) => {
    setPendingDoc(doc);
    setShowCategoryModal(true);
  };

  const handleCategorySelected = async (cat: DocumentCategory) => {
    if (!pendingDoc) return;
    await saveDocumentWithCategory({ ...pendingDoc, category: cat });
    setPendingDoc(null);
    setShowCategoryModal(false);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert(t.permissionTitle, t.cameraDenied); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      const timestamp = new Date().toLocaleDateString(language === "uk" ? "uk-UA" : "en-GB");
      promptCategory({ name: `${language === "uk" ? "Фото" : "Photo"} ${timestamp}.jpg`, uri: result.assets[0].uri, type: "image/jpeg", date: new Date().toISOString() });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const timestamp = new Date().toLocaleDateString(language === "uk" ? "uk-UA" : "en-GB");
      promptCategory({ name: `${language === "uk" ? "Зображення" : "Image"} ${timestamp}.jpg`, uri: result.assets[0].uri, type: "image/jpeg", date: new Date().toISOString() });
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], copyToCacheDirectory: true, multiple: false });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        promptCategory({ name: asset.name, uri: asset.uri, type: asset.mimeType ?? "application/octet-stream", date: new Date().toISOString(), size: asset.size });
      }
    } catch (e) {
      Alert.alert("", language === "uk" ? "Не вдалося завантажити документ" : "Could not load document");
    }
  };

  const showAddOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t.addDocument, "", [
      { text: t.docTakePhoto, onPress: takePhoto },
      { text: t.docGallery, onPress: pickFromGallery },
      { text: t.docFiles, onPress: pickFromFiles },
      { text: t.cancel, style: "cancel" },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${t.documents} • ${pet?.name ?? ""}`,
      headerRight: () => (
        <Pressable onPress={showAddOptions} style={{ marginRight: 4 }}>
          <Ionicons name="add" size={26} color={Colors.primary} />
        </Pressable>
      ),
    });
  }, [pet, navigation, t, language]);

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>{t.notFound}</Text>
      </View>
    );
  }

  const allDocs = pet.documents;
  const filteredDocs = filterCat === "all" ? allDocs : allDocs.filter(d => d.category === filterCat);

  function DocumentItem({ item, index }: { item: Document; index: number }) {
    const icon = getDocumentIcon(item.type, item.category);
    const catInfo = getCategoryInfo(item.category);

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <View style={styles.documentCard}>
          <View style={[styles.docIconContainer, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name as any} size={26} color={icon.color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.docMeta}>
              <View style={[styles.catPill, { backgroundColor: catInfo.bg }]}>
                <Text style={[styles.catPillText, { color: catInfo.color }]}>
                  {language === "uk" ? catInfo.labelUk : catInfo.labelEn}
                </Text>
              </View>
              <Text style={styles.docDate}>{formatDate(item.date)}</Text>
              {item.size ? (
                <>
                  <Text style={styles.docMetaSep}>•</Text>
                  <Text style={styles.docSize}>{formatFileSize(item.size)}</Text>
                </>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(t.deleteDoc, t.deleteDocConfirm, [
                { text: t.cancel, style: "cancel" },
                { text: t.delete, style: "destructive", onPress: () => deleteDocument(pet.id, item.id) },
              ]);
            }}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {allDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="folder-open-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t.noDocuments}</Text>
            <Text style={styles.emptySubtitle}>
              {language === "uk"
                ? `Збережіть ветеринарні документи, паспорти і результати аналізів для ${pet.name}`
                : `Save vet documents, passports and test results for ${pet.name}`}
            </Text>
            <Pressable onPress={showAddOptions} style={styles.emptyButton}>
              <Ionicons name="cloud-upload-outline" size={18} color={Colors.textLight} />
              <Text style={styles.emptyButtonText}>{t.addDocument}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredDocs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <DocumentItem item={item} index={index} />}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.storageInfo}>
                  <Ionicons name="folder" size={16} color={Colors.primary} />
                  <Text style={styles.storageText}>{t.docCount(allDocs.length)}</Text>
                </View>
                {/* Category filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <Pressable onPress={() => setFilterCat("all")} style={[styles.filterChip, filterCat === "all" && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, filterCat === "all" && styles.filterChipTextActive]}>
                      {language === "uk" ? "Всі" : "All"}
                    </Text>
                  </Pressable>
                  {CATEGORIES.map(cat => (
                    <Pressable key={cat.key} onPress={() => setFilterCat(cat.key)}
                      style={[styles.filterChip, filterCat === cat.key && { backgroundColor: cat.bg, borderColor: cat.color }]}>
                      <Ionicons name={cat.icon as any} size={13} color={filterCat === cat.key ? cat.color : Colors.textSecondary} />
                      <Text style={[styles.filterChipText, filterCat === cat.key && { color: cat.color, fontFamily: "Inter_600SemiBold" }]}>
                        {language === "uk" ? cat.labelUk : cat.labelEn}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.filterEmpty}>
                <Text style={styles.filterEmptyText}>
                  {language === "uk" ? "Немає документів у цій категорії" : "No documents in this category"}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Category picker modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify()} style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {language === "uk" ? "Оберіть категорію" : "Select Category"}
            </Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.key} onPress={() => handleCategorySelected(cat.key)} style={styles.catOption}>
                <View style={[styles.catOptionIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={styles.catOptionText}>{language === "uk" ? cat.labelUk : cat.labelEn}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  listContent: { padding: 16 },
  storageInfo: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10,
    backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 10,
  },
  storageText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  filterScroll: { flexGrow: 0, marginBottom: 14 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  filterEmpty: { alignItems: "center", paddingVertical: 32 },
  filterEmptyText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  documentCard: {
    backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 10,
    flexDirection: "row", alignItems: "center", padding: 14, gap: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  docIconContainer: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20 },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  docDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  docMetaSep: { fontSize: 12, color: Colors.textTertiary },
  docSize: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyButton: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8,
  },
  emptyButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center", marginBottom: 16 },
  catOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catOptionText: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.text },
});
