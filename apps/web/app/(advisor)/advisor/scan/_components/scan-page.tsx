"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { ScanCameraStage } from "@/components/scan/scan-camera-stage";
import { useActiveVisit } from "@/lib/hooks/use-customer-visits";
import { useCustomer } from "@/lib/hooks/use-customers";

/**
 * /advisor/scan — full-bleed scan flow. The scanner is no longer reachable
 * from the global sidebar; it's launched from a customer profile via the
 * quick-actions row, which appends `?customerId=<id>` so every scan binds
 * to that customer and auto-adds to their wishlist.
 *
 * Customer binding precedence:
 *   1. `?customerId` query param (explicit launch from a profile).
 *   2. Active visit, if any (back-compat for sessions that opened a visit).
 */
export function ScanPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const customerIdFromQuery = searchParams.get("customerId");

  const { data: activeVisit } = useActiveVisit(userId ?? undefined);
  const { data: queryCustomer } = useCustomer(customerIdFromQuery ?? "");

  const activeCustomer = customerIdFromQuery
    ? queryCustomer
      ? {
          id: queryCustomer.id,
          firstName: queryCustomer.firstName,
          lastName: queryCustomer.lastName,
          phone: queryCustomer.phone,
          avatarUrl: queryCustomer.avatarUrl ?? null,
        }
      : null
    : activeVisit?.customer
      ? {
          id: activeVisit.customer.id,
          firstName: activeVisit.customer.firstName,
          lastName: activeVisit.customer.lastName,
          phone: activeVisit.customer.phone,
          avatarUrl: null,
        }
      : null;

  return (
    <SingleColumn className="bg-foreground">
      <ScanCameraStage
        activeCustomer={activeCustomer}
        autoAddToWishlist={Boolean(customerIdFromQuery)}
      />
    </SingleColumn>
  );
}
