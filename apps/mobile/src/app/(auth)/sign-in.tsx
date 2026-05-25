import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Glyph, Text } from "@/components/ui";
import { useTheme } from "@/theme";

// iPad-first sign-in.
//
// Layout: two columns in landscape (regular width). Left column is the
// brand canvas — warm-gray surface, large wordmark, a one-line value
// prop ("La consultora que conoce a sus clientas"). Right column is a
// centered form on the white background, ~440pt wide, never wider.
//
// In portrait or compact width, columns stack vertically and the brand
// column collapses to a slim 56pt header so the form gets the room.

const FORM_MAX_WIDTH = 440;
const SPLIT_BREAKPOINT = 760;

export default function SignInScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.split, !isSplit && styles.stack]}>
        {isSplit ? (
          <BrandPanelWide />
        ) : (
          <BrandPanelCompact />
        )}

        <View
          style={[
            styles.formColumn,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.kav}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.formInner, { maxWidth: FORM_MAX_WIDTH }]}>
                <View style={styles.formHeader}>
                  <Text variant="eyebrow" color="foregroundMuted">
                    Beauty Advisor
                  </Text>
                  <Text variant="display" color="foreground" style={{ marginTop: 8 }}>
                    Bienvenida
                  </Text>
                  <Text variant="body" color="foregroundMuted" style={{ marginTop: 6 }}>
                    Inicia sesión para continuar con tus clientas.
                  </Text>
                </View>

                <SignInForm
                  onSubmit={(values) => {
                    console.log("sign-in submit", values.email);
                  }}
                  onForgotPassword={() => console.log("forgot password")}
                />

                <View style={styles.footer}>
                  <Text variant="caption" color="foregroundSubtle">
                    Al iniciar sesión aceptas los términos de uso de L'Oréal.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Brand panel (wide / landscape iPad) ─────────────────────────────
//
// Warm-gray canvas with the wordmark stacked. One sparkle accent and
// an AI-positioning sentence — this is the only place in the auth flow
// we lean into the brand.

function BrandPanelWide() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.brandWide,
        { backgroundColor: theme.colors.sidebar },
      ]}
    >
      <View style={styles.brandHeader}>
        <Wordmark />
      </View>

      <View style={styles.brandBody}>
        <View
          style={[
            styles.aiPill,
            {
              backgroundColor: theme.colors.accentSoft,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Glyph name="sparkle" size={12} color={theme.colors.accent} />
          <Text variant="eyebrow" color="accent" style={{ marginLeft: 6 }}>
            Clienteling con IA
          </Text>
        </View>

        <Text
          variant="display"
          color="sidebarForeground"
          style={[styles.brandHeadline, { color: theme.colors.foreground }]}
        >
          La consultora{"\n"}que conoce a sus clientas.
        </Text>

        <Text
          variant="body"
          color="foregroundMuted"
          style={{ marginTop: 14, maxWidth: 360 }}
        >
          Recibe sugerencias en tiempo real, agenda en segundos y mantén la
          conversación viva con cada clienta.
        </Text>
      </View>

      <View style={styles.brandFooter}>
        <Text variant="caption" color="foregroundSubtle">
          © L'Oréal · Clienteling
        </Text>
      </View>
    </View>
  );
}

// ─── Brand panel (compact / portrait) ────────────────────────────────
//
// Slim header strip with the wordmark only. The form below gets the
// stage — portrait iPad and iPhone usage.

function BrandPanelCompact() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.brandCompact,
        {
          backgroundColor: theme.colors.sidebar,
          borderBottomColor: theme.colors.sidebarBorder,
        },
      ]}
    >
      <Wordmark />
    </View>
  );
}

function Wordmark() {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={[
          styles.wordmark,
          { color: theme.colors.foreground },
        ]}
      >
        L'ORÉAL
      </Text>
      <Text
        variant="eyebrow"
        color="foregroundMuted"
        style={{ marginTop: 4 }}
      >
        Clienteling
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Layout
  split: {
    flex: 1,
    flexDirection: "row",
  },
  stack: {
    flexDirection: "column",
  },

  // Brand panel (wide)
  brandWide: {
    flex: 1,
    paddingHorizontal: 56,
    paddingVertical: 48,
    justifyContent: "space-between",
    maxWidth: "55%",
  },
  brandHeader: {},
  brandBody: {
    justifyContent: "center",
    flex: 1,
    maxWidth: 480,
  },
  brandFooter: {},
  brandHeadline: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
    marginTop: 28,
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  // Brand panel (compact)
  brandCompact: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Wordmark text
  wordmark: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2.4,
  },

  // Form column
  formColumn: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  formInner: {
    width: "100%",
  },
  formHeader: {
    marginBottom: 28,
  },
  footer: {
    marginTop: 22,
    alignItems: "center",
  },
});
