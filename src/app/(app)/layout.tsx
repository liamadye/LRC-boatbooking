import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav userEmail={user.email} userRole={user.role} />
      <main className="mx-auto max-w-[1600px] px-3 sm:px-4 py-3 sm:py-4">{children}</main>
    </div>
  );
}
