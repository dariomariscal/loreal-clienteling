import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, Glyph, Text } from "@/components/ui";
import { useTheme, type ThemeMode } from "@/theme";

import { ActivityCard } from "./components/activity-card";
import { IdentityHero } from "./components/identity-hero";
import { FieldRow, InfoCard } from "./components/info-card";
import { SectionGrid } from "./components/section-grid";
import type { ProfileSectionId } from "./sections";
import { roleLabel } from "./sections";

import type { MeResponse } from "@/features/users/api";

interface SectionViewProps {
  me: MeResponse;
  presenter: boolean;
}

export function SectionView({
  id,
  ...rest
}: SectionViewProps & { id: ProfileSectionId }) {
  switch (id) {
    case "personal":
      return <PersonalView {...rest} />;
    case "contact":
      return <ContactView {...rest} />;
    case "security":
      return <SecurityView {...rest} />;
    case "store":
      return <StoreView {...rest} />;
    case "brands":
      return <BrandsView {...rest} />;
    case "schedule":
      return <ScheduleView {...rest} />;
    case "kpis":
      return <KpisView {...rest} />;
    case "recognitions":
      return <RecognitionsView {...rest} />;
    case "theme":
      return <ThemeView {...rest} />;
    case "notifications":
      return <NotificationsView {...rest} />;
    case "language":
      return <LanguageView {...rest} />;
  }
}

// ─── Cuenta ────────────────────────────────────────────────────────────────

function PersonalView({ me, presenter }: SectionViewProps) {
  return (
    <>
      <IdentityHero
        fullName={me.fullName}
        email={me.email}
        role={me.role}
        storeName={me.storeName}
        zoneName={me.zoneName}
        brandName={me.brandName}
        isActive={me.isActive}
        presenter={presenter}
      />

      <SectionGrid>
        <InfoCard
          eyebrow="Identidad"
          title="Datos básicos"
          hint="Visibles para tu equipo y manager."
        >
          <FieldRow label="Nombre completo" value={me.fullName} />
          <FieldRow label="Rol" value={roleLabel(me.role)} />
          <FieldRow
            label="ID de usuario"
            value={me.id}
            monospaced
          />
          <FieldRow
            label="Miembro desde"
            value={formatDate(me.createdAt)}
          />
        </InfoCard>

        <InfoCard
          eyebrow="Ubicación"
          title="Asignación operativa"
          hint="Define los clientes y catálogo que ves."
        >
          <FieldRow label="Tienda" value={me.storeName} />
          <FieldRow label="Zona" value={me.zoneName} />
          <FieldRow label="Marca primaria" value={me.brandName} />
        </InfoCard>
      </SectionGrid>

      {!presenter ? (
        <ActivityCard
          title="Actividad reciente de tu cuenta"
          entries={[
            {
              id: "1",
              icon: "clock",
              title: "Inicio de sesión",
              meta: me.storeName
                ? `iPad · ${me.storeName}`
                : "iPad · sin tienda",
              when: formatLastSignIn(me.lastSignInAt),
            },
            {
              id: "2",
              icon: "user",
              title: "Perfil sincronizado con Clerk",
              meta: "Webhook user.updated",
              when: "hace 1 día",
            },
            {
              id: "3",
              icon: "shield",
              title: "Sesión nueva autorizada",
              meta: "iPad Pro 13\" · iPadOS 26",
              when: "hace 3 días",
            },
          ]}
        />
      ) : null}
    </>
  );
}

function ContactView({ me, presenter }: SectionViewProps) {
  return (
    <SectionGrid>
      <InfoCard eyebrow="Principal" title="Correo corporativo">
        <FieldRow label="Email" value={me.email} />
        <FieldRow label="Verificado" value="Sí (vía Clerk)" />
      </InfoCard>

      <InfoCard
        eyebrow="Alternativos"
        title="Teléfono y mensajería"
        hint="Aún no agregados. Tu manager puede solicitarlo."
      >
        <FieldRow label="Teléfono móvil" value={presenter ? "•••• •••• ••" : "—"} />
        <FieldRow label="WhatsApp Business" value="—" />
        <FieldRow label="Extensión tienda" value="—" />
      </InfoCard>
    </SectionGrid>
  );
}

