import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { ProductEditor } from "../../_components/product-editor";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  const { id } = await params;
  return <ProductEditor mode="edit" productId={id} />;
}
