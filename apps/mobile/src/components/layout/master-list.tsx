import * as React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Glyph, type GlyphName, Text } from "@/components/ui";
import { useTheme } from "@/theme";

// Col 2 — the section index for the current top-level screen. For "Mi
// perfil" it lists every sub-section of the account; selecting one swaps
// the detail pane. Header is optional; an `identity` block can be passed
// to anchor the column (avatar + name on top of the list).

export interface MasterItem {
  id: string;
  label: string;
  icon: GlyphName;
}

export interface MasterGroup {
  eyebrow?: string;
  items: MasterItem[];
}

export interface MasterIdentity {
  initials: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
}

interface MasterListProps {
  title: string;
  identity?: MasterIdentity;
  groups: MasterGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function MasterList({
  title,
  identity,
  groups,
  activeId,
  onSelect,
}: MasterListProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.titleBar,
          { borderBottomColor: theme.colors.borderSoft },
        ]}
      >
        <Text variant="title" color="foreground" style={{ flex: 1 }}>
          {title}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Información">
          <Glyph name="info" size={18} color={theme.colors.foregroundMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {identity ? (
          <View
            style={[
              styles.identity,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radius.xl,
                ...theme.elevation.xs,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Text variant="smallMedium" color="primaryForeground">
                {identity.initials}
              </Text>
            </View>
            <View style={styles.identityText}>
              <Text variant="bodyMedium" color="foreground" numberOfLines={1}>
                {identity.primary}
              </Text>
              {identity.secondary ? (
                <Text
                  variant="small"
                  color="foregroundMuted"
                  numberOfLines={1}
                  style={{ marginTop: 2 }}
                >
                  {identity.secondary}
                </Text>
              ) : null}
              {identity.tertiary ? (
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                  <Text variant="caption" color="foregroundMuted">
                    {identity.tertiary}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {groups.map((group, gIdx) => (
          <View
            key={gIdx}
            style={{ marginTop: gIdx === 0 && !identity ? 4 : 20 }}
          >
            {group.eyebrow ? (
              <Text
                variant="eyebrow"
                color="foregroundMuted"
                style={styles.eyebrow}
              >
                {group.eyebrow}
              </Text>
            ) : null}
            {group.items.map((item) => (
              <MasterRow
                key={item.id}
                item={item}
                active={item.id === activeId}
                onPress={() => onSelect(item.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function MasterRow({
  item,
  active,
  onPress,
}: {
  item: MasterItem;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [hover, setHover] = React.useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={[
        styles.row,
        {
          backgroundColor: active
            ? theme.colors.card
            : hover
              ? theme.colors.mutedSoft
              : "transparent",
          borderRadius: theme.radius.lg,
          ...(active ? theme.elevation.xs : {}),
        },
        active ? { borderColor: theme.colors.border } : null,
        active ? { borderWidth: StyleSheet.hairlineWidth } : null,
      ]}
    >
      <View style={styles.rowIcon}>
        <Glyph
          name={item.icon}
          size={18}
          color={
            active ? theme.colors.foreground : theme.colors.foregroundMuted
          }
        />
      </View>
      <Text
        variant={active ? "bodyMedium" : "body"}
        color={active ? "foreground" : "foreground"}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {!active ? (
        <Glyph
          name="chevronRight"
          size={16}
          color={theme.colors.foregroundSubtle}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleBar: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: {
    flex: 1,
    marginLeft: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    marginLeft: 12,
    marginBottom: 6,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  rowIcon: {
    width: 28,
    alignItems: "center",
  },
});
