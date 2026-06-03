"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface ReportSidePanelProps {
  /**
   * Query-param name that holds the entity id. When present in the URL the
   * panel opens; clearing it closes the panel. Defaults to "id".
   */
  paramName?: string;
  /** Headline of the panel. */
  title: React.ReactNode;
  /** Optional sub-line under the title. */
  description?: React.ReactNode;
  /** Footer actions (buttons). */
  footer?: React.ReactNode;
  /** Width preset. Default "default" = 480px which matches the Endear pattern. */
  size?: "default" | "lg" | "xl";
  children: React.ReactNode;
}

/**
 * Side panel for drill-down — Endear / Tulip / Linear pattern. State lives in
 * the URL (?id=xxx) so the panel is bookmarkable / shareable and survives a
 * page refresh.
 *
 * Usage:
 *   const { openId, open, close } = useReportSidePanel();
 *   <Button onClick={() => open("123")}>Open</Button>
 *   {openId && <ReportSidePanel title={...}>{...}</ReportSidePanel>}
 *
 * The component reads/writes the same URL param internally so consumers just
 * need to call openId-aware children. No prop drilling of open state.
 */
export function ReportSidePanel({
  paramName = "id",
  title,
  description,
  footer,
  size = "default",
  children,
}: ReportSidePanelProps) {
  const { close } = useReportSidePanel(paramName);

  return (
    <Sheet
      open
      onOpenChange={(next: boolean) => {
        if (!next) close();
      }}
    >
      <SheetContent side="right" size={size} className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-3">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook that owns the open-id URL parameter. Returns the current id (or null)
 * plus open/close helpers. Consumers use this both to render the panel and to
 * trigger drill-down from a chart row, table cell, etc.
 */
export function useReportSidePanel(paramName: string = "id") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openId = searchParams.get(paramName);

  const open = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, paramName],
  );

  const close = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams, paramName]);

  return { openId, open, close };
}
