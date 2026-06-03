import { ProductBarcodeView } from "./_components/product-barcode-view";

export const metadata = { title: "Producto" };

export default async function PublicCatalogDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductBarcodeView productId={productId} />;
}
