import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { CustomerList } from "@/components/advisor/customer-list";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { UserGlyph } from "@/components/ui/glyphs";

export const metadata = { title: "My Clients" };

export default function CustomersPage() {
  return (
    <ThreeColumnLayout
      list={<CustomerList />}
      detail={
        <div className="flex h-full items-center justify-center">
          <AdvisorEmptyState
            icon={<UserGlyph className="size-8" />}
            title="Select a client"
            description="Choose a client from the list to see their full profile, beauty preferences and history."
          />
        </div>
      }
    />
  );
}
