import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { IMAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Discover how Bar Beats Bingo works, what makes it a crowd favourite, and how to bring music video bingo to your venue.",
};

const PRIZE_TIERS = ["1 line", "2 or 3 lines", "The cross (forming an X)", "Blackout (all 5 lines)"];

const STEPS = [
  {
    title: "Print and hand out scorecards",
    body: <p>Grab your scorecards and markers, and hand them out to your customers.</p>,
    image: IMAGES.step1,
    alt: "A bingo scorecard coming out of a printer",
  },
  {
    title: "Press play",
    body: (
      <p>
        Choose your game format, <strong>audio</strong> or <strong>video</strong>. Click play on your computer and let
        the music roll.
      </p>
    ),
    image: IMAGES.step2,
    alt: "A laptop showing the Bar Beats Bingo logo",
  },
  {
    title: "Check off songs",
    body: (
      <>
        <p>
          Each scorecard has a list of songs. When players hear one play, they cross it off with their marker. Winning
          patterns:
        </p>
        <ul>
          {PRIZE_TIERS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </>
    ),
    image: IMAGES.step3,
    alt: "Players marking songs off their scorecards",
  },
  {
    title: "Check the card when they yell BINGO!",
    body: (
      <p>
        Pause the game, check their card against the song sheet provided and hand out a prize. You choose the prizes.
      </p>
    ),
    image: IMAGES.step4,
    alt: "A marked bingo card being checked",
  },
  {
    title: "Decide the prizes",
    body: (
      <>
        <p>Get creative with your prizes. Common prize tiers are:</p>
        <ul>
          {PRIZE_TIERS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          For prize-giving ideas, see our <Link href="/faq-tips">FAQ and tips</Link>.
        </p>
      </>
    ),
    image: IMAGES.step5,
    alt: "Prizes ready for the winners",
  },
  {
    title: "Want to keep playing?",
    body: <p>Pick one of our themed shows or another mixed game and keep the party going.</p>,
    image: IMAGES.step6,
    alt: "A crowd enjoying a bingo night",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro title="How does Bar Beats Bingo work?">
        <p>
          It&apos;s <strong>simple</strong>: just like regular bingo, but with awesome tunes.
        </p>
      </PageIntro>

      <ol className="wrap mt-12 space-y-20 md:space-y-28">
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
              <div className="copy mt-4 text-lg">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <CallToAction />
    </>
  );
}
