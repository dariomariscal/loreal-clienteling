import * as React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { Glyph, Text } from "@/components/ui";
import { useTheme } from "@/theme";

// Col 3 — working surface. Renders a sticky header with breadcrumb + title
// + actions, then the freeform body in a centered max-width column. The
// scroll-edge effect (subtle border under the header on scroll) mirrors
// iPadOS 26's behavior so the body feels continuous with the toolbar.

export interface DetailAction {
  id: string;
  label: string;
  onPress: () => void;
  variant?: "ghost" | "primary";
}

interface DetailPaneProps {
  breadcrumb?: string[];
  title: string;
  subtitle?: string;
  actions?: DetailAction[];
  /** Toggles presenter mode (hides internal data). Wired to the eye glyph. */
  onPresenterToggle?: () => void;
  presenter?: boolean;
  children: React.ReactNode;
}

const MAX_CONTENT_WIDTH = 960;

export function DetailPane({
  breadcrumb,
  title,
  subtitle,
  actions,
  onPresenterToggle,
  presenter,
  children,
}: DetailPaneProps) {
  const theme = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [bodyWidth, setBodyWidth] = React.useState(0);

  const onBodyLayout = (e: LayoutChangeEvent) => {
    setBodyWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.root}>
      {/* Sticky header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: scrolled
              ? theme.colors.borderSoft
              : "transparent",
          },
        ]}
      >
        <View
          style={[
            styles.headerInner,
            { maxWidth: MAX_CONTENT_WIDTH, width: "100%" },
          ]}
        >
          {breadcrumb && breadcrumb.length > 0 ? (
            <View style={styles.breadcrumb}>
              {breadcrumb.map((c, i) => (
                <React.Fragment key={i}>
                  <Text
                    variant="caption"
                    color={
                      i === breadcrumb.length - 1
                        ? "foregroundMuted"
                        : "foregroundSubtle"
                    }
                  >
                    {c}
                  </Text>
                  {i < breadcrumb.length - 1 ? (
                    <Text variant="caption" color="foregroundSubtle">
                      ›
                    </Text>
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          ) : null}

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text variant="display" color="foreground">
                {title}
              </Text>
              {subtitle ? (
                <Text
                  variant="small"
                  color="foregroundMuted"
                  style={{ marginTop: 4 }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              {onPresenterToggle ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Modo presentación"
                  onPress={onPresenterToggle}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: presenter
                        ? theme.colors.accentSoft
                        : theme.colors.mutedSoft,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Glyph
                    name="presenter"
                    size={18}
                    color={
                      presenter
                        ? theme.colors.accent
                        : theme.colors.foregroundMuted
                    }
                  />
                </Pressable>
              ) : null}

              {actions?.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  onPress={a.onPress}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor:
                        a.variant === "primary"
                          ? theme.colors.primary
                          : theme.colors.mutedSoft,
                      borderRadius: theme.radius.md,
                    },
                  ]}
                >
                  <Text
                    variant="smallMedium"
                    color={
                      a.variant === "primary"
                        ? "primaryForeground"
                        : "foreground"
                    }
                  >
                    {a.label}
                  </Text>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más"
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: theme.colors.mutedSoft,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Glyph
                  name="more"
                  size={18}
                  color={theme.colors.foregroundMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Scroll body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onLayout={onBodyLayout}
      >
        <View
          style={{
            width: "100%",
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: "center",
            gap: 16,
          }}
        >
          {/* Pass body width down so two-column grids can decide whether to stack. */}
          <BodyWidthContext.Provider
            value={Math.min(bodyWidth, MAX_CONTENT_WIDTH)}
          >
            {children}
          </BodyWidthContext.Provider>
        </View>
      </ScrollView>
    </View>
  );
}

const BodyWidthContext = React.createContext(0);

export function useDetailBodyWidth() {
  return React.useContext(BodyWidthContext);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  headerInner: {
    alignSelf: "center",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 16,
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
});
