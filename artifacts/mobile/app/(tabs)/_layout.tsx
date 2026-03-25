import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <Label>{t.pets}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reminders">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>{t.reminders}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cog">
        <Icon sf={{ default: "gear", selected: "gear" }} />
        <Label>{t.settings}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.surface,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: Colors.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.pets,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="pawprint.fill" tintColor={color} size={24} />
            ) : (
              <MaterialCommunityIcons name="paw" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: t.reminders,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bell.fill" tintColor={color} size={24} />
            ) : (
              <MaterialCommunityIcons name="bell" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="cog"
        options={{
          title: t.settings,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gear" tintColor={color} size={24} />
            ) : (
              <MaterialCommunityIcons name="cog-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
