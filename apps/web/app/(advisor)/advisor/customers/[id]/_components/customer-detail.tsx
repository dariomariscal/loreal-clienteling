"use client";

import { useCustomer } from "@/lib/hooks/use-customers";
import { CustomerDetailHeader } from "./customer-detail-header";
import { BeautyProfileSection } from "./beauty-profile-section";
import { ActiveContextSection } from "./active-context-section";
import { WishlistSection } from "./wishlist-section";
import { PurchaseHistorySection } from "./purchase-history-section";
import { TimelineSection } from "./timeline-section";
import { NotesSection } from "./notes-section";

interface Props {
  customerId: string;
}

export function CustomerDetail({ customerId }: Props) {
  const { data: customer, isLoading, isError } = useCustomer(customerId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading client…
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Client not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CustomerDetailHeader customer={customer} />
      <div className="flex-1 overflow-y-auto px-10 pt-8 pb-16 lg:px-14">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <BeautyProfileSection customerId={customerId} />
          <ActiveContextSection customerId={customerId} />
          <WishlistSection customerId={customerId} />
          <PurchaseHistorySection customerId={customerId} />
          <TimelineSection customerId={customerId} />
          <NotesSection customerId={customerId} />
        </div>
      </div>
    </div>
  );
}