function SecurityView({ me, presenter }: SectionViewProps) {
  return (
    <>
      <SectionGrid>
        <InfoCard eyebrow="Acceso" title="Contraseña y MFA">
          <FieldRow label="Contraseña" value="Gestionada por Clerk" />
          <FieldRow label="Doble factor" value="No configurado" />
          <FieldRow
            label="Cambio recomendado"
            value="cada 90 días"
          />
        </InfoCard>

        <InfoCard eyebrow="Sesiones" title="Dispositivos activos">
          <FieldRow
            label="Último inicio"
            value={formatLastSignIn(me.lastSignInAt)}
          />
          <FieldRow label="Sesiones abiertas" value="1 (este iPad)" />
          <FieldRow
            label="Otros dispositivos"
            value={presenter ? "•••" : "Ninguno"}
          />
        </InfoCard>
      </SectionGrid>

      {!presenter ? (
        <ActivityCard
          title="Bitácora de accesos"
          entries={[
            {
              id: "s1",
              icon: "shield",
              title: "Sesión iniciada",
              meta: "iPad Pro 13\" · CDMX",
              when: formatLastSignIn(me.lastSignInAt),
            },
            {
              id: "s2",
              icon: "shield",
              title: "Sesión iniciada",
              meta: "iPad Pro 11\" · CDMX",
              when: "hace 2 días",
            },
          ]}
        />
      ) : null}
    </>
  );
}

// ─── Trabajo ───────────────────────────────────────────────────────────────

function StoreView({ me }: SectionViewProps) {
  return (
    <SectionGrid>
      <InfoCard eyebrow="Tienda actual" title={me.storeName ?? "Sin tienda asignada"}>
        <FieldRow label="Zona" value={me.zoneName} />
        <FieldRow label="Tu rol en la tienda" value={roleLabel(me.role)} />
        <FieldRow
          label="Estatus"
          value={me.isActive ? "Operando" : "Suspendido"}
        />
      </InfoCard>

      <InfoCard
        eyebrow="Equipo"
        title="Quienes trabajan contigo"
        hint="Se actualiza desde directorio L'Oréal."
      >
        <FieldRow label="Manager directo" value="—" />
        <FieldRow label="Compañeros BA" value="—" />
        <FieldRow label="Supervisor de zona" value="—" />
      </InfoCard>
    </SectionGrid>
  );
}

function BrandsView({ me }: SectionViewProps) {
  const theme = useTheme();
  return (
    <>
      <SectionGrid>
        <InfoCard eyebrow="Primaria" title="Marca principal">
          <View
            style={[
              styles.brandPrimary,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <Text variant="title" color="primaryForeground">
              {(me.brandName ?? "L'Oréal").toUpperCase()}
            </Text>
            <Text
              variant="caption"
              color="primaryForeground"
              style={{ marginTop: 4, opacity: 0.7 }}
            >
              Asignada desde {formatDate(me.createdAt)}
            </Text>
          </View>
          <FieldRow label="Especialidad" value="Fragrance Expert" />
        </InfoCard>

        <InfoCard
          eyebrow="Adicionales"
          title="Marcas secundarias"
          hint="Solicita una nueva marca a tu manager."
        >
          <View style={styles.brandChipRow}>
            <BrandChip label="LANCÔME" />
            <BrandChip label="KIEHL'S" />
            <BrandChip label="ARMANI" />
            <BrandChip label="+ Añadir" muted />
          </View>
          <View style={{ marginTop: 16 }}>
            <Text variant="eyebrow" color="foregroundMuted">
              Permisos por marca
            </Text>
            <PermissionRow label="Crear clientes" enabled />
            <PermissionRow label="Enviar lookbooks" enabled />
            <PermissionRow label="Ver KPIs de marca" enabled />
            <PermissionRow label="Aprobar samples" enabled={false} />
          </View>
        </InfoCard>
      </SectionGrid>
    </>
  );
}

function BrandChip({ label, muted }: { label: string; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.brandChip,
        {
          borderColor: muted ? theme.colors.borderSoft : theme.colors.border,
          backgroundColor: muted ? "transparent" : theme.colors.card,
          borderRadius: theme.radius.md,
          ...(muted ? {} : theme.elevation.xs),
        },
      ]}
    >
      <Text
        variant="smallMedium"
        color={muted ? "foregroundMuted" : "foreground"}
      >
        {label}
      </Text>
    </View>
  );
}

function PermissionRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.permRow,
        { borderTopColor: theme.colors.borderSoft },
      ]}
    >
      <Glyph
        name={enabled ? "check" : "alert"}
        size={16}
        color={
          enabled ? theme.colors.success : theme.colors.foregroundSubtle
        }
      />
      <Text
        variant="body"
        color={enabled ? "foreground" : "foregroundMuted"}
        style={{ flex: 1, marginLeft: 8 }}
      >
        {label}
      </Text>
      <Text
        variant="caption"
        color={enabled ? "foregroundMuted" : "foregroundSubtle"}
      >
        {enabled ? "Activo" : "No incluido"}
      </Text>
    </View>
  );
}

function ScheduleView({ presenter }: SectionViewProps) {
  return (
    <SectionGrid>
      <InfoCard eyebrow="Turno" title="Horario habitual">
        <FieldRow label="Lunes a viernes" value="11:00 – 20:00" />
        <FieldRow label="Sábado" value="11:00 – 21:00" />
        <FieldRow label="Domingo" value="Descanso" />
      </InfoCard>

      <InfoCard eyebrow="Disponibilidad" title="Próximos descansos">
        <FieldRow label="Próximo día libre" value="Sáb 30 May" />
        <FieldRow
          label="Vacaciones programadas"
          value={presenter ? "—" : "15 – 22 Jul"}
        />
        <FieldRow label="Citas reservadas hoy" value="3" />
      </InfoCard>
    </SectionGrid>
  );
}

// ─── Desempeño ────────────────────────────────────────────────────────────

function KpisView({ presenter }: SectionViewProps) {
  const theme = useTheme();
  return (
    <>
      <Card padded>
        <Text variant="eyebrow" color="foregroundMuted">
          Ventas del mes
        </Text>
        <View style={styles.kpiHero}>
          <Text variant="numeric" color="foreground">
            {presenter ? "•••" : "$184,500"}
          </Text>
          <View style={styles.kpiTrend}>
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderRadius: theme.radius.full,
                },
              ]}
            >
              <Text variant="smallMedium" color="foreground">
                +12% vs abril
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <SectionGrid>
        <InfoCard eyebrow="Clientela" title="Engagement">
          <FieldRow
            label="Clientes contactadas"
            value={presenter ? "•••" : "47 / 60"}
          />
          <FieldRow
            label="Citas completadas"
            value={presenter ? "•••" : "18"}
          />
          <FieldRow
            label="Lookbooks enviados"
            value={presenter ? "•••" : "23"}
          />
        </InfoCard>

        <InfoCard eyebrow="Producto" title="Mix de categorías">
          <FieldRow
            label="Fragancia"
            value={presenter ? "•••" : "54% de tus ventas"}
          />
          <FieldRow
            label="Tratamiento"
            value={presenter ? "•••" : "28%"}
          />
          <FieldRow
            label="Maquillaje"
            value={presenter ? "•••" : "18%"}
          />
        </InfoCard>
      </SectionGrid>
    </>
  );
}

function RecognitionsView({ presenter }: SectionViewProps) {
  const theme = useTheme();
  return (
    <SectionGrid>
      <Card padded>
        <Text variant="eyebrow" color="foregroundMuted">
          Reconocimiento destacado
        </Text>
        <View
          style={[
            styles.medal,
            {
              backgroundColor: theme.colors.accentSoft,
              borderRadius: theme.radius.xl,
            },
          ]}
        >
          <Glyph name="star" size={28} color={theme.colors.accent} />
          <Text
            variant="title"
            color="foreground"
            style={{ marginTop: 8 }}
          >
            Top 5 BA de zona
          </Text>
          <Text variant="small" color="foregroundMuted">
            Abril 2026 · Lancôme
          </Text>
        </View>
      </Card>

      <InfoCard eyebrow="Próximas metas" title="Lo que sigue">
        <FieldRow
          label="Para Top 3"
          value={presenter ? "•••" : "+$22,000 este mes"}
        />
        <FieldRow label="Programa Excellence" value="65% del progreso" />
        <FieldRow label="Certificación próxima" value="YSL Fragrance Expert" />
      </InfoCard>
    </SectionGrid>
  );
}

