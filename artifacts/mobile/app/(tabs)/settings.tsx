import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Language, useLanguage } from "@/context/LanguageContext";

export default function SettingsScreen() {
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleLanguage = (lang: Language) => {
    Haptics.selectionAsync();
    setLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <Animated.View entering={FadeInUp.delay(100)}>
          <Text style={styles.headerTitle}>{t.settings}</Text>
          <Text style={styles.headerSubtitle}>{t.appName}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 100 : 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionLabel}>{t.language}</Text>
          <View style={styles.card}>
            <Pressable
              onPress={() => handleLanguage("uk")}
              style={[styles.langRow, language === "uk" && styles.langRowActive]}
            >
              <Text style={styles.flagText}>🇺🇦</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langName, language === "uk" && styles.langNameActive]}>
                  Українська
                </Text>
                <Text style={styles.langSubtitle}>Хвостик</Text>
              </View>
              {language === "uk" ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={14} color={Colors.textLight} />
                </View>
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={() => handleLanguage("en")}
              style={[styles.langRow, language === "en" && styles.langRowActive]}
            >
              <Text style={styles.flagText}>🇬🇧</Text>
              <View style={styles.langInfo}>
                <Text style={[styles.langName, language === "en" && styles.langNameActive]}>
                  English
                </Text>
                <Text style={styles.langSubtitle}>Tailsy</Text>
              </View>
              {language === "en" ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={14} color={Colors.textLight} />
                </View>
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160)}>
          <Text style={styles.sectionLabel}>{t.about}</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <View style={styles.aboutIconBg}>
                <Ionicons name="heart" size={22} color={Colors.primary} />
              </View>
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutName}>{t.appName}</Text>
                <Text style={styles.aboutSub}>{t.version} 1.0.0</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutDescRow}>
              <Text style={styles.aboutDesc}>
                {language === "uk"
                  ? "Додаток для зберігання медичних даних ваших домашніх тварин. Вакцинації, документи, нагадування — всі в одному місці."
                  : "An app for storing your pets' medical data. Vaccinations, documents, reminders — all in one place."}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220)}>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              {language === "uk"
                ? "Всі ваші дані зберігаються лише на вашому пристрої"
                : "All your data is stored only on your device"}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textLight,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingTop: 20,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  langRowActive: {
    backgroundColor: Colors.primaryLight,
  },
  flagText: {
    fontSize: 28,
  },
  langInfo: {
    flex: 1,
  },
  langName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  langNameActive: {
    color: Colors.primary,
  },
  langSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  aboutIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutInfo: {
    flex: 1,
  },
  aboutName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  aboutSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  aboutDescRow: {
    padding: 16,
    paddingTop: 0,
  },
  aboutDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
    lineHeight: 18,
  },
});
