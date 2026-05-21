"use client";

import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

/**
 * Tabs primitive wrapping @base-ui/react/tabs in the Linear/Notion style:
 * a thin underline under the active trigger animates between positions,
 * triggers themselves are typographic (no pills, no shadows).
 *
 * Use the `TabsURLProvider` helper if you want the active tab persisted
 * to a `?tab=` search param — pages that opt in get shareable links and a
 * working back button for free.
 */

function Root({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Root>) {
  return (
    <BaseTabs.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function List({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        "relative isolate flex shrink-0 items-center gap-1 border-b border-border overflow-x-auto",
        // Hide native scrollbar; keep keyboard accessibility.
        "scrollbar-none [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function Trigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap",
        "text-muted-foreground transition-colors duration-150",
        "hover:text-foreground",
        "data-[selected]:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-md",
        // The underline is rendered by Indicator below — no per-trigger
        // border-bottom to avoid jumpy double underlines.
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function Indicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Indicator>) {
  return (
    <BaseTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute bottom-0 left-0 z-0 h-[2px] rounded-full bg-foreground",
        "transition-[transform,width] duration-200 ease-[cubic-bezier(0,0.09,0.4,1)]",
        className,
      )}
      {...props}
    />
  );
}

function Content({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      className={cn(
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-md",
        className,
      )}
      {...props}
    />
  );
}

export {
  Root as Tabs,
  List as TabsList,
  Trigger as TabsTrigger,
  Indicator as TabsIndicator,
  Content as TabsContent,
};
