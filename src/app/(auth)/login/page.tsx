import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { safeNextPath } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Customer login" };
export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(safeNextPath(next, user.role === "admin" ? "/admin" : "/portal"));

  return (
    <>
      <h1 className="text-4xl">Customer login</h1>
      <p className="mt-2 text-mist">Log in to download your games, scorecards and host sheets.</p>
      <div className="panel mt-8 p-6 sm:p-8">
        <LoginForm next={safeNextPath(next, "") || undefined} />
      </div>
      <p className="mt-6 text-center text-mist">
        Need an account?{" "}
        <Link href="/contact-us" className="text-white underline underline-offset-4">
          Contact us
        </Link>
      </p>
    </>
  );
}
