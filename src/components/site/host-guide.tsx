import Link from "next/link";
import { HOST_GUIDES, SITE } from "@/lib/site";
import { NightAtAGlance, WhatYouNeed } from "./quick-fire";

export type GuideStep = { title: string; body: React.ReactNode };

export function HostGuide({
  title,
  intro,
  steps,
  closing,
  current,
}: {
  title: string;
  intro: React.ReactNode;
  steps: GuideStep[];
  closing: React.ReactNode;
  current: string;
}) {
  return (
    <div className="wrap grid gap-12 pt-14 md:pt-20 lg:grid-cols-[1fr_280px]">
      <article>
        <h1 className="text-[clamp(2.4rem,5.5vw,3.8rem)]">{title}</h1>
        <div className="copy mt-4 text-lg">{intro}</div>

        <ol className="mt-12 space-y-5">
          {steps.map((step, i) => (
            <li key={step.title} className="panel flex gap-5 p-6 sm:p-7">
              <span className="display grid h-12 w-10 shrink-0 place-items-center rounded-full bg-sun text-xl text-[#1b1b1b]">
                {i + 1}
              </span>
              <div>
                <h2 className="text-[1.6rem] leading-tight">{step.title}</h2>
                <div className="copy mt-3 text-[1.05rem]">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <section aria-labelledby="need-heading" className="panel mt-10 p-6 sm:p-7">
          <h2 id="need-heading" className="text-[1.6rem] leading-tight">
            What you need
          </h2>
          <div className="mt-4">
            <WhatYouNeed />
          </div>
        </section>

        <section aria-labelledby="glance-heading" className="panel mt-5 p-6 sm:p-7">
          <h2 id="glance-heading" className="text-[1.6rem] leading-tight">
            The night in one glance
          </h2>
          <div className="mt-5">
            <NightAtAGlance />
          </div>
        </section>

        <p className="mt-5 rounded-2xl border border-sun/30 bg-sun/[0.07] px-6 py-5 text-white/90">
          <strong className="text-white">Customers:</strong> the full Quick Fire host guide, with prize ideas and 35 crowd
          game prompts, is in your{" "}
          <Link href="/portal" className="font-semibold text-sun underline underline-offset-4">
            customer portal
          </Link>
          , ready to print.
        </p>

        <div className="alert alert-info mt-5 text-base">{closing}</div>
      </article>

      <aside className="lg:pt-24">
        <nav aria-label="Host guides" className="panel p-5 lg:sticky lg:top-8">
          <h2 className="font-sans text-sm font-bold text-fog">Host guides</h2>
          <ul className="mt-3 space-y-1">
            {HOST_GUIDES.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  aria-current={g.href === current ? "page" : undefined}
                  {...(g.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="block rounded-lg px-3 py-2 hover:bg-white/5 aria-[current=page]:bg-red aria-[current=page]:font-semibold"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
          <a href={SITE.youtubeTraining} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm mt-5 w-full">
            Watch the training video
          </a>
        </nav>
      </aside>
    </div>
  );
}
