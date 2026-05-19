import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { ProductsImport } from "../_components/products-import";

export default async function ImportProductsPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <ProductsImport />;
}
