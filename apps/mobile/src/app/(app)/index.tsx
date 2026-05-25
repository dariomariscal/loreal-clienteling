import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Text } from "@/components/ui";
import { useMe } from "@/features/users/hooks";
import { useTheme } from "@/theme";

export default function HomeScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useMe();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="eyebrow" color="foregroundMuted">
            Beauty Advisor
          </Text>
          <Text variant="display" color="foreground" style={{ marginTop: 8 }}>
            Mi perfil
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Card>
            <Text variant="body" color="foreground">
              No se pudo cargar tu perfil.
            </Text>
            <Text
              variant="caption"
              color="foregroundMuted"
              style={{ marginTop: 4 }}
            >
              {(error as { message?: string })?.message ?? "Error desconocido"}
            </Text>
            <Button
              variant="secondary"
              label="Reintentar"
              onPress={() => refetch()}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : data ? (
          <Card>
            <Row label="Nombre" value={data.fullName} />
            <Row label="Correo" value={data.email} />
            <Row label="Rol" value={data.role} />
            <Row label="Tienda" value={data.storeName ?? "—"} />
            <Row label="Zona" value={data.zoneName ?? "—"} />
            <Row label="Marca" value={data.brandName ?? "—"} />
            <Row
              label="Activo"
              value={data.isActive ? "Sí" : "No"}
            />
          </Card>
        ) : null}

        <Button
          variant="ghost"
          label={isRefetching ? "Actualizando…" : "Actualizar"}
          onPress={() => refetch()}
          style={{ marginTop: 12 }}
          disabled={isRefetching}
        />

        <Button
          variant="secondary"
          label="Cerrar sesión"
          onPress={() => signOut()}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="foregroundMuted">
        {label}
      </Text>
      <Text variant="body" color="foreground" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: 24,
    gap: 12,
  },
  header: {
    marginBottom: 16,
  },
  row: {
    paddingVertical: 10,
  },
});
