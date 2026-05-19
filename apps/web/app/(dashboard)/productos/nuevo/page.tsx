import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { ProductEditor } from "../_components/product-editor";

export default async function NewProductPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <ProductEditor mode="create" />;
}
