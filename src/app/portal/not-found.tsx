import Link from "next/link";

export default function PortalNotFound() {
  return (
    <div className="panel max-w-2xl p-8">
      <h1 className="text-3xl">That isn&apos;t in your library</h1>
      <p className="mt-3 text-mist">
        The playlist may have been renamed or removed, or it isn&apos;t included in your account. If you think you
        should have it, get in touch.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/portal" className="btn btn-red">
          Back to your library
        </Link>
        <Link href="/contact-us" className="btn btn-ghost">
          Contact us
        </Link>
      </div>
    </div>
  );
}
