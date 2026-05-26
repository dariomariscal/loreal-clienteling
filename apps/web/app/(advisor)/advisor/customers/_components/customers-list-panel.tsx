"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { UserPlusGlyph } from "@/components/ui/glyphs";
import { CustomerList } from "@/components/advisor/customer-list";
import { NewCustomerSheet } from "./new-customer-sheet";

// Left column of /advisor/customers. Wraps the shared CustomerList and
// adds the "Nueva clienta" action above it — the BA's primary CTA when
// a customer walks into the store and isn't on file yet.

export function CustomersListPanel() {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base leading-tight text-foreground">
            Mis clientas
          </h2>
        </div>
        <Button
          size="sm"
          className="h-10 gap-1.5 px-3"
          onClick={() => setSheetOpen(true)}
        >
          <UserPlusGlyph className="size-4" aria-hidden />
          Nueva
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <CustomerList />
      </div>

      <NewCustomerSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
