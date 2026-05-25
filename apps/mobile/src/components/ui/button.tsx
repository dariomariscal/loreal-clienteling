import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/theme";

import { Text } from "./text";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "default" | "sm" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

// Stripe easing — same cubic-bezier(0, 0.09, 0.4, 1) the web app uses.
const STRIPE_EASE = Easing.bezier(0, 0.09, 0.4, 1);

export function Button({
  label,
  variant = "primary",
  size = "default",
  loading,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth,
  style,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const press = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(press.value, { duration: 120, easing: STRIPE_EASE }) }],
    opacity: withTiming(disabled || loading ? 0.5 : 1, { duration: 150, easing: STRIPE_EASE }),
  }));

  const sizeStyle = SIZE[size];
  const palette = getPalette(variant, theme);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPressIn={(e) => {
        press.value = 1;
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press.value = 0;
        onPressOut?.(e);
      }}
      style={[
        styles.base,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.padX,
          borderRadius: theme.radius.lg,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        fullWidth && { alignSelf: "stretch" },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {leadingIcon ? <View style={{ marginRight: 8 }}>{leadingIcon}</View> : null}
          <Text
            variant={size === "sm" ? "smallMedium" : "bodyMedium"}
            style={{ color: palette.fg }}
          >
            {label}
          </Text>
          {trailingIcon ? <View style={{ marginLeft: 8 }}>{trailingIcon}</View> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE: Record<Size, { height: number; padX: number }> = {
  sm: { height: 32, padX: 12 },
  default: { height: 44, padX: 18 },
  lg: { height: 52, padX: 22 },
};

function getPalette(variant: Variant, theme: ReturnType<typeof useTheme>) {
  switch (variant) {
    case "primary":
      return {
        bg: theme.colors.primary,
        fg: theme.colors.primaryForeground,
        border: theme.colors.primary,
      };
    case "accent":
      return {
        bg: theme.colors.accent,
        fg: theme.colors.accentForeground,
        border: theme.colors.accent,
      };
    case "secondary":
      return {
        bg: theme.colors.secondary,
        fg: theme.colors.secondaryForeground,
        border: theme.colors.border,
      };
    case "ghost":
      return {
        bg: "transparent",
        fg: theme.colors.foreground,
        border: "transparent",
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
});
