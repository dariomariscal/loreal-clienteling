import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { CustomerList } from "@/components/advisor/customer-list";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { UserGlyph } from "@/components/ui/glyphs";

export const metadata = { title: "Mis clientas" };

export default function CustomersPage() {
  return (
    <ThreeColumnLayout
      list={<CustomerList />}
      detail={
        <div className="flex h-full items-center justify-center">
          <AdvisorEmptyState
            icon={<UserGlyph className="size-8" />}
            title="Selecciona una clienta"
            description="Elige a alguien de la lista para ver su perfil completo, preferencias de belleza e historia."
          />
        </div>
      }
    />
  );
}
