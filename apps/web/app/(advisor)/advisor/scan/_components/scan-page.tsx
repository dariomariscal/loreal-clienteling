"use client";

import { useAuth } from "@clerk/nextjs";
import { SingleColumn } from "@/components/advisor/three-column-layout";
import { ScanCameraStage } from "@/components/scan/scan-camera-stage";
import { useActiveVisit } from "@/lib/hooks/use-customer-visits";

/**
 * /advisor/scan — full-bleed scan flow. The page's only job is to bind the
 * BA's active visit (if any) so the camera stage auto-attaches every scan
 * to that customer. Everything else lives in `ScanCameraStage`.
 */
export function ScanPage() {
  const { userId } = useAuth();
  const { data: activeVisit } = useActiveVisit(userId ?? undefined);

  const activeCustomer = activeVisit?.customer
    ? {
        id: activeVisit.customer.id,
        firstName: activeVisit.customer.firstName,
        lastName: activeVisit.customer.lastName,
        // The visit list projection doesn't carry avatarUrl; the match banner
        // gracefully falls back to initials via CustomerAvatar.
        avatarUrl: null,
      }
    : null;

  return (
    <SingleColumn className="bg-foreground">
      <ScanCameraStage activeCustomer={activeCustomer} />
    </SingleColumn>
  );
}
