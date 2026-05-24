import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { MessagesScreen } from "./_components/messages-screen";

interface MessagesPageProps {
  params: Promise<{ id: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  const { id } = await params;
  return <MessagesScreen customerId={id} />;
}
