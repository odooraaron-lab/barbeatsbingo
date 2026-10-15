import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageIntro } from "@/components/site/page-intro";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { IMAGES } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ & tips",
  description:
    "Answers to common questions about running Bar Beats Bingo, plus tips for a great night at your venue or fundraiser.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How easy is this to run?",
    a: (
      <p>
        Too easy! Just <strong>print the scorecards, hand them out with a marker</strong> and{" "}
        <strong>press play on your laptop or Orange Door system</strong>. Everything else is built into the game.
      </p>
    ),
  },
  {
    q: "Do I need to know a lot about music to host a show?",
    a: (
      <p>
        Not at all. It&apos;s just like bingo but with great tunes instead of boring numbers. Weekly host sheets tell
        your host which songs are playing and when.
      </p>
    ),
  },
  {
    q: "What setup is required to run the event?",
    a: (
      <p>
        Very little. You need a laptop or Orange Door system connected to speakers (and TVs if you&apos;re running the
        video show), some pens or markers, prizes for your winners, and a big smile.
      </p>
    ),
  },
  {
    q: "Can I run Bar Beats Bingo as a fundraiser?",
    a: (
      <p>
        Absolutely. It&apos;s easy to run, fun for guests and great for getting people involved. Contact us to ask about
        any fundraiser discounts or offers we have available.
      </p>
    ),
  },
  {
    q: "How long does the game run?",
    a: (
      <p>
        Each round is about <strong>15 minutes</strong>. There are <strong>5 rounds per game</strong>, so about{" "}
        <strong>1.5 hours of entertainment</strong>.
      </p>
    ),
  },
  {
    q: "Can we charge customers to play?",
    a: (
      <p>
        Yes, that&apos;s completely up to you. If you plan to charge for cards, check the gambling laws in your area
        first.
      </p>
    ),
  },
  {
    q: "Can I give out prizes for winning?",
    a: (
      <p>
        Definitely, prizes are part of the fun. Keep it simple with lollies, vouchers or bar tabs, or go big with
        something like a lawnmower.
      </p>
    ),
  },
  {
    q: "How is my game pack delivered?",
    a: (
      <>
        <p>
          Scorecards and player answer sheets are available <strong>at the start of each week</strong>. Log in to your
          customer portal to download them along with the game files.
        </p>
        <p>Orange Door customers can also load games straight onto their system with the game downloader.</p>
      </>
    ),
  },
  {
    q: "Can I control the game from my smartphone?",
    a: (
      <p>
        Yes, if you have an Orange Door system you can control the game from your smartphone or web browser. Without one,
        you can play the game from your own laptop.
      </p>
    ),
  },
  {
    q: "How should we advertise our event?",
    a: (
      <p>
        Give yourself at least four weeks to promote your event and build interest. We have high-resolution images for
        your social media pages in the customer portal.
      </p>
    ),
  },
];

const TIPS = [
  "Encourage your host to offer clues if teams are stuck. It's all about having fun.",
  "Be interactive: walk around, chat with teams and get everyone involved.",
  "Don't forget the sing-alongs. They're half the fun!",
  "Pre-load your videos in a playlist so they play seamlessly, or start each round manually when your audience is ready.",
];

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Questions and answers">
        <p>Curious about how Bar Beats Bingo works? Here are the questions we get asked most.</p>
      </PageIntro>

      <div className="wrap mt-10 grid items-start gap-12 lg:grid-cols-[1.25fr_1fr]">
        <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-coal">
          {FAQS.map((item, i) => (
            <details key={item.q} name="faq" open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-lg font-semibold hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  aria-hidden
                  size={22}
                  className="shrink-0 text-red-bright transition-transform group-open:rotate-45"
                />
              </summary>
              <div className="copy space-y-3 px-6 pb-6 text-[1.02rem]">{item.a}</div>
            </details>
          ))}
        </div>
        <Photo
          src={IMAGES.faq}
          alt=""
          width={520}
          height={520}
          className="mx-auto hidden w-full max-w-md lg:sticky lg:top-8 lg:block"
        />
      </div>

      <section className="wrap mt-24">
        <div className="panel mx-auto max-w-3xl p-8 sm:p-10">
          <h2 className="text-[clamp(1.9rem,4vw,2.6rem)]">Tips for a great night</h2>
          <ul className="mt-6 space-y-4">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-4 text-lg text-white/90">
                <span aria-hidden className="mt-2.5 h-3 w-3 shrink-0 rounded-full bg-red" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
