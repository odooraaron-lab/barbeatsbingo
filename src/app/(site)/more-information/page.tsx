import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { QuickFireGlance, WhatYouNeed, WinningPatterns } from "@/components/site/quick-fire";
import { IMAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Bar Beats Bingo quick fire games work: four short games per pack, 25-second song clips, one way to win per game and an optional Blackout.",
};

const STEPS = [
  {
    title: "Hand out scorecards",
    body: (
      <p>
        Print the scorecards. Each A4 sheet holds two A5 cards, so cut them down the middle. Every card is different,
        so luck plays a part. Hand out one per player or pair, with a pen or marker.
      </p>
    ),
    image: IMAGES.step1,
    alt: "A bingo scorecard coming out of a printer",
  },
  {
    title: "Name the way to win, then press play",
    body: (
      <p>
        Choose your game, <strong>audio</strong> or <strong>video</strong>, and tell the room the winning pattern, like{" "}
        <strong>1 line</strong> or <strong>the Cross</strong>, and whether you&apos;re playing on to Blackout. Then press
        play and sing along. It&apos;s half the fun.
      </p>
    ),
    image: IMAGES.step2,
    alt: "A laptop showing the Bar Beats Bingo logo",
  },
  {
    title: "Cross off the songs",
    body: (
      <p>
        Each song plays for 25 seconds. When players hear a song that&apos;s on their card, they cross it off. Games move
        fast: a quick fire game runs 15 to 25 minutes.
      </p>
    ),
    image: IMAGES.step3,
    alt: "Players marking songs off their scorecards",
  },
  {
    title: "Someone yells BINGO!",
    body: (
      <p>
        Pause the game and check their card against your track listing. Read their songs out on the microphone so the
        whole room is in on it. If the card checks out, hand over the prize.
      </p>
    ),
    image: IMAGES.step4,
    alt: "A marked bingo card being checked",
  },
  {
    title: "End it there, or play on",
    body: (
      <>
        <p>
          Finish at the first prize, or press play again and carry on to <strong>Blackout</strong> for a second prize.
          You choose the prizes. Keep it simple or go big: the reveal matters more than the value.
        </p>
        <p>
          Need inspiration? See our <Link href="/faq-tips#prizes">prize ideas</Link>.
        </p>
      </>
    ),
    image: IMAGES.step5,
    alt: "Prizes ready for the winners",
  },
  {
    title: "Take a break, then the next game",
    body: (
      <p>
        Every game pack has four quick fire games. Between games, give people time to order food and drinks, and run a{" "}
        <Link href="/faq-tips#crowd-game">crowd game</Link> for a bonus prize. Start the next game when everyone&apos;s
        set.
      </p>
    ),
    image: IMAGES.step6,
    alt: "A crowd enjoying a bingo night",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro title="How does Bar Beats Bingo work?">
        <p>
          It&apos;s just like regular bingo, but with <strong>great tunes</strong> instead of numbers. Quick fire games are
          short, fast and easy to fit into any night.
        </p>
      </PageIntro>

      <div className="wrap mt-10">
        <QuickFireGlance />
      </div>

      <section id="patterns" className="wrap mt-16 scroll-mt-6" aria-labelledby="patterns-heading">
        <h2 id="patterns-heading" className="text-[clamp(1.9rem,3.6vw,2.7rem)]">
          Winning patterns
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-white/90">
          Each quick fire game has one fast way of winning, then the option to play on to Blackout.
        </p>
        <WinningPatterns className="mt-8" />
      </section>

      <ol className="wrap mt-20 space-y-20 md:space-y-28" aria-label="How a game runs">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            <Photo
              src={step.image}
              alt={step.alt}
              width={600}
              height={490}
              className={`w-full rounded-[var(--radius-card)] ${i % 2 ? "md:order-2" : ""}`}
            />
            <div>
              <span className="display grid h-14 w-11 place-items-center rounded-full bg-sun text-2xl text-[#1b1b1b]">
                {i + 1}
              </span>
              <h2 className="mt-5 text-[clamp(1.9rem,3.6vw,2.7rem)]">{step.title}</h2>
              <div className="copy mt-4 space-y-3 text-lg">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <section className="wrap mt-24" aria-labelledby="need-heading">
        <div className="panel p-6 sm:p-10">
          <h2 id="need-heading" className="text-[clamp(1.9rem,3.6vw,2.7rem)]">
            What you need
          </h2>
          <div className="mt-6">
            <WhatYouNeed />
          </div>
          <p className="mt-6 text-mist">
            Running it on the night? See the step-by-step host guides for{" "}
            <Link href="/host-instructions-orange-door-customers" className="text-white underline underline-offset-4">
              Orange Door
            </Link>
            ,{" "}
            <Link href="/host-instructions-video-game" className="text-white underline underline-offset-4">
              the video game
            </Link>{" "}
            and{" "}
            <Link href="/host-instructions-audio-game" className="text-white underline underline-offset-4">
              the audio game
            </Link>
            .
          </p>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
