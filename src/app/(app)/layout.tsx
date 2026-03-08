import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!user) {
    redirect("/pending-approval");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav userEmail={user.email} userRole={user.role} />
      <main className="mx-auto max-w-[1600px] px-3 sm:px-4 py-3 sm:py-4">{children}</main>
    </div>
  );
}
