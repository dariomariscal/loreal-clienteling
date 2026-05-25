import * as React from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
} from "react-native-reanimated";

import { useTheme } from "@/theme";

// Three-column iPad-landscape shell. Mirrors Apple's NavigationSplitView
// (sidebar + content + detail) used by Mail/Notes on iPad Pro.
//
// Widths follow HIG sidebar (320pt) + content (360pt) + detail (rest) on
// the 13" iPad Pro (1376pt landscape). The shell never adapts destructively
// — at narrow widths the sidebar/master collapse to overlays so the detail
// keeps the user's working state.
//
// Breakpoints:
//   ≥ 1180pt → expanded sidebar (320) + master (360) + detail (rest)
//   920–1180 → icon-rail sidebar (72)  + master (340) + detail (rest)
//   600–920  → icon-rail sidebar (72)  + detail full;  master via overlay
//   < 600    → caller should fall back to a stacked layout (we still render
//              the icon rail + detail, no master)

export type ShellBreakpoint = "expanded" | "compact" | "narrow";

interface SplitShellProps {
  sidebar: React.ReactNode;
  master?: React.ReactNode;
  detail: React.ReactNode;
}

export function SplitShell({ sidebar, master, detail }: SplitShellProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const bp = resolveBreakpoint(width);
  const [overlayOpen, setOverlayOpen] = React.useState(false);

  const sidebarWidth = bp === "expanded" ? 320 : 72;
  const masterWidth = bp === "expanded" ? 360 : 340;
  const showMasterInline = bp !== "narrow" && !!master;
  const showMasterOverlay = bp === "narrow" && !!master && overlayOpen;

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.row}>
        {/* Col 1 — Sidebar */}
        <View
          style={[
            styles.column,
            {
              width: sidebarWidth,
              backgroundColor: theme.colors.sidebar,
              borderRightColor: theme.colors.sidebarBorder,
            },
          ]}
        >
          {React.isValidElement(sidebar)
            ? React.cloneElement(sidebar as React.ReactElement<any>, {
                collapsed: bp !== "expanded",
                onRequestMaster:
                  bp === "narrow" ? () => setOverlayOpen(true) : undefined,
              })
            : sidebar}
        </View>

        {/* Col 2 — Master (inline on expanded/compact) */}
        {showMasterInline ? (
          <View
            style={[
              styles.column,
              {
                width: masterWidth,
                backgroundColor: theme.colors.surface,
                borderRightColor: theme.colors.borderSoft,
              },
            ]}
          >
            {master}
          </View>
        ) : null}

        {/* Col 3 — Detail (flex remainder) */}
        <View
          style={[
            styles.detail,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {detail}
        </View>

        {/* Master overlay (narrow only) */}
        {showMasterOverlay ? (
          <>
            <AnimatedPressable
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(140)}
              onPress={() => setOverlayOpen(false)}
              style={[
                StyleSheet.absoluteFillObject,
                styles.scrim,
                { left: sidebarWidth },
              ]}
            />
            <Animated.View
              entering={SlideInLeft.duration(220)}
              exiting={SlideOutLeft.duration(180)}
              style={[
                styles.overlayMaster,
                {
                  left: sidebarWidth,
                  width: masterWidth,
                  backgroundColor: theme.colors.surface,
                  borderRightColor: theme.colors.borderSoft,
                  ...theme.elevation.lg,
                },
              ]}
            >
              {master}
            </Animated.View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function resolveBreakpoint(width: number): ShellBreakpoint {
  if (width >= 1180) return "expanded";
  if (width >= 920) return "compact";
  return "narrow";
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flex: 1, flexDirection: "row" },
  column: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  detail: { flex: 1 },
  scrim: {
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  overlayMaster: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
