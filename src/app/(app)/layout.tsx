import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { role: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav userEmail={user.email ?? ""} userRole={dbUser?.role ?? "member"} />
      <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
    </div>
  );
}
