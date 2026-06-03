import { CatalogBrowser } from "./_components/catalog-browser";

export const metadata = {
  title: "Catálogo",
  description:
    "Explora los productos disponibles y muéstrale el código a la asesora para escanearlo.",
};

export default function PublicCatalogPage() {
  return <CatalogBrowser />;
}
