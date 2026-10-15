"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { HOST_GUIDES, NAV } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [shownFor, setShownFor] = useState(pathname);
  const guidesRef = useRef<HTMLDivElement>(null);

  // Close menus after navigating.
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
    setGuidesOpen(false);
  }

  useEffect(() => {
    if (!guidesOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!guidesRef.current?.contains(e.target as Node)) setGuidesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGuidesOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [guidesOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const guidesActive = HOST_GUIDES.some((g) => !g.external && pathname.startsWith(g.href));

  return (
    <header className="relative z-30 bg-black/95">
      <div className="wrap flex items-center gap-6 py-3">
        <Logo className="w-[150px] md:w-[178px]" />

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="rounded-md px-3 py-2 text-[0.95rem] font-medium text-white/90 hover:text-white aria-[current=page]:text-red-bright"
            >
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={guidesRef}>
            <button
              type="button"
              aria-expanded={guidesOpen}
              aria-controls="host-guides-menu"
              onClick={() => setGuidesOpen((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-3 py-2 text-[0.95rem] font-medium hover:text-white ${guidesActive ? "text-red-bright" : "text-white/90"}`}
            >
              Host guides <ChevronDown size={16} aria-hidden className={guidesOpen ? "rotate-180" : ""} />
            </button>
            {guidesOpen && (
              <ul
                id="host-guides-menu"
                className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl border border-line bg-coal py-1.5 shadow-2xl shadow-black/60"
              >
                {HOST_GUIDES.map((g) => (
                  <li key={g.href}>
                    <Link
                      href={g.href}
                      {...(g.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="block px-4 py-2.5 text-[0.95rem] hover:bg-white/5"
                    >
                      {g.label}
                      {g.external && <span className="sr-only"> (opens YouTube)</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex lg:ml-4">
          <Link href="/login" className="btn btn-ghost btn-sm">
            Customer login
          </Link>
          <Link href="/contact-us" className="btn btn-red btn-sm">
            Contact us
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-white sm:ml-0 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-ink lg:hidden">
          <ul className="wrap flex flex-col py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="block py-3 text-lg font-semibold aria-[current=page]:text-red-bright"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line pt-3 text-sm font-semibold text-fog">Host guides</li>
            {HOST_GUIDES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  {...(g.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="block py-2.5 pl-3 text-[1.05rem]"
                >
                  {g.label}
                </Link>
              </li>
            ))}
            <li className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
              <Link href="/login" className="btn btn-ghost">
                Customer login
              </Link>
              <Link href="/contact-us" className="btn btn-red">
                Contact us
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
