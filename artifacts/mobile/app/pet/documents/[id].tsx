import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { usePets, Document, DocumentCategory } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { parseDate } from "@/utils/notifications";

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

function isImage(type: string, uri: string): boolean {
  return type.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(uri);
}

function isPDF(type: string): boolean {
  return type.includes("pdf");
}

function formatDocDate(dateStr: string, lang: "uk" | "en"): string {
  if (!dateStr) return "";
  let d: Date | null = parseDate(dateStr);
  if (!d) {
    const raw = new Date(dateStr);
    if (!isNaN(raw.getTime())) d = raw;
  }
  if (!d) return dateStr;
  try {
    return new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function autoDocName(dateISO: string, lang: "uk" | "en"): string {
  const d = parseDate(dateISO) ?? new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return lang === "uk" ? `Документ ${day}.${month}.${year}` : `Document ${day}.${month}.${year}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

// ─── Full-screen Document Viewer ──────────────────────────────────────────────
function DocumentViewer({
  doc,
  onClose,
  onDelete,
  language,
}: {
  doc: Document;
  onClose: () => void;
  onDelete: () => void;
  language: "uk" | "en";
}) {
  const insets = useSafeAreaInsets();
  const isImg = isImage(doc.type, doc.uri);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(0.8, savedScale.value * e.scale);
    })
    .onEnd(() => {
      const clamped = Math.max(1, Math.min(scale.value, 5));
      scale.value = withSpring(clamped);
      savedScale.value = clamped;
      if (clamped === 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (scale.value > 1.05) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        translateY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd(e => {
      if (scale.value <= 1.05) {
        if (e.translationY > 100) {
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0);
        }
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const composed = isImg
    ? Gesture.Simultaneous(pinchGesture, panGesture)
    : Gesture.Pan().onEnd(e => { if (e.translationY > 100) runOnJS(onClose)(); });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handleShare = async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("", language === "uk" ? "Поширення недоступне на цьому пристрої" : "Sharing not available on this device");
        return;
      }
      await Sharing.shareAsync(doc.uri, { dialogTitle: doc.name });
    } catch {
      Alert.alert("", language === "uk" ? "Не вдалося поділитися файлом" : "Could not share file");
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      language === "uk" ? "Видалити документ?" : "Delete document?",
      language === "uk" ? "Цю дію неможливо скасувати" : "This action cannot be undone",
      [
        { text: language === "uk" ? "Скасувати" : "Cancel", style: "cancel" },
        { text: language === "uk" ? "Видалити" : "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  };

  return (
    <View style={viewerStyles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={[viewerStyles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onClose} hitSlop={10} style={viewerStyles.headerBtn}>
          <MaterialCommunityIcons name="close" size={26} color="#fff" />
        </Pressable>
        <Text style={viewerStyles.headerTitle} numberOfLines={1}>{doc.name}</Text>
        <Pressable onPress={confirmDelete} hitSlop={10} style={viewerStyles.headerBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF6B6B" />
        </Pressable>
      </View>

      {/* Content */}
      <GestureDetector gesture={composed}>
        <View style={viewerStyles.content}>
          {isImg ? (
            <Animated.Image
              source={{ uri: doc.uri }}
              style={[viewerStyles.fullImage, animatedStyle]}
              resizeMode="contain"
            />
          ) : (
            <Animated.View style={[viewerStyles.pdfWrap, animatedStyle]}>
              <View style={viewerStyles.pdfIconBg}>
                <MaterialCommunityIcons name="file-document" size={64} color="#FF6B6B" />
              </View>
              <Text style={viewerStyles.pdfName}>{doc.name}</Text>
              {isPDF(doc.type) && (
                <Text style={viewerStyles.pdfHint}>
                  {language === "uk" ? "Вміст PDF не відображається у застосунку" : "PDF content is not rendered in the app"}
                </Text>
              )}
            </Animated.View>
          )}
        </View>
      </GestureDetector>

      {/* Bottom bar */}
      <View style={[viewerStyles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={handleShare} style={viewerStyles.shareBtn}>
          <MaterialCommunityIcons name="share-variant-outline" size={20} color="#fff" />
          <Text style={viewerStyles.shareBtnText}>{language === "uk" ? "Поділитися" : "Share"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const viewerStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 10,
  },
  headerBtn: { padding: 10, minWidth: 44, alignItems: "center" },
  headerTitle: {
    flex: 1, fontSize: 15, fontFamily: "Inter_500Medium",
    color: "#fff", textAlign: "center", marginHorizontal: 4,
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  fullImage: { width: "100%", height: "100%" },
  pdfWrap: { alignItems: "center", paddingHorizontal: 32 },
  pdfIconBg: {
    width: 120, height: 120, borderRadius: 28,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  pdfName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff", textAlign: "center", marginBottom: 12 },
  pdfHint: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center" },
  bottomBar: {
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingTop: 12, alignItems: "center",
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 16,
  },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPet, addDocument, deleteDocument } = usePets();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

  const [filterCat, setFilterCat] = useState<DocumentCategory | "all">("all");
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null);

  // Add document form state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; type: string; size?: number } | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<DocumentCategory>("other");
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const pet = getPet(id);

  const addModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 50) closeAddModal();
      },
    })
  ).current;

  const openAddModal = (file: { uri: string; type: string; size?: number }) => {
    setPendingFile(file);
    setDocName("");
    setDocCategory("other");
    setDocDate(new Date().toISOString().split("T")[0]);
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setPendingFile(null);
  };

  const handleSaveDocument = async () => {
    if (!pendingFile || !pet) return;
    const name = docName.trim() || autoDocName(docDate, language);
    await addDocument(id, {
      name,
      uri: pendingFile.uri,
      type: pendingFile.type,
      date: docDate,
      size: pendingFile.size,
      category: docCategory,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeAddModal();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert(t.permissionTitle, t.cameraDenied); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      openAddModal({ uri: result.assets[0].uri, type: "image/jpeg" });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      openAddModal({ uri: result.assets[0].uri, type: "image/jpeg" });
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        openAddModal({ uri: asset.uri, type: asset.mimeType ?? "application/octet-stream", size: asset.size });
      }
    } catch {
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

  const handleDeleteDoc = (doc: Document) => {
    if (!pet) return;
    Alert.alert(
      language === "uk" ? "Видалити документ?" : "Delete document?",
      language === "uk" ? "Цю дію неможливо скасувати" : "This action cannot be undone",
      [
        { text: language === "uk" ? "Скасувати" : "Cancel", style: "cancel" },
        {
          text: language === "uk" ? "Видалити" : "Delete",
          style: "destructive",
          onPress: () => {
            if (viewerDoc?.id === doc.id) setViewerDoc(null);
            deleteDocument(pet.id, doc.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${t.documents} • ${pet?.name ?? ""}`,
      headerRight: () => (
        <Pressable onPress={showAddOptions} style={{ marginRight: 4 }}>
          <MaterialCommunityIcons name="plus" size={26} color={Colors.primary} />
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

  function DocumentCard({ item, index }: { item: Document; index: number }) {
    const catInfo = getCategoryInfo(item.category);
    const isImg = isImage(item.type, item.uri);
    const isPdf = isPDF(item.type);

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable
          style={({ pressed }) => [styles.documentCard, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewerDoc(item);
          }}
        >
          {/* Thumbnail or icon */}
          {isImg ? (
            <Image source={{ uri: item.uri }} style={styles.docThumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.docIconContainer, { backgroundColor: isPdf ? "#FFF0F0" : catInfo.bg }]}>
              <MaterialCommunityIcons
                name={isPdf ? "document" : (catInfo.icon as any)}
                size={28}
                color={isPdf ? "#FF6B6B" : catInfo.color}
              />
            </View>
          )}

          {/* Info */}
          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.docMeta}>
              <View style={[styles.catPill, { backgroundColor: catInfo.bg }]}>
                <Text style={[styles.catPillText, { color: catInfo.color }]}>
                  {language === "uk" ? catInfo.labelUk : catInfo.labelEn}
                </Text>
              </View>
            </View>
            <Text style={styles.docDate}>{formatDocDate(item.date, language)}</Text>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => handleDeleteDoc(item)}
              hitSlop={8}
              style={styles.cardActionBtn}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.textTertiary} />
            </Pressable>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textTertiary} style={{ marginTop: 8 }} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {allDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="folder-open-outline" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t.noDocuments}</Text>
            <Text style={styles.emptySubtitle}>
              {language === "uk"
                ? `Збережіть ветеринарні документи, паспорти і результати аналізів для ${pet.name}`
                : `Save vet documents, passports and test results for ${pet.name}`}
            </Text>
            <Pressable onPress={showAddOptions} style={styles.emptyButton}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={18} color={Colors.textLight} />
              <Text style={styles.emptyButtonText}>{t.addDocument}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredDocs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <DocumentCard item={item} index={index} />}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.storageInfo}>
                  <MaterialCommunityIcons name="folder" size={16} color={Colors.primary} />
                  <Text style={styles.storageText}>{t.docCount(allDocs.length)}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <Pressable onPress={() => setFilterCat("all")} style={[styles.filterChip, filterCat === "all" && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, filterCat === "all" && styles.filterChipTextActive]}>
                      {language === "uk" ? "Всі" : "All"}
                    </Text>
                  </Pressable>
                  {CATEGORIES.map(cat => (
                    <Pressable
                      key={cat.key}
                      onPress={() => setFilterCat(cat.key)}
                      style={[styles.filterChip, filterCat === cat.key && { backgroundColor: cat.bg, borderColor: cat.color }]}
                    >
                      <MaterialCommunityIcons name={cat.icon as any} size={13} color={filterCat === cat.key ? cat.color : Colors.textSecondary} />
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

      {/* ── Full-screen Viewer Modal ── */}
      <Modal
        visible={!!viewerDoc}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setViewerDoc(null)}
      >
        {viewerDoc && (
          <DocumentViewer
            key={viewerDoc.id}
            doc={viewerDoc}
            onClose={() => setViewerDoc(null)}
            onDelete={() => {
              if (!pet) return;
              const docId = viewerDoc.id;
              setViewerDoc(null);
              setTimeout(() => {
                deleteDocument(pet.id, docId);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }, 350);
            }}
            language={language}
          />
        )}
      </Modal>

      {/* ── Add Document Modal ── */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAddModal}
      >
        <View style={styles.addModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAddModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
          <Animated.View entering={FadeInDown.springify()} style={[styles.addModalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View {...addModalPanResponder.panHandlers} style={styles.handleWrap}>
              <View style={styles.modalHandle} />
            </View>

            {/* Header */}
            <View style={styles.addModalHeader}>
              <Pressable onPress={closeAddModal} style={styles.addModalClose}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.addModalTitle}>
                {language === "uk" ? "Новий документ" : "New Document"}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* File preview */}
              {pendingFile && (
                <View style={styles.previewWrap}>
                  {isImage(pendingFile.type, pendingFile.uri) ? (
                    <Image source={{ uri: pendingFile.uri }} style={styles.previewImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.previewIconWrap}>
                      <MaterialCommunityIcons name={isPDF(pendingFile.type) ? "document" : "document-attach"} size={48} color={isPDF(pendingFile.type) ? "#FF6B6B" : Colors.primary} />
                      <Text style={styles.previewIconLabel}>{isPDF(pendingFile.type) ? "PDF" : (language === "uk" ? "Файл" : "File")}</Text>
                    </View>
                  )}
                  {pendingFile.size ? (
                    <Text style={styles.previewSize}>{formatFileSize(pendingFile.size)}</Text>
                  ) : null}
                </View>
              )}

              {/* Name input */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{language === "uk" ? "Назва документу" : "Document Name"}</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.textInput}
                    value={docName}
                    onChangeText={setDocName}
                    placeholder={autoDocName(docDate, language)}
                    placeholderTextColor={Colors.textTertiary}
                    returnKeyType="done"
                    maxLength={80}
                  />
                </View>
              </View>

              {/* Category picker */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{language === "uk" ? "Категорія" : "Category"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.map(cat => {
                    const active = docCategory === cat.key;
                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => { setDocCategory(cat.key); Haptics.selectionAsync(); }}
                        style={[styles.catChip, active && { backgroundColor: cat.bg, borderColor: cat.color }]}
                      >
                        <MaterialCommunityIcons name={cat.icon as any} size={15} color={active ? cat.color : Colors.textSecondary} />
                        <Text style={[styles.catChipText, active && { color: cat.color, fontFamily: "Inter_600SemiBold" }]}>
                          {language === "uk" ? cat.labelUk : cat.labelEn}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date picker */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{language === "uk" ? "Дата документу" : "Document Date"}</Text>
                <View style={styles.inputCard}>
                  <DatePickerField
                    value={docDate}
                    onChange={setDocDate}
                    placeholder={language === "uk" ? "Оберіть дату" : "Select date"}
                    label={language === "uk" ? "Дата документу" : "Document Date"}
                    maximumDate={new Date()}
                  />
                </View>
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSaveDocument}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{language === "uk" ? "Зберегти" : "Save"}</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
          </KeyboardAvoidingView>
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

  // Document card
  documentCard: {
    backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 10,
    flexDirection: "row", alignItems: "center", padding: 12, gap: 12,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  docThumbnail: { width: 62, height: 62, borderRadius: 12 },
  docIconContainer: { width: 62, height: 62, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20, marginBottom: 4 },
  docMeta: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  docDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  cardActions: { alignItems: "center" },
  cardActionBtn: { padding: 4 },

  // Empty state
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

  // Add Modal
  addModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  addModalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 8, maxHeight: "90%",
  },
  handleWrap: { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  addModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  addModalClose: { padding: 8 },
  addModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },

  // File preview in add modal
  previewWrap: { alignItems: "center", marginBottom: 16 },
  previewImage: { width: 180, height: 180, borderRadius: 16, marginBottom: 6 },
  previewIconWrap: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: Colors.background, alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  previewIconLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 4 },
  previewSize: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary },

  // Form fields
  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputCard: {
    backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  textInput: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    padding: 0, margin: 0,
  },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, marginRight: 8,
    backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border,
  },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },

  // Save button
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 16, marginTop: 8, marginBottom: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
