import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { ActionForm } from "@/components/admin/action-form";
import { UserFields } from "@/components/admin/user-fields";
import { PasswordInput } from "@/components/admin/password-input";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { createUser } from "../actions";

export const metadata: Metadata = { title: "Add a customer" };

export default async function NewUserPage() {
  await requireAdmin();
  const canEmail = emailConfigured();

  return (
    <>
      <Breadcrumbs items={[{ label: "Customers", href: "/admin/users" }, { label: "Add a customer" }]} />
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3rem)]">Add a customer</h1>
      <p className="mt-2 text-mist">You&apos;ll choose which categories and shows they can see on the next screen.</p>

      <div className="panel mt-8 max-w-3xl p-6 sm:p-8">
        <ActionForm action={createUser} submitLabel="Create customer" pendingLabel="Creating…">
          <UserFields />

          <fieldset className="grid gap-4 rounded-xl border border-line p-5">
            <legend className="px-2 font-semibold">How they&apos;ll log in</legend>
            {canEmail && (
              <label className="check">
                <input type="checkbox" name="invite" defaultChecked />
                <span>
                  <span className="block font-semibold">Email them an invite to choose their own password</span>
                  <span className="block text-sm text-mist">The link lasts 7 days. Leave the password below empty.</span>
                </span>
              </label>
            )}
            <div>
              <label htmlFor="password" className="label">
                {canEmail ? "Or set a password for them" : "Password"}
              </label>
              <PasswordInput />
              <p className="hint">At least 10 characters. Share it with them yourself.</p>
            </div>
          </fieldset>

          <label className="check">
            <input type="checkbox" name="accessAll" />
            <span>Give them access to everything in the library</span>
          </label>
          <label className="check">
            <input type="checkbox" name="canPlay" defaultChecked />
            <span>
              <span className="block font-semibold">Can play shows on the site</span>
              <span className="block text-sm text-mist">The player, live call list and bingo checker on show pages.</span>
            </span>
          </label>
        </ActionForm>
      </div>
    </>
  );
}
