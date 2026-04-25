import React, { createContext, useContext, useEffect, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

// ── Shared context ────────────────────────────────────────────────────────────
// Null when rendered outside ClassicTabLayout — SwipeTabZones silently no-ops.

type TabNavContextType = {
  currentIndex: number;
  tabCount: number;
  goToTab: (index: number) => void;
};

export const TabNavContext = createContext<TabNavContextType | null>(null);

// ── SwipeTabZones ─────────────────────────────────────────────────────────────

const ZONE_WIDTH = 40;

export function SwipeTabZones() {
  const ctx = useContext(TabNavContext);

  // If not inside ClassicTabLayout (e.g. NativeTabLayout on iOS LiquidGlass),
  // render nothing — native swipe is already handled by the system.
  if (!ctx) return null;

  return <SwipeZonesInner ctx={ctx} />;
}

// Separate inner component so hooks are only called when ctx is present.
function SwipeZonesInner({ ctx }: { ctx: TabNavContextType }) {
  const { currentIndex, tabCount, goToTab } = ctx;

  // Stable refs so PanResponder callbacks (created once) always read fresh values.
  const indexRef = useRef(currentIndex);
  const countRef = useRef(tabCount);
  const goRef = useRef(goToTab);

  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { countRef.current = tabCount; }, [tabCount]);
  useEffect(() => { goRef.current = goToTab; }, [goToTab]);

  const leftPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Claim gesture only when clearly horizontal (|dx| > |dy|*2 and > 10 px)
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        const adx = Math.abs(dx);
        return adx > 10 && adx > Math.abs(dy) * 2;
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        // Left-edge zone: swiping right → go to previous tab (wraps around)
        if (dx > 40 || vx > 0.5) {
          goRef.current((indexRef.current - 1 + countRef.current) % countRef.current);
        }
      },
    })
  ).current;

  const rightPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        const adx = Math.abs(dx);
        return adx > 10 && adx > Math.abs(dy) * 2;
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        // Right-edge zone: swiping left → go to next tab (wraps around)
        if (dx < -40 || vx < -0.5) {
          goRef.current((indexRef.current + 1) % countRef.current);
        }
      },
    })
  ).current;

  return (
    <>
      <View style={[styles.zone, styles.left]} {...leftPan.panHandlers} />
      <View style={[styles.zone, styles.right]} {...rightPan.panHandlers} />
    </>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: ZONE_WIDTH,
  },
  left: { left: 0 },
  right: { right: 0 },
});
