import Link from "next/link";

export function Logo({ className = "", href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`inline-block shrink-0 ${className}`} aria-label="Bar Beats Bingo home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Bar Beats Bingo: No balls, just beats" width={720} height={376} className="h-auto w-full" />
    </Link>
  );
}
