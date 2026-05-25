import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Glyph, Input, Text } from "@/components/ui";
import { useTheme } from "@/theme";

interface SignInFormProps {
  onSubmit?: (values: { email: string; password: string }) => void | Promise<void>;
  onForgotPassword?: () => void;
}

// Pure presentational form. The parent screen decides what happens on
// submit. Local state owns the field values and the password-visibility
// toggle. Validation is intentionally minimal here (presence only).
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
      <Input
        label="Correo electrónico"
        placeholder="maria@loreal.com"
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
        leadingIcon={<Glyph name="mail" size={16} color={theme.colors.foregroundMuted} />}
      />

      <Input
        containerStyle={{ marginTop: theme.spacing[4] }}
        label="Contraseña"
        placeholder="••••••••"
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
        leadingIcon={<Glyph name="lock" size={16} color={theme.colors.foregroundMuted} />}
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

      <View style={styles.forgotRow}>
        <Pressable onPress={onForgotPassword} hitSlop={8}>
          <Text variant="smallMedium" color="accent">
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>
      </View>

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

      <Button
        label="Iniciar sesión"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={handleSubmit}
        style={{ marginTop: theme.spacing[5] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  forgotRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
  },
});
