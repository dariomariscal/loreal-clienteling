"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { SparkleDotGlyph } from "@/components/ui/glyphs";
import { useCustomers, type CustomerListItem } from "@/lib/hooks/use-customers";

type Bucket = "all" | "birthday" | "at_risk" | "vip";

interface BucketDef {
  key: Bucket;
  label: string;
  /** Tone of the chip when active — semantic. */
  tone: "neutral" | "positive" | "warning" | "danger";
  description: string;
}

const BUCKETS: BucketDef[] = [
  {
    key: "all",
    label: "Toda la zona",
    tone: "neutral",
    description: "Clientas de todas las tiendas en mi scope",
  },
  {
    key: "birthday",
    label: "Cumpleaños",
    tone: "positive",
    description: "Cumplen en los próximos 14 días",
  },
  {
    key: "at_risk",
    label: "En riesgo",
    tone: "warning",
    description: "Llevan tiempo sin comprar — coachear al BA",
  },
  {
    key: "vip",
    label: "VIP",
    tone: "positive",
    description: "Clientas VIP de toda la zona",
  },
];

/**
 * Linear-style triage inbox for customers in the area manager's zone.
 * Bucket chips top, filterable list below. Each row is a tap to the
 * customer detail (reuses the existing advisor profile shell).
 *
 * Designed for iPad: 64pt row height, easy to long-press, big bucket chips
 * sized for tap accuracy at 44pt+.
 */
export function AreaCustomersPage() {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [search, setSearch] = useState("");

  // Map bucket → API filters.
  const params = useMemo(() => {
    const base: Parameters<typeof useCustomers>[0] = { limit: "100" };
    if (bucket === "birthday") base.birthdayWithinDays = "14";
    if (bucket === "at_risk") base.stage = "at_risk";
    if (bucket === "vip") base.stage = "vip";
    return base;
  }, [bucket]);

  const { data, isLoading } = useCustomers(params);
  const all = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return all;
    const q = search.toLowerCase().trim();
    return all.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.email ?? ""} ${c.phone ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [all, search]);

  return (
    <SingleColumn>
      <div className="flex h-full w-full flex-col">
        <header className="border-b border-border bg-background px-6 py-5 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-[family-name:var(--font-heading)] text-3xl tracking-tight text-foreground">
                  Clientas
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pipeline consolidado de tu zona · {filtered.length}
                  {filtered.length === 1 ? " clienta" : " clientas"}
                </p>
              </div>
              <input
                type="search"
                placeholder="Buscar por nombre, email o teléfono"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full max-w-xs rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/60"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {BUCKETS.map((b) => (
                <BucketChip
                  key={b.key}
                  bucket={b}
                  active={bucket === b.key}
                  onClick={() => setBucket(b.key)}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {BUCKETS.find((b) => b.key === bucket)?.description}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <CustomerTriageList
                items={filtered}
                loading={isLoading}
                bucket={bucket}
              />
            </div>
          </div>
        </div>
      </div>
    </SingleColumn>
  );
}

function BucketChip({
  bucket,
  active,
  onClick,
}: {
  bucket: BucketDef;
  active: boolean;
  onClick: () => void;
}) {
  // Active state uses the foreground/background contrast so it's visible
  // across BA-light and dark themes; tone hints sit as a colored dot.
  const dotTone =
    bucket.tone === "positive"
      ? "bg-success"
      : bucket.tone === "warning"
        ? "bg-[var(--color-warning,oklch(0.75_0.15_65))]"
        : bucket.tone === "danger"
          ? "bg-destructive"
          : "bg-muted-foreground/50";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          : "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted/40"
      }
    >
      <span aria-hidden className={`size-2 rounded-full ${dotTone}`} />
      <span>{bucket.label}</span>
    </button>
  );
}

function CustomerTriageList({
  items,
  loading,
  bucket,
}: {
  items: CustomerListItem[];
  loading: boolean;
  bucket: Bucket;
}) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<SparkleDotGlyph className="size-6" />}
        title="Sin clientas en este filtro"
        description={
          bucket === "birthday"
            ? "Vuelve cuando alguien cumpla en los próximos días."
            : "Cambia de filtro o intenta una búsqueda diferente."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((c) => (
        <CustomerTriageRow key={c.id} customer={c} bucket={bucket} />
      ))}
    </ul>
  );
}

function CustomerTriageRow({
  customer,
  bucket,
}: {
  customer: CustomerListItem;
  bucket: Bucket;
}) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const lastSeen = customer.lastInteractionAt
    ? formatDistanceToNow(new Date(customer.lastInteractionAt), {
        addSuffix: true,
        locale: es,
      })
    : null;
  const upcomingBirthday =
    bucket === "birthday" && customer.birthday
      ? format(new Date(customer.birthday), "d MMM", { locale: es })
      : null;

  return (
    <li>
      <Link
        href={`/advisor/customers/${customer.id}`}
        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <CustomerAvatar
          firstName={customer.firstName}
          lastName={customer.lastName}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {fullName}
            </p>
            {customer.lifecycleStage === "vip" ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                VIP
              </Badge>
            ) : null}
            {customer.lifecycleStage === "at_risk" ? (
              <Badge
                variant="outline"
                className="border-destructive/30 text-[10px] uppercase text-destructive"
              >
                En riesgo
              </Badge>
            ) : null}
            {upcomingBirthday ? (
              <Badge
                variant="outline"
                className="border-success/30 text-[10px] uppercase text-success"
              >
                🎂 {upcomingBirthday}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {customer.assignedToName ?? "Sin asignar"}
            {lastSeen ? <> · vista {lastSeen}</> : null}
            {customer.orderCount != null ? (
              <>
                {" "}
                · <span className="tabular-nums">{customer.orderCount}</span>{" "}
                {customer.orderCount === 1 ? "orden" : "órdenes"}
              </>
            ) : null}
          </p>
        </div>
        {customer.ltv != null ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            ${Math.round(Number(customer.ltv)).toLocaleString("es-MX")}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
