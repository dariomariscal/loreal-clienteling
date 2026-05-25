import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Glyph, Input, Text } from "@/components/ui";
import { useTheme } from "@/theme";

interface SignInFormProps {
  onSubmit?: (values: { email: string; password: string }) => void | Promise<void>;
  onForgotPassword?: () => void;
}

// Pure presentational form — mirrors apps/web/components/auth/sign-in-form.tsx.
// The "¿Olvidaste tu contraseña?" link sits inline with the password
// label (right-aligned) instead of below the field, matching the web.
export function SignInForm({ onSubmit, onForgotPassword }: SignInFormProps) {
  const theme = useTheme();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.({ email: email.trim(), password });
    } catch (err) {
      const message =
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        (err as Error)?.message ??
        "No se pudo iniciar sesión. Intenta de nuevo.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: theme.colors.destructiveSoft,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Glyph name="alert" size={16} color={theme.colors.destructive} />
          <Text variant="small" color="destructive" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <Input
        label="Correo electrónico"
        placeholder="usuario@loreal.mx"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (error) setError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        textContentType="username"
        returnKeyType="next"
      />

      {/* Password label row with inline "forgot password" link, matching
          apps/web/components/auth/sign-in-form.tsx lines 152–160. */}
      <View style={[styles.passwordLabelRow, { marginTop: theme.spacing[5] }]}>
        <Text variant="smallMedium" color="foreground">
          Contraseña
        </Text>
        <Pressable onPress={onForgotPassword} hitSlop={8}>
          <Text variant="caption" color="foregroundMuted">
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>
      </View>

      <Input
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (error) setError(null);
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        trailingAccessory={
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Glyph
              name={showPassword ? "eyeOff" : "eye"}
              size={18}
              color={theme.colors.foregroundMuted}
            />
          </Pressable>
        }
      />

      <Button
        label={submitting ? "Ingresando..." : "Iniciar Sesión"}
        size="lg"
        fullWidth
        loading={submitting}
        onPress={handleSubmit}
        style={{ marginTop: theme.spacing[6] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
  },
});
