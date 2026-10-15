import Link from "next/link";
import { HOST_GUIDES, SITE } from "@/lib/site";

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

        <div className="alert alert-info mt-10 text-base">{closing}</div>
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
