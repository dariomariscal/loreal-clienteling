import { Suspense } from "react";
import { ExecutiveBriefing } from "./_components/executive-briefing";
import "./print.css";

export const metadata = {
  title: "Reporte Ejecutivo",
};

interface PageProps {
  searchParams: Promise<{
    scope?: string;
    recipient?: string;
  }>;
}

/**
 * /reports/executive — print-ready monthly executive briefing.
 *
 * Reads scope/recipient from query params; all analytics filters (from, to,
 * banner, brandId, storeId, baUserId, zoneId) are picked up by the inner
 * component via useSearchParams so the brief reflects the exact slice the
 * caller was viewing.
 *
 * URL: /reports/executive?scope=Nacional&from=2026-05-01&to=2026-05-31&print=1
 *      → loads the brief and auto-fires window.print() once data is ready.
 */
export default async function Page({ searchParams }: PageProps) {
  const { scope, recipient } = await searchParams;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExecutiveBriefing
        scopeLabel={scope ?? "Nacional"}
        recipientName={recipient ?? undefined}
      />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
      Preparando reporte ejecutivo…
    </div>
  );
}
