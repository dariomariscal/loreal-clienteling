import * as React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { Text } from "./text";
import { useTheme } from "@/theme";

interface DividerProps extends ViewProps {
  label?: string;
}

// Hairline divider. Optional label centered on the line (used in
// sign-in to split "email/password" from "SSO" — common iPad pattern).
export function Divider({ label, style, ...props }: DividerProps) {
  const theme = useTheme();

  if (!label) {
    return (
      <View
        style={[
          {
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.border,
          },
          style,
        ]}
        {...props}
      />
    );
  }

  return (
    <View style={[styles.labeled, style]} {...props}>
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
        }}
      />
      <Text variant="caption" color="foregroundSubtle" style={styles.label}>
        {label}
      </Text>
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labeled: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    marginHorizontal: 12,
  },
});
