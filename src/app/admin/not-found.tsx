import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="panel max-w-2xl p-8">
      <h1 className="text-3xl">Not found</h1>
      <p className="mt-3 text-mist">That customer, category or show doesn&apos;t exist any more.</p>
      <Link href="/admin" className="btn btn-red mt-6">
        Back to the overview
      </Link>
    </div>
  );
}
