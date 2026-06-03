import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ProductsPage } from "./_components/products-page";

export default async function ProductosPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <ProductsPage user={session.user} />;
}
