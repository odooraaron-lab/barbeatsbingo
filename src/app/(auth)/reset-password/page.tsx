import type { Metadata } from "next";
import Link from "next/link";
import { findValidToken } from "@/lib/password-links";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };
export const instant = false;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const row = await findValidToken(token);

  if (!row) {
    return (
      <>
        <h1 className="text-4xl">This link has expired</h1>
        <p className="mt-3 text-mist">
          Password links work once and only for a limited time. Ask for a new one and use it straight away.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/forgot-password" className="btn btn-red">
            Send a new link
          </Link>
          <Link href="/login" className="btn btn-ghost">
            Back to login
          </Link>
        </div>
      </>
    );
  }

  const invite = row.purpose === "invite";
  return (
    <>
      <h1 className="text-4xl">{invite ? "Welcome! Choose a password" : "Choose a new password"}</h1>
      <p className="mt-2 text-mist">
        For <strong className="text-white">{row.email}</strong>. Use at least 10 characters.
      </p>
      <div className="panel mt-8 p-6 sm:p-8">
        <SetPasswordForm token={token} email={row.email} submitLabel={invite ? "Set password and log in" : "Save new password"} />
      </div>
    </>
  );
}
