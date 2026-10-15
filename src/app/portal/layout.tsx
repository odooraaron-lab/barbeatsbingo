import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, accessHasExpired } from "@/lib/auth";
import { PortalHeader } from "@/components/portal/portal-header";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: { default: "Customer portal", template: "%s | Customer portal" },
  robots: { index: false, follow: false },
};

// Every portal page depends on who is logged in, so it renders per request.
export const instant = false;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const expired = accessHasExpired(user);

  return (
    <div className="flex min-h-dvh flex-col">
      <PortalHeader user={user} area="portal" />
      {expired && (
        <div className="border-b border-sun/30 bg-sun/10">
          <p className="wrap py-3 text-[0.95rem] text-[#fbe9b5]">
            Your access ended on {formatDate(user.accessExpiresAt)}.{" "}
            <Link href="/contact-us" className="font-semibold text-sun underline underline-offset-4">
              Contact us to renew
            </Link>
            .
          </p>
        </div>
      )}
      <main id="content" className="wrap flex-1 pb-20 pt-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
