import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessGrants, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Customers" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const like = `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      venue: users.venue,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      accessAll: users.accessAll,
      accessExpiresAt: users.accessExpiresAt,
      lastLoginAt: users.lastLoginAt,
      expired: sql<boolean>`coalesce(${users.accessExpiresAt} < now(), false)`,
      genres: sql<number>`count(${accessGrants.categoryId})::int`,
      playlists: sql<number>`count(${accessGrants.playlistId})::int`,
    })
    .from(users)
    .leftJoin(accessGrants, eq(accessGrants.userId, users.id))
    .where(term ? or(ilike(users.name, like), ilike(users.venue, like), ilike(users.email, like)) : undefined)
    .groupBy(users.id)
    .orderBy(desc(sql`${users.role} = 'admin'`), asc(users.venue), asc(users.name), asc(users.email));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Customers</h1>
        <Link href="/admin/users/new" className="btn btn-red">
          Add a customer
        </Link>
      </div>

      <form className="mt-6 flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search customers
        </label>
        <input id="q" name="q" type="search" defaultValue={term} placeholder="Search by name, venue or email" className="field" />
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="panel mt-8 p-8">
          <p className="text-mist">{term ? `No customers match “${term}”.` : "No customers yet."}</p>
        </div>
      ) : (
        <div className="panel mt-8 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Access</th>
                <th>Access ends</th>
                <th>Last login</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const expired = u.expired && u.role !== "admin";
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline">
                        {u.venue || u.name || u.email}
                      </Link>
                      <span className="block text-sm text-mist">
                        {u.venue && u.name ? `${u.name} · ` : ""}
                        {u.email}
                      </span>
                    </td>
                    <td className="text-mist">
                      {u.role === "admin"
                        ? "Admin"
                        : u.accessAll
                          ? "Everything"
                          : u.genres + u.playlists === 0
                            ? "Nothing yet"
                            : [u.genres && `${u.genres} ${u.genres > 1 ? "categories" : "category"}`, u.playlists && `${u.playlists} show${u.playlists > 1 ? "s" : ""}`]
                                .filter(Boolean)
                                .join(", ")}
                    </td>
                    <td className={expired ? "text-red-bright" : "text-mist"}>
                      {u.accessExpiresAt ? formatDate(u.accessExpiresAt) : "Ongoing"}
                    </td>
                    <td className="text-mist">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                    <td>
                      {!u.isActive ? (
                        <span className="tag">Switched off</span>
                      ) : expired ? (
                        <span className="tag bg-red/20 text-red-bright">Expired</span>
                      ) : (
                        <span className="tag bg-ok/15 text-ok">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
