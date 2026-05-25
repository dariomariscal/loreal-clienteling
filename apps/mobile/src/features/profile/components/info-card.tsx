import * as React from "react";
import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ui";
import { useTheme } from "@/theme";

interface InfoCardProps {
  eyebrow?: string;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}

export function InfoCard({ eyebrow, title, hint, children }: InfoCardProps) {
  return (
    <Card padded>
      {eyebrow ? (
        <Text variant="eyebrow" color="foregroundMuted">
          {eyebrow}
        </Text>
      ) : null}
      <Text
        variant="title"
        color="foreground"
        style={{ marginTop: eyebrow ? 6 : 0 }}
      >
        {title}
      </Text>
      {hint ? (
        <Text variant="small" color="foregroundMuted" style={{ marginTop: 4 }}>
          {hint}
        </Text>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

export function FieldRow({
  label,
  value,
  monospaced,
}: {
  label: string;
  value: string | null | undefined;
  monospaced?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.field, { borderTopColor: theme.colors.borderSoft }]}
    >
      <Text variant="caption" color="foregroundMuted">
        {label}
      </Text>
      <Text
        variant="body"
        color="foreground"
        style={[
          { marginTop: 4 },
          monospaced ? { fontVariant: ["tabular-nums"] } : null,
        ]}
      >
        {value && value.length > 0 ? value : "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 16,
  },
  field: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
