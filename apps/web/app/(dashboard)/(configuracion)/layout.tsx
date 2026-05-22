import { SettingsNav } from "./_components/settings-nav";

/**
 * Settings sub-layout. The parent `(dashboard)/layout.tsx` still wraps this
 * with the global sidebar + header, so we get the canonical three-column
 * settings shell: global nav → settings nav → page content.
 *
 * The route group `(configuracion)` is in parens so the URLs stay flat
 * (`/perfil`, `/seguridad`) — Next.js composes the layouts without polluting
 * the path, which is what GitHub/Linear/Notion all do (clean URLs that still
 * benefit from a persistent sticky sub-nav).
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl gap-10 md:gap-12">
      <SettingsNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
