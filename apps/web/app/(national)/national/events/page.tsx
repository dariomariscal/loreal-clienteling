import type { Metadata } from "next";
import { AreaEventsPage } from "@/app/(area-manager)/area-manager/events/_components/area-events-page";

export const metadata: Metadata = {
  title: "Eventos — L'Oréal Clienteling",
};

/**
 * Events at the NRM scope use the exact same UX as the Area Manager —
 * list + swimlane toggle, multi-store rollout sheet. The events API is
 * already scoped server-side via `getAccessibleStoreIds`, which for an NRM
 * resolves to every store in their division. Reusing the AM component is
 * the cleanest DRY: zero new logic, identical visuals, free upstream fixes.
 */
export default function Page() {
  return <AreaEventsPage />;
}
