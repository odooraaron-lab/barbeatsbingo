import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { PasswordForm } from "./password-form";
import { InstallApp } from "@/components/portal/install-app";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <>
      <Breadcrumbs items={[{ label: "Library", href: "/portal" }, { label: "Account" }]} />
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.2rem)]">Your account</h1>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel p-6 sm:p-8">
          <h2 className="font-sans text-xl font-bold">Your details</h2>
          <dl className="mt-5 grid gap-4">
            {[
              ["Name", user.name || "Not set"],
              ["Venue or business", user.venue || "Not set"],
              ["Email", user.email],
              [
                "Access",
                user.role === "admin"
                  ? "Admin: everything"
                  : user.accessExpiresAt
                    ? `Until ${formatDate(user.accessExpiresAt)}`
                    : "Ongoing",
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-fog">{k}</dt>
                <dd className="break-words font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-mist">
            Need to change your details or access?{" "}
            <Link href="/contact-us" className="text-white underline underline-offset-4">
              Contact us
            </Link>
            .
          </p>
        </section>

        <section className="panel p-6 sm:p-8">
          <h2 className="font-sans text-xl font-bold">Change your password</h2>
          <div className="mt-5">
            <PasswordForm email={user.email} />
          </div>
        </section>
        <div className="lg:col-start-1">
          <InstallApp variant="panel" />
        </div>
      </div>
    </>
  );
}
