import * as React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";

import { Text } from "./text";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
  trailingAccessory?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextInputProps["style"];
}

// Field — label + input + hint/error. The input itself is a borderless
// TextInput nested inside a container that owns the border, so trailing
// icons / password toggle can live on the right without breaking focus
// state. Focus ring is a 3px tinted ring (matches web BA shell).
export function Input({
  label,
  hint,
  errorText,
  leadingIcon,
  trailingAccessory,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  editable = true,
  ...props
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const hasError = !!errorText;
  const borderColor = hasError
    ? theme.colors.destructive
    : focused
    ? theme.colors.accent
    : theme.colors.input;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="smallMedium" color="foreground" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.container,
          {
            borderColor,
            backgroundColor: editable ? theme.colors.background : theme.colors.muted,
            borderRadius: theme.radius.lg,
          },
          focused && !hasError && { borderWidth: 1.5 },
          hasError && { borderWidth: 1.5 },
        ]}
      >
        {leadingIcon ? <View style={styles.leading}>{leadingIcon}</View> : null}

        <TextInput
          ref={inputRef}
          editable={editable}
          placeholderTextColor={theme.colors.foregroundSubtle}
          selectionColor={theme.colors.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            theme.typography.body,
            styles.input,
            { color: theme.colors.foreground },
            inputStyle,
          ]}
          {...props}
        />

        {trailingAccessory ? <View style={styles.trailing}>{trailingAccessory}</View> : null}
      </Pressable>

      {errorText ? (
        <Text variant="caption" color="destructive" style={styles.hint}>
          {errorText}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="foregroundMuted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  leading: {
    marginRight: 10,
  },
  trailing: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  hint: {
    marginTop: 6,
  },
});
