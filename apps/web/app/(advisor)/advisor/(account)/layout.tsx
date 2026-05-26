import type { ReactNode } from "react";
import { AccountNav } from "./_components/account-nav";

/**
 * Account sub-layout. The parent advisor shell still wraps this with the
 * global brand sidebar, so this composes the canonical three-column
 * settings shell: global advisor nav → account nav → page content.
 *
 * The route group `(account)` keeps URLs flat (`/advisor/account`,
 * `/advisor/security`) while sharing this layout across siblings.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full bg-[color:var(--ba-surface)]">
      <AccountNav />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
