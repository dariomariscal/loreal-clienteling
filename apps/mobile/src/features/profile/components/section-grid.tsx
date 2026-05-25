import * as React from "react";
import { StyleSheet, View } from "react-native";

import { useDetailBodyWidth } from "@/components/layout";

// 2-col grid that collapses to 1 col when the detail body is narrow.
// Mirrors Apple's "regular vs compact width" behavior inside a single
// detail pane — the grid is structural in landscape, stacked in portrait
// or split-view.

const STACK_BELOW = 640;
const GUTTER = 16;

interface SectionGridProps {
  children: React.ReactNode;
}

export function SectionGrid({ children }: SectionGridProps) {
  const width = useDetailBodyWidth();
  const stacked = width > 0 && width < STACK_BELOW;
  const items = React.Children.toArray(children);

  return (
    <View
      style={[
        styles.row,
        stacked ? { flexDirection: "column", gap: GUTTER } : { gap: GUTTER },
      ]}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={
            stacked
              ? { width: "100%" }
              : { flex: 1, minWidth: 0 }
          }
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
});
