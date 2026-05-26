"use client";

import type { SessionUser } from "@/lib/auth";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { useBrand } from "@/lib/hooks/use-brands";
import { useStore } from "@/lib/hooks/use-stores";

const ROLE_LABELS: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

interface AccountHeaderCardProps {
  user: SessionUser;
}

/**
 * Persistent identity header rendered above every account sub-page. Mirrors
 * the customer-360 header rhythm: large avatar on the left, editorial name,
 * a single line of meta chips for context (role · brand · store).
 */
export function AccountHeaderCard({ user }: AccountHeaderCardProps) {
  const { data: brand } = useBrand(user.brandId ?? "");
  const { data: store } = useStore(user.storeId ?? "");
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  const [firstName, ...rest] = (user.fullName ?? "").split(" ");
  const lastName = rest.join(" ");

  return (
    <header className="flex items-center gap-5 rounded-xl border border-border bg-card px-6 py-5">
      <CustomerAvatar
        firstName={firstName || user.email}
        lastName={lastName || null}
        avatarUrl={user.imageUrl}
        size="xl"
      />
      <div className="min-w-0 flex-1">
        <h1 className="font-[var(--font-heading)] text-2xl tracking-tight text-foreground">
          {user.fullName || user.email}
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {user.email}
        </p>
        <ul className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip>{roleLabel}</Chip>
          {brand?.displayName ? <Chip>{brand.displayName}</Chip> : null}
          {store?.displayName ? <Chip>{store.displayName}</Chip> : null}
        </ul>
      </div>
    </header>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex h-6 items-center rounded-full border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground">
      {children}
    </li>
  );
}
