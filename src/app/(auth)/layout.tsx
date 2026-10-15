import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="wrap flex items-center justify-between py-5">
        <Logo className="w-[140px]" />
        <Link href="/" className="btn btn-quiet">
          Back to website
        </Link>
      </header>
      <main id="content" className="wrap flex flex-1 items-start justify-center pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
