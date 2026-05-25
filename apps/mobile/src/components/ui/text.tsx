import * as React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTheme, type TypographyToken } from "@/theme";

type ColorToken =
  | "foreground"
  | "foregroundMuted"
  | "foregroundSubtle"
  | "accent"
  | "primaryForeground"
  | "destructive"
  | "sidebarForeground"
  | "sidebarMuted";

export interface TextProps extends RNTextProps {
  variant?: TypographyToken;
  color?: ColorToken;
}

// Single Text component — every text in the app routes through here so
// the type ramp stays consistent. Variant defaults to "body".
export function Text({
  variant = "body",
  color = "foreground",
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        style,
      ]}
      {...props}
    />
  );
}
