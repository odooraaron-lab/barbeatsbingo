import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PortalHeader } from "@/components/portal/portal-header";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <PortalHeader user={user} area="admin" />
      <main id="content" className="wrap flex-1 pb-20 pt-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
