import { useAuth } from "@clerk/clerk-expo";
import * as React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  DetailPane,
  MasterList,
  Sidebar,
  SplitShell,
  type MasterGroup,
} from "@/components/layout";
import { Button, Card, Text } from "@/components/ui";
import {
  findSection,
  initialsFor,
  PROFILE_GROUPS,
  roleLabel,
  type ProfileSectionId,
} from "@/features/profile/sections";
import { SectionView } from "@/features/profile/views";
import { useMe } from "@/features/users/hooks";

// Mi perfil — three-column iPad-landscape shell.
// Sidebar: top-level app nav (only "Mi perfil" is wired for now).
// Master:  index of the 11 profile sub-sections + identity anchor.
// Detail:  the active sub-section's view (sticky header + grid body).

const SIDEBAR_SECTIONS = [
  {
    items: [
      { id: "today", label: "Hoy", icon: "home" as const },
      { id: "clients", label: "Clientes", icon: "users" as const },
      { id: "appointments", label: "Citas", icon: "calendar" as const },
      { id: "catalog", label: "Catálogo", icon: "grid" as const },
      { id: "lookbooks", label: "Lookbooks", icon: "bookmark" as const },
      { id: "messages", label: "Mensajes", icon: "message" as const },
      { id: "tasks", label: "Tareas", icon: "task" as const },
    ],
  },
  {
    eyebrow: "Administración",
    items: [
      { id: "store", label: "Tienda", icon: "store" as const },
      { id: "team", label: "Equipo", icon: "team" as const },
    ],
  },
];

const SIDEBAR_FOOTER = [
  { id: "profile", label: "Mi perfil", icon: "user" as const },
  { id: "signout", label: "Cerrar sesión", icon: "signOut" as const },
];

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useMe();

  const [activeSection, setActiveSection] =
    React.useState<ProfileSectionId>("personal");
  const [presenter, setPresenter] = React.useState(false);

  const handleSidebar = React.useCallback(
    (id: string) => {
      if (id === "signout") {
        signOut();
        return;
      }
      // Only "profile" is wired; everything else is a placeholder.
      // We stay on the profile shell regardless.
    },
    [signOut],
  );

  const masterGroups: MasterGroup[] = PROFILE_GROUPS.map((g) => ({
    eyebrow: g.eyebrow,
    items: g.items.map((i) => ({
      id: i.id,
      label: i.label,
      icon: i.icon,
    })),
  }));

  const sidebar = (
    <Sidebar
      sections={SIDEBAR_SECTIONS}
      footer={SIDEBAR_FOOTER}
      activeId="profile"
      onSelect={handleSidebar}
    />
  );

  if (isLoading) {
    return (
      <SplitShell
        sidebar={sidebar}
        master={
          <MasterList
            title="Mi perfil"
            groups={masterGroups}
            activeId={activeSection}
            onSelect={(id) => setActiveSection(id as ProfileSectionId)}
          />
        }
        detail={<LoadingDetail />}
      />
    );
  }

  if (error || !data) {
    return (
      <SplitShell
        sidebar={sidebar}
        master={
          <MasterList
            title="Mi perfil"
            groups={masterGroups}
            activeId={activeSection}
            onSelect={(id) => setActiveSection(id as ProfileSectionId)}
          />
        }
        detail={
          <ErrorDetail
            message={
              (error as { message?: string })?.message ??
              "No se pudo cargar tu perfil."
            }
            onRetry={() => refetch()}
            retrying={isRefetching}
          />
        }
      />
    );
  }

  const me = data;
  const section = findSection(activeSection);

  return (
    <SplitShell
      sidebar={sidebar}
      master={
        <MasterList
          title="Mi perfil"
          identity={{
            initials: initialsFor(me.fullName),
            primary: me.fullName,
            secondary: roleLabel(me.role),
            tertiary: me.isActive ? "Activa" : "Inactiva",
          }}
          groups={masterGroups}
          activeId={activeSection}
          onSelect={(id) => setActiveSection(id as ProfileSectionId)}
        />
      }
      detail={
        <DetailPane
          breadcrumb={["Mi perfil", section.breadcrumbGroup, section.label]}
          title={section.label}
          subtitle={subtitleFor(section.id)}
          presenter={presenter}
          onPresenterToggle={() => setPresenter((p) => !p)}
          actions={[
            {
              id: "edit",
              label: "Editar",
              onPress: () => {},
            },
          ]}
        >
          <SectionView id={section.id} me={me} presenter={presenter} />
        </DetailPane>
      }
    />
  );
}

function subtitleFor(id: ProfileSectionId): string {
  switch (id) {
    case "personal":
      return "Tu identidad como Beauty Advisor dentro de L'Oréal.";
    case "contact":
      return "Cómo te contactan clientes, tienda y soporte.";
    case "security":
      return "Acceso a la app y sesiones activas.";
    case "store":
      return "Tienda asignada, equipo y zona en la que operas.";
    case "brands":
      return "Las marcas en las que puedes atender clientes.";
    case "schedule":
      return "Tu turno, descansos y disponibilidad.";
    case "kpis":
      return "Tu desempeño del mes en curso.";
    case "recognitions":
      return "Logros, programas y certificaciones.";
    case "theme":
      return "Cómo se ve la app en tu iPad.";
    case "notifications":
      return "Qué te notifica la app y cómo.";
    case "language":
      return "Idioma, formato y zona horaria.";
  }
}

function LoadingDetail() {
  return (
    <View style={styles.fill}>
      <ActivityIndicator />
    </View>
  );
}

function ErrorDetail({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <View style={styles.fill}>
      <View style={{ maxWidth: 420 }}>
        <Card>
          <Text variant="title" color="foreground">
            No se pudo cargar tu perfil
          </Text>
          <Text
            variant="small"
            color="foregroundMuted"
            style={{ marginTop: 6 }}
          >
            {message}
          </Text>
          <Button
            variant="primary"
            label={retrying ? "Reintentando…" : "Reintentar"}
            onPress={onRetry}
            disabled={retrying}
            style={{ marginTop: 16 }}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});
