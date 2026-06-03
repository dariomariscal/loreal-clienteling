import type { ReactNode } from "react";

/**
 * Layout for unauthenticated routes (the public showroom). Deliberately
 * skips the advisor shell — no sidebar, no nav, no auth gating — so the
 * customer can land here on their phone without a Clerk session.
 *
 * The root layout still wraps this with ClerkProvider + QueryProvider, which
 * is fine: ClerkProvider tolerates anonymous sessions and the api client
 * sends no Authorization header when no resolver is registered.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">{children}</div>
  );
}
