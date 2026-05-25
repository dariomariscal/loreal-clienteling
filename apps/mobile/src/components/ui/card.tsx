import * as React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/theme";

interface CardProps extends ViewProps {
  elevation?: "xs" | "sm" | "md";
  padded?: boolean;
}

// Card — white surface, hairline ring, shadow-based elevation.
// Mirror of apps/web/components/ui/card.tsx: ring-1 ring-foreground/6 +
// shadow-sm baseline, no opaque border.
export function Card({
  elevation = "sm",
  padded = true,
  style,
  children,
  ...props
}: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        theme.elevation[elevation],
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius["2xl"],
          padding: padded ? theme.spacing[5] : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
