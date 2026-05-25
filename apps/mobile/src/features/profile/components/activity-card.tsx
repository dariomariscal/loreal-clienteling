import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, Glyph, Text } from "@/components/ui";
import { useTheme } from "@/theme";

export interface ActivityEntry {
  id: string;
  icon: "clock" | "shield" | "brand" | "user";
  title: string;
  meta: string;
  when: string;
}

interface ActivityCardProps {
  title: string;
  entries: ActivityEntry[];
}

export function ActivityCard({ title, entries }: ActivityCardProps) {
  const theme = useTheme();
  return (
    <Card padded>
      <View style={styles.head}>
        <Text
          variant="eyebrow"
          color="foregroundMuted"
          style={{ flex: 1 }}
        >
          {title}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver todo">
          <Text variant="smallMedium" color="accent">
            Ver todo
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 14 }}>
        {entries.map((e, i) => (
          <View
            key={e.id}
            style={[
              styles.row,
              i > 0
                ? {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.borderSoft,
                  }
                : null,
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: theme.colors.mutedSoft,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Glyph
                name={e.icon}
                size={16}
                color={theme.colors.foregroundMuted}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="bodyMedium" color="foreground">
                {e.title}
              </Text>
              <Text
                variant="small"
                color="foregroundMuted"
                style={{ marginTop: 2 }}
              >
                {e.meta}
              </Text>
            </View>
            <Text variant="caption" color="foregroundSubtle">
              {e.when}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
