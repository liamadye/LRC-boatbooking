"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/bookings", label: "Bookings" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export function AppNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-[1600px] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-6">
          <Link
            href="/bookings"
            className="flex items-center gap-2 font-bold text-blue-600"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white text-xs font-bold">
              LRC
            </span>
            <span className="hidden sm:inline">Boat Booking</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:inline">
            {userEmail}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
