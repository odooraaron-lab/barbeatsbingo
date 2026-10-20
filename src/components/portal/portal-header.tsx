import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/session";

export function PortalHeader({ user, area }: { user: SessionUser; area: "portal" | "admin" }) {
  const links =
    area === "admin"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/users", label: "Customers" },
          { href: "/admin/library", label: "Library" },
          { href: "/admin/enquiries", label: "Enquiries" },
          { href: "/admin/website", label: "Website" },
          { href: "/portal", label: "Customer view" },
        ]
      : [
          { href: "/portal", label: "Library" },
          { href: "/portal/account", label: "Account" },
          ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
        ];

  return (
    <header className="border-b border-line bg-black/90">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Logo href={area === "admin" ? "/admin" : "/portal"} className="w-[112px]" />
        {area === "admin" && <span className="tag bg-sun/15 text-sun">Admin</span>}
        <nav aria-label={area === "admin" ? "Admin" : "Portal"} className="order-3 -mx-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[0.95rem] font-medium text-white/85 hover:bg-white/5 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-[220px] truncate text-sm text-mist md:block" title={user.email}>
            {user.venue || user.name || user.email}
          </span>
          <form action={logout}>
            <button type="submit" className="btn btn-quiet btn-sm">
              <LogOut size={16} aria-hidden /> Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
