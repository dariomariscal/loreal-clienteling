import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Glyph, type GlyphName, Text } from "@/components/ui";
import { useTheme } from "@/theme";

// Col 1 — primary navigation. Always visible in landscape; collapses to a
// 72pt icon-rail below the "expanded" breakpoint. Active items get a Luxor
// Gold leading bar (3pt) — that bar is the ONE accent on this column.

export interface SidebarItem {
  id: string;
  label: string;
  icon: GlyphName;
}

export interface SidebarSection {
  eyebrow?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
  footer?: SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
  onRequestMaster?: () => void;
}

export function Sidebar({
  sections,
  footer,
  activeId,
  onSelect,
  collapsed,
}: SidebarProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      {/* Brand header */}
      <View
        style={[
          styles.header,
          collapsed ? styles.headerCollapsed : null,
          { borderBottomColor: theme.colors.sidebarBorder },
        ]}
      >
        {collapsed ? (
          <View
            style={[
              styles.brandDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
        ) : (
          <>
            <Text variant="title" color="sidebarForeground">
              L'ORÉAL
            </Text>
            <Text
              variant="eyebrow"
              color="sidebarMuted"
              style={{ marginTop: 4 }}
            >
              Beauty Advisor
            </Text>
          </>
        )}
      </View>

      {/* Sections */}
      <View style={styles.body}>
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={{ marginTop: sIdx === 0 ? 0 : 20 }}>
            {section.eyebrow && !collapsed ? (
              <Text
                variant="eyebrow"
                color="sidebarMuted"
                style={styles.eyebrow}
              >
                {section.eyebrow}
              </Text>
            ) : null}
            {section.items.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                active={item.id === activeId}
                collapsed={collapsed}
                onPress={() => onSelect(item.id)}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Footer (account / sign-out) */}
      {footer && footer.length > 0 ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.sidebarBorder },
          ]}
        >
          {footer.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={item.id === activeId}
              collapsed={collapsed}
              onPress={() => onSelect(item.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  onPress,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const [hover, setHover] = React.useState(false);

  const iconColor = active
    ? theme.colors.foreground
    : theme.colors.sidebarMuted;

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
        collapsed ? styles.rowCollapsed : null,
        {
          backgroundColor: active
            ? theme.colors.sidebarActive
            : hover
              ? theme.colors.mutedSoft
              : "transparent",
          borderRadius: theme.radius.md,
        },
      ]}
    >
      {/* Active leading bar — the ONE accent on the sidebar */}
      {active ? (
        <View
          style={[
            styles.activeBar,
            { backgroundColor: theme.colors.accent },
          ]}
        />
      ) : null}
      <View style={styles.icon}>
        <Glyph name={item.icon} size={20} color={iconColor} />
      </View>
      {collapsed ? null : (
        <Text
          variant="bodyMedium"
          color={active ? "sidebarForeground" : "sidebarMuted"}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCollapsed: {
    paddingHorizontal: 0,
    alignItems: "center",
  },
  brandDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  eyebrow: {
    marginLeft: 12,
    marginBottom: 6,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 2,
    overflow: "hidden",
  },
  rowCollapsed: {
    paddingHorizontal: 0,
    justifyContent: "center",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  icon: {
    width: 28,
    alignItems: "center",
  },
});
