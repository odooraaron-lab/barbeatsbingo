import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-dvh flex-col items-start justify-center py-16">
      <Logo className="w-[150px]" />
      <h1 className="mt-10 text-[clamp(2.6rem,7vw,4.5rem)]">
        No bingo here
      </h1>
      <p className="mt-4 max-w-md text-lg text-mist">
        We couldn&apos;t find that page. It may have moved when we updated the website.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-red">
          Go to the home page
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Customer login
        </Link>
      </div>
    </div>
  );
}
