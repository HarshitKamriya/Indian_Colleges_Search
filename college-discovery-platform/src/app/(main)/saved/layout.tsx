import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/?authMode=login&callbackUrl=/saved");
  }

  return <>{children}</>;
}
