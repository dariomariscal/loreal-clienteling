import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Text } from "@/components/ui";
import { LancomeLogo, LorealLogo, YslLogo } from "@/components/ui/brand-logos";
import { useTheme } from "@/theme";

// iPad sign-in — mirrors the web auth shell exactly.
//
// Layout (landscape iPad): 45/55 split.
//   • Left 45%: dark "primary" brand canvas. L'Oréal wordmark + caption
//     top-left, Coco Chanel quote centered with a gold accent rule and
//     attribution, Lancôme + YSL secondary marks at 40% opacity, footer
//     tagline at 30%. A single hairline gold gradient sits on the right
//     edge as the deliberate Zen stroke.
//   • Right 55%: white form column with header, the SignInForm, and a
//     footer of Soporte · Privacidad · Términos.
//
// Below the SPLIT_BREAKPOINT (portrait iPad / iPhone), the left panel
// collapses to a slim mobile header and the form takes the full stage.
const SPLIT_BREAKPOINT = 900;
const FORM_MAX_WIDTH = 420;
const BRAND_PANEL_WIDTH_PCT = 0.45;

export default function SignInScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  async function handleSignIn({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    if (!isLoaded || !signIn) {
      throw new Error("Sign-in no está listo todavía");
    }

    const attempt = await signIn.create({
      identifier: email,
      password,
    });

    if (attempt.status === "complete") {
      await setActive({ session: attempt.createdSessionId });
      router.replace("/(app)" as never);
      return;
    }

    throw new Error(
      `No se pudo iniciar sesión (estado: ${attempt.status}). Verifica tus credenciales.`,
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.split, !isSplit && styles.stack]}>
        {isSplit ? <BrandPanelWide /> : <BrandPanelCompact />}

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
                  <Text variant="display" color="foreground" style={styles.formHeading}>
                    Iniciar sesión
                  </Text>
                  <Text
                    variant="body"
                    color="foregroundMuted"
                    style={{ marginTop: 8 }}
                  >
                    Accede a tu cuenta de L&apos;Oréal Clienteling
                  </Text>
                </View>

                <SignInForm
                  onSubmit={handleSignIn}
                  onForgotPassword={() => console.log("forgot password")}
                />
              </View>
            </ScrollView>

            <FormFooter />
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Brand panel (wide / landscape iPad) ─────────────────────────────
//
// 45% wide dark canvas. Three vertical zones (top / center / bottom)
// separated by space-between, plus a hairline gold gradient on the
// right edge — the single deliberate Zen stroke from the web.

function BrandPanelWide() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.brandWide,
        {
          backgroundColor: theme.colors.primary,
          width: `${BRAND_PANEL_WIDTH_PCT * 100}%`,
        },
      ]}
    >
      {/* Hairline gold gradient on the right edge — emulated with three
          stacked 1pt strips at varying opacities to avoid pulling in a
          gradient lib for a single decorative line. */}
      <View pointerEvents="none" style={styles.goldEdge}>
        <View
          style={[
            styles.goldEdgeSegment,
            { backgroundColor: theme.colors.accent, opacity: 0.0 },
          ]}
        />
        <View
          style={[
            styles.goldEdgeSegment,
            { backgroundColor: theme.colors.accent, opacity: 0.3 },
          ]}
        />
        <View
          style={[
            styles.goldEdgeSegment,
            { backgroundColor: theme.colors.accent, opacity: 0.0 },
          ]}
        />
      </View>

      {/* Top: wordmark + divider + caption */}
      <View style={styles.brandHeader}>
        <View style={styles.brandHeaderRow}>
          <LorealLogo
            width={120}
            color={theme.colors.primaryForeground}
          />
          <View
            style={[
              styles.headerDivider,
              { backgroundColor: theme.colors.primaryForeground, opacity: 0.2 },
            ]}
          />
          <Text
            variant="eyebrow"
            style={[
              styles.headerCaption,
              { color: theme.colors.primaryForeground, opacity: 0.5 },
            ]}
          >
            Clienteling
          </Text>
        </View>
      </View>

      {/* Center: Zen quote — accent rule, quote, attribution, brand
          marks below. Generous spacing follows "Ma". */}
      <View style={styles.brandBody}>
        <View
          style={[
            styles.accentRule,
            { backgroundColor: theme.colors.accent, opacity: 0.4 },
          ]}
        />
        <Text
          style={[
            styles.quote,
            { color: theme.colors.primaryForeground, opacity: 0.9 },
          ]}
        >
          La belleza comienza en el momento en que decides ser tú misma.
        </Text>
        <Text
          variant="eyebrow"
          style={[styles.attribution, { color: theme.colors.accent }]}
        >
          — Coco Chanel
        </Text>

        <View style={styles.secondaryBrands}>
          <LancomeLogo
            width={100}
            color={theme.colors.primaryForeground}
            opacity={0.4}
          />
          <YslLogo
            width={120}
            color={theme.colors.primaryForeground}
            opacity={0.4}
          />
        </View>
      </View>

      {/* Bottom: subtle footer */}
      <View>
        <Text
          variant="caption"
          style={{ color: theme.colors.primaryForeground, opacity: 0.3 }}
        >
          Plataforma de gestión de relaciones con clientas
        </Text>
      </View>
    </View>
  );
}

// ─── Brand panel (compact / portrait iPad & iPhone) ──────────────────
//
// Slim header strip with the wordmark + caption. The form below gets
// the stage — same behavior as the web mobile header.

function BrandPanelCompact() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.brandCompact,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <LorealLogo width={90} color={theme.colors.foreground} />
      <View
        style={[
          styles.headerDivider,
          {
            backgroundColor: theme.colors.border,
            opacity: 1,
            height: 16,
          },
        ]}
      />
      <Text variant="eyebrow" color="foregroundMuted">
        Clienteling
      </Text>
    </View>
  );
}

// ─── Form footer links ────────────────────────────────────────────────

function FormFooter() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.formFooter,
        { borderTopColor: theme.colors.border },
      ]}
    >
      <FooterLink label="Soporte" />
      <Text variant="caption" color="foregroundSubtle">
        ·
      </Text>
      <FooterLink label="Privacidad" />
      <Text variant="caption" color="foregroundSubtle">
        ·
      </Text>
      <FooterLink label="Términos" />
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text variant="caption" color="foregroundMuted">
        {label}
      </Text>
    </Pressable>
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

  // Brand panel (wide / dark)
  brandWide: {
    paddingHorizontal: 48,
    paddingVertical: 48,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  goldEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: StyleSheet.hairlineWidth,
    flexDirection: "column",
  },
  goldEdgeSegment: {
    flex: 1,
    width: "100%",
  },
  brandHeader: {},
  brandHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginLeft: 8,
    marginRight: 4,
  },
  headerCaption: {
    letterSpacing: 1.6,
  },
  brandBody: {
    gap: 32,
  },
  accentRule: {
    width: 48,
    height: StyleSheet.hairlineWidth,
  },
  quote: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "300",
    letterSpacing: 0.2,
    marginTop: 16,
    maxWidth: 460,
  },
  attribution: {
    marginTop: 16,
    letterSpacing: 1.6,
  },
  secondaryBrands: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    paddingTop: 16,
  },

  // Brand panel (compact)
  brandCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  formInner: {
    width: "100%",
  },
  formHeader: {
    marginBottom: 32,
  },
  formHeading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "300",
    letterSpacing: -0.4,
  },

  // Form footer (links row)
  formFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
