import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { TabNavContext } from "@/components/SwipeTabZones";

import PetsScreen from "./index";
import RemindersScreen from "./reminders";
import SettingsScreen from "./settings";

// ─── NativeTabLayout (iOS LiquidGlass — swipe handled natively) ──────────────

function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <Label>{t.pets}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reminders">
        <Icon sf={{ default: "calendar", selected: "calendar.fill" }} />
        <Label>{t.eventsTabLabel}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gear", selected: "gear" }} />
        <Label>{t.settings}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── ClassicTabLayout ─────────────────────────────────────────────────────────

function ClassicTabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isIOS = Platform.OS === "ios";

  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const tabs = [
    {
      key: "index",
      label: t.pets,
      // Active icon (filled), inactive icon (outline) for visual distinction
      mdIconActive: "paw" as const,
      mdIconInactive: "paw" as const,       // no outline variant in MDI
      sfDefault: "pawprint",
      sfSelected: "pawprint.fill",
      Component: PetsScreen,
    },
    {
      key: "reminders",
      label: t.eventsTabLabel,
      mdIconActive: "calendar-check" as const,
      mdIconInactive: "calendar-outline" as const,
      sfDefault: "calendar",
      sfSelected: "calendar",
      Component: RemindersScreen,
    },
    {
      key: "settings",
      label: t.settings,
      mdIconActive: "cog" as const,
      mdIconInactive: "cog-outline" as const,
      sfDefault: "gear",
      sfSelected: "gear",
      Component: SettingsScreen,
    },
  ];

  const N = tabs.length; // 3

  // ── Circular pager via virtual pages ────────────────────────────────────────
  // Layout: [clone_last, tab0, tab1, tab2, clone_first]
  //          v0           v1    v2    v3    v4
  // Start at x = 1*width (v1 = Pets).
  // On settling at v0 → jump to v3 (real Settings) without animation.
  // On settling at v4 → jump to v1 (real Pets) without animation.
  const virtualTabs = [tabs[N - 1], ...tabs, tabs[0]];

  const tapTo = useCallback((index: number) => {
    setActiveIndex(index);
    // Virtual position = real index + 1
    scrollRef.current?.scrollTo({ x: (index + 1) * widthRef.current, animated: true });
  }, []);

  // Ensure correct initial scroll position on all platforms (web needs imperative call)
  useEffect(() => {
    if (pagerHeight > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: widthRef.current, animated: false });
      });
    }
  }, [pagerHeight]);

  // Shared handler for both onMomentumScrollEnd (native) and onScrollEndDrag (web/slow swipe)
  const handlePageChange = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const w = widthRef.current;
    const vIdx = Math.round(e.nativeEvent.contentOffset.x / w);
    if (vIdx === 0) {
      // Swiped past first → wrap to last
      setActiveIndex(N - 1);
      scrollRef.current?.scrollTo({ x: N * w, animated: false });
    } else if (vIdx === N + 1) {
      // Swiped past last → wrap to first
      setActiveIndex(0);
      scrollRef.current?.scrollTo({ x: w, animated: false });
    } else {
      setActiveIndex(vIdx - 1);
    }
  }, [N]);

  return (
    <TabNavContext.Provider value={{ currentIndex: activeIndex, tabCount: N, goToTab: tapTo }}>
      <View style={{ flex: 1 }}>

        {/* Pager */}
        <View
          style={{ flex: 1, overflow: "hidden" }}
          onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        >
          {pagerHeight > 0 && (
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              directionalLockEnabled={true}
              scrollsToTop={false}
              style={{ width, height: pagerHeight }}
              onMomentumScrollEnd={handlePageChange}
              onScrollEndDrag={handlePageChange}
            >
              {virtualTabs.map(({ key, Component }, vIdx) => (
                <View key={`v${vIdx}`} style={{ width, height: pagerHeight }}>
                  <Component />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Tab bar */}
        <View
          style={[
            styles.tabBar,
            { paddingBottom: insets.bottom > 0 ? Math.min(insets.bottom, 10) : 6 },
          ]}
        >
          {isIOS && (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          )}
          {!isIOS && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          )}
          {tabs.map(({ key, label, mdIconActive, mdIconInactive, sfDefault, sfSelected }, index) => {
            const isActive = activeIndex === index;
            const color = isActive ? Colors.primary : Colors.tabBarInactive;
            return (
              <Pressable key={key} style={styles.tabItem} onPress={() => tapTo(index)}>
                <View style={[styles.tabPill, isActive && styles.tabPillActive]}>
                  {isIOS ? (
                    <SymbolView
                      name={isActive ? sfSelected : sfDefault}
                      tintColor={color}
                      size={26}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={isActive ? mdIconActive : mdIconInactive}
                      size={26}
                      color={color}
                    />
                  )}
                  <Text style={[styles.tabLabel, { color }]}>{label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

      </View>
    </TabNavContext.Provider>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    backgroundColor: "transparent",
    shadowColor: "#3D1C02",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
    width: 112,
    height: 72,
    borderRadius: 22,
    gap: 4,
    backgroundColor: "rgba(61,28,2,0.06)",
  },
  tabPillActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  tabLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
