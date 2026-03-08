"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const ADMIN_ROLES = ["admin", "captain", "vice_captain"];

const navLinks = [
  { href: "/bookings", label: "Bookings", adminOnly: false },
  { href: "/my-bookings", label: "My Bookings", adminOnly: false },
  { href: "/profile", label: "Profile", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function AppNav({ userEmail, userRole }: { userEmail: string; userRole: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = navLinks.filter((link) => !link.adminOnly || ADMIN_ROLES.includes(userRole));

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
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
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
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex">
            Sign out
          </Button>
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="sm:hidden p-2 -mr-2 rounded-md hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="sm:hidden border-t bg-white px-4 py-2 space-y-1" aria-label="Mobile navigation">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              className={cn(
                "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t mt-2">
            <p className="px-3 py-1 text-xs text-muted-foreground truncate">{userEmail}</p>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
