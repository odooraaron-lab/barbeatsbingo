import Link from "next/link";
import { Logo } from "@/components/logo";
import { CurrentYear } from "@/components/current-year";
import { HOST_GUIDES, NAV, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-black/80">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo className="w-[170px]" />
          <p className="mt-4 max-w-xs text-mist">
            Music video bingo for pubs, clubs, workplaces and fundraisers. Brought to you by Orange Door.
          </p>
        </div>

        <FooterList title="Explore" items={NAV} />
        <FooterList title="Host guides" items={HOST_GUIDES} />
        <FooterList
          title="Customers"
          items={[
            { label: "Customer login", href: "/login" },
            { label: "Contact us", href: "/contact-us" },
            ...SITE.social.map((s) => ({ ...s, external: true })),
          ]}
        />
      </div>
      <div className="border-t border-line">
        <p className="wrap py-5 text-sm text-fog">
          © <CurrentYear /> {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function FooterList({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 className="font-sans text-sm font-bold text-fog">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="text-white/90 underline-offset-4 hover:text-white hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
