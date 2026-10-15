import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-4xl">Reset your password</h1>
      <p className="mt-2 text-mist">Enter the email you log in with and we&apos;ll send you a link to choose a new password.</p>
      <div className="panel mt-8 p-6 sm:p-8">
        <ForgotForm />
      </div>
      <p className="mt-6 text-center">
        <Link href="/login" className="text-mist underline underline-offset-4 hover:text-white">
          Back to login
        </Link>
      </p>
    </>
  );
}
