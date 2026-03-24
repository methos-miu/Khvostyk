import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { usePets, Document } from "@/context/PetsContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/notifications";

function getDocumentIcon(type: string): { name: string; color: string; bg: string } {
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

  const pet = getPet(id);

  const saveImageAsDocument = async (uri: string, fileName: string) => {
    await addDocument(id, {
      name: fileName,
      uri,
      type: "image/jpeg",
      date: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionTitle, t.cameraDenied);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const timestamp = new Date().toLocaleDateString(language === "uk" ? "uk-UA" : "en-GB");
      await saveImageAsDocument(result.assets[0].uri, `${language === "uk" ? "Фото" : "Photo"} ${timestamp}.jpg`);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const timestamp = new Date().toLocaleDateString(language === "uk" ? "uk-UA" : "en-GB");
      await saveImageAsDocument(result.assets[0].uri, `${language === "uk" ? "Зображення" : "Image"} ${timestamp}.jpg`);
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf", "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addDocument(id, {
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType ?? "application/octet-stream",
          date: new Date().toISOString(),
          size: asset.size,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert("", language === "uk" ? "Не вдалося завантажити документ" : "Could not load document");
    }
  };

  const showAddOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t.addDocument,
      "",
      [
        { text: t.docTakePhoto, onPress: takePhoto },
        { text: t.docGallery, onPress: pickFromGallery },
        { text: t.docFiles, onPress: pickFromFiles },
        { text: t.cancel, style: "cancel" },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${t.documents} • ${pet?.name ?? ""}`,
      headerRight: () => (
        <Pressable
          onPress={showAddOptions}
          style={{ marginRight: 4 }}
        >
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

  function DocumentItem({ item, index }: { item: Document; index: number }) {
    const icon = getDocumentIcon(item.type);

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <View style={styles.documentCard}>
          <View style={[styles.docIconContainer, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name as any} size={26} color={icon.color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.docMeta}>
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
              Alert.alert(
                t.deleteDoc,
                t.deleteDocConfirm,
                [
                  { text: t.cancel, style: "cancel" },
                  {
                    text: t.delete,
                    style: "destructive",
                    onPress: () => deleteDocument(pet.id, item.id),
                  },
                ]
              );
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
    <View style={styles.container}>
      {pet.documents.length === 0 ? (
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
          data={pet.documents}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <DocumentItem item={item} index={index} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.storageInfo}>
              <Ionicons name="folder" size={16} color={Colors.primary} />
              <Text style={styles.storageText}>{t.docCount(pet.documents.length)}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  listContent: { padding: 16 },
  storageInfo: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14,
    backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 10,
  },
  storageText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  documentCard: {
    backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 10,
    flexDirection: "row", alignItems: "center", padding: 14, gap: 14,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 4,
  },
  docIconContainer: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20 },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  docDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  docMetaSep: { fontSize: 12, color: Colors.textTertiary },
  docSize: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 20, marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8,
  },
  emptyButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textLight },
});