// ─── Preferencias ─────────────────────────────────────────────────────────

function ThemeView(_: SectionViewProps) {
  const { mode, setMode } = useTheme();
  const options: { value: ThemeMode; label: string; hint?: string }[] = [
    { value: "system", label: "Automático", hint: "Sigue al sistema" },
    { value: "light", label: "Claro" },
    { value: "dark", label: "Oscuro" },
  ];
  return (
    <SectionGrid>
      <InfoCard eyebrow="Apariencia" title="Tema de la app">
        {options.map((opt) => (
          <ChoiceRow
            key={opt.value}
            label={opt.label}
            hint={opt.hint}
            selected={mode === opt.value}
            onPress={() => setMode(opt.value)}
          />
        ))}
      </InfoCard>

      <InfoCard eyebrow="Acento" title="Color de marca">
        <ChoiceRow
          label="Luxor Gold"
          hint="L'Oréal Paris premium"
          selected
        />
        <ChoiceRow label="Rouge Lancôme" hint="Lancôme" />
        <ChoiceRow label="Onyx YSL" hint="Yves Saint Laurent" />
      </InfoCard>
    </SectionGrid>
  );
}

function NotificationsView(_: SectionViewProps) {
  return (
    <SectionGrid>
      <InfoCard eyebrow="Canal" title="Cómo recibes alertas">
        <ToggleRow label="Notificaciones push" enabled />
        <ToggleRow label="Email diario" enabled={false} />
        <ToggleRow label="Resumen semanal" enabled />
      </InfoCard>

      <InfoCard eyebrow="Eventos" title="Qué quieres saber">
        <ToggleRow label="Cliente abre un lookbook" enabled />
        <ToggleRow label="Cita próxima en 1 hora" enabled />
        <ToggleRow label="Nuevo lanzamiento de marca" enabled />
        <ToggleRow label="Reabastecimiento de stock" enabled={false} />
      </InfoCard>
    </SectionGrid>
  );
}

function LanguageView(_: SectionViewProps) {
  return (
    <SectionGrid>
      <InfoCard eyebrow="Idioma" title="Cómo se muestra la app">
        <ChoiceRow label="Español (México)" selected />
        <ChoiceRow label="English (US)" />
        <ChoiceRow label="Français" />
      </InfoCard>

      <InfoCard eyebrow="Región" title="Formato y zona horaria">
        <FieldRow label="Zona horaria" value="GMT-6 · Ciudad de México" />
        <FieldRow label="Formato de fecha" value="DD/MM/AAAA" />
        <FieldRow label="Moneda" value="MXN $" />
      </InfoCard>
    </SectionGrid>
  );
}

function ChoiceRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choiceRow,
        { borderTopColor: theme.colors.borderSoft },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="foreground">
          {label}
        </Text>
        {hint ? (
          <Text
            variant="small"
            color="foregroundMuted"
            style={{ marginTop: 2 }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected
              ? theme.colors.accent
              : theme.colors.border,
            backgroundColor: selected
              ? theme.colors.accentSoft
              : "transparent",
          },
        ]}
      >
        {selected ? (
          <View
            style={[
              styles.radioDot,
              { backgroundColor: theme.colors.accent },
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.choiceRow,
        { borderTopColor: theme.colors.borderSoft },
      ]}
    >
      <Text variant="body" color="foreground" style={{ flex: 1 }}>
        {label}
      </Text>
      <View
        style={[
          styles.toggleTrack,
          {
            backgroundColor: enabled
              ? theme.colors.foreground
              : theme.colors.muted,
          },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            { left: enabled ? 18 : 2, backgroundColor: theme.colors.card },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatLastSignIn(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDate(iso);
}

const styles = StyleSheet.create({
  brandPrimary: {
    padding: 20,
    marginBottom: 16,
  },
  brandChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  kpiHero: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  kpiTrend: { flex: 1 },
  trendPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  medal: {
    marginTop: 12,
    padding: 24,
    alignItems: "center",
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toggleTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  toggleThumb: {
    position: "absolute",
    top: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
