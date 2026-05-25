import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, Glyph, Text } from "@/components/ui";
import { useTheme } from "@/theme";

import { initialsFor, roleLabel } from "../sections";

interface IdentityHeroProps {
  fullName: string;
  email: string;
  role: string;
  storeName: string | null;
  zoneName: string | null;
  brandName: string | null;
  isActive: boolean;
  presenter: boolean;
}

export function IdentityHero({
  fullName,
  email,
  role,
  storeName,
  zoneName,
  brandName,
  isActive,
  presenter,
}: IdentityHeroProps) {
  const theme = useTheme();
  const initials = initialsFor(fullName);

  return (
    <Card padded>
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text variant="title" color="primaryForeground">
            {initials}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 20 }}>
          <Text variant="title" color="foreground">
            {fullName}
          </Text>
          <Text
            variant="small"
            color="foregroundMuted"
            style={{ marginTop: 4 }}
          >
            {roleLabel(role)}
            {brandName ? ` · ${brandName}` : ""}
          </Text>

          <View style={styles.metaRow}>
            <Meta icon="mail" label={email} />
            {storeName ? (
              <Meta
                icon="store"
                label={
                  zoneName ? `${storeName} · ${zoneName}` : storeName
                }
              />
            ) : null}
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isActive
                      ? theme.colors.success
                      : theme.colors.foregroundSubtle,
                  },
                ]}
              />
              <Text variant="caption" color="foregroundMuted">
                {isActive ? "Cuenta activa" : "Cuenta inactiva"}
              </Text>
            </View>
          </View>
        </View>

        {!presenter ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto"
              style={[
                styles.btn,
                {
                  backgroundColor: theme.colors.mutedSoft,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Text variant="smallMedium" color="foreground">
                Cambiar foto
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar datos"
              style={[
                styles.btn,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radius.md,
                  marginTop: 8,
                },
              ]}
            >
              <Text variant="smallMedium" color="primaryForeground">
                Editar datos
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function Meta({
  icon,
  label,
}: {
  icon: "mail" | "store";
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.meta}>
      <Glyph name={icon} size={14} color={theme.colors.foregroundMuted} />
      <Text variant="small" color="foregroundMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 14,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    marginLeft: 16,
  },
  btn: {
    height: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
