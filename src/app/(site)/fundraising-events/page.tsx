import type { Metadata } from "next";
import Link from "next/link";
import { CallToAction } from "@/components/site/call-to-action";
import { IMAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fundraising & events",
  description:
    "Host an unforgettable fundraiser or special event with Bar Beats Bingo quick fire games, an energetic music game that brings people together and raises money.",
};

export default function FundraisingPage() {
  return (
    <>
      <section className="wrap pt-10">
        <div className="relative overflow-hidden rounded-[28px] bg-coal-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.fundraising}
            alt="A host with a microphone leading a crowd at a fundraising bingo night"
            width={1200}
            height={500}
            className="h-[340px] w-full object-cover sm:h-[420px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          <h1 className="absolute inset-x-0 bottom-0 p-7 text-[clamp(2.2rem,5.5vw,4rem)] sm:p-12">
            Fundraising &amp; events: make it a night to remember
          </h1>
        </div>
      </section>

      <section className="wrap mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="copy text-lg">
          <p>
            Organising a fundraiser, corporate function, birthday bash or special celebration, and want an activity
            that&apos;s original and crowd-pleasing? Look no further than <strong>Bar Beats Bingo</strong>.
          </p>
          <p>
            It fills your event with high-energy vibes, non-stop entertainment and the kind of sing-alongs that get
            everyone, from your youngest guests to your most seasoned attendees, smiling, dancing and belting out their
            favourite tunes.
          </p>
          <p>
            We can supply a one-off game pack for your event: four quick fire games of 15 to 25 minutes each, every one
            with its own prize, so there are plenty of chances to win. It&apos;s easy to run, loads of fun and guaranteed
            to have your guests laughing, singing and maybe even dancing in their seats.
          </p>
          <p>
            For charity events, members of the community often donate prizes to the cause. From a bottle of wine to a
            designer scarf or a local experience, it&apos;s always a buzz seeing what people give. Half the fun is in the
            surprise.
          </p>
          <p>
            Between games, run a <Link href="/faq-tips#crowd-game">crowd game</Link> for a bonus prize, and try a{" "}
            <Link href="/faq-tips#prizes">mystery prize board</Link> to make every win a moment.
          </p>
        </div>

        <aside className="self-start rounded-[var(--radius-card)] bg-sun p-8 text-[#1b1b1b]">
          <h2 className="text-3xl">Perfect for charity nights</h2>
          <ul className="mt-5 space-y-3 text-lg font-semibold">
            <li>
              Sell tickets for <strong>$1 to $5 per player</strong>
            </li>
            <li>Offer small prizes for winners</li>
            <li>Donate the proceeds to a charity of your choice</li>
          </ul>
          <p className="mt-5">It&apos;s fun, easy to run and creates a great community atmosphere.</p>
          <p className="mt-3 text-sm">Charging to play? Check the gambling laws in your area first.</p>
          <p className="mt-5 font-bold">No experience needed: just press play and let the fun begin.</p>
          <Link href="/contact-us" className="btn mt-7 bg-[#1b1b1b] text-white hover:bg-black">
            Plan your event with us
          </Link>
        </aside>
      </section>

      <CallToAction />
    </>
  );
}
