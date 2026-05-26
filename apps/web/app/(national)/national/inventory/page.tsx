import type { Metadata } from "next";
import { InventoryMatrixPage } from "@/app/(area-manager)/area-manager/inventory/_components/inventory-matrix-page";

export const metadata: Metadata = {
  title: "Inventario nacional — L'Oréal Clienteling",
};

/**
 * Inventory matrix at NRM scope. The `useInventoryZoneSummary` endpoint
 * already returns a roll-up of stores the caller can access — for an NRM
 * that's every store in the division. The matrix component handles arbitrary
 * row/column counts via horizontal scroll + sticky first column, so reuse
 * is direct. A "by zone" aggregate alternate view is documented as a v2
 * follow-up (would need a new endpoint shape — `/inventory/zone-rollup`).
 */
export default function Page() {
  return <InventoryMatrixPage />;
}
