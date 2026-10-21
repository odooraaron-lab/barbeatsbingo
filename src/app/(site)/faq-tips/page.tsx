import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageIntro } from "@/components/site/page-intro";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { CrowdPrompts } from "@/components/site/quick-fire";
import { IMAGES } from "@/lib/site";
import { CROWD_GAME_STEPS, PRIZE_IDEAS, PRIZES, SITUATIONS, TIPS_BEFORE, TIPS_DURING, WELCOME } from "@/lib/quick-fire";

export const metadata: Metadata = {
  title: "FAQ & tips",
  description:
    "Answers to common questions about running Bar Beats Bingo quick fire games, plus host tips, prize ideas and the crowd game for between games.",
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
        Not at all. It&apos;s just like bingo but with great tunes instead of numbers. Your call list tells you which
        songs are playing and when.
      </p>
    ),
  },
  {
    q: "How many games do I get?",
    a: <p>Four quick fire games in every game pack. Run one, or run all four in a night.</p>,
  },
  {
    q: "How long does a quick fire game run?",
    a: (
      <p>
        Between <strong>7 and 27 minutes</strong>, depending on the pattern and how many cards are in play. Each song
        clip is 25 seconds long, so games move fast. See the{" "}
        <Link href="/more-information#patterns">typical time for each pattern</Link>.
      </p>
    ),
  },
  {
    q: "How does a game get won?",
    a: (
      <p>
        Each game has one fast way of winning, such as <strong>1 line</strong>, <strong>2 lines</strong>,{" "}
        <strong>3 lines</strong> or <strong>the X</strong>. Tell the room before you press play. The first to get it
        wins that game&apos;s prize, then you can end the game there or play on to <strong>Blackout</strong> for a
        second prize. Other patterns, like four corners, work too, with a manual check. See the{" "}
        <Link href="/more-information#patterns">winning patterns</Link>.
      </p>
    ),
  },
  {
    q: "How do I check a winner?",
    a: (
      <p>
        Pause, note the number of the song that just played, then find the player&apos;s card number on the answer key.
        If the number in the column for your pattern is the same as or lower than the song you&apos;re up to, it&apos;s
        a winner. Here&apos;s a <Link href="/more-information#checking">worked example</Link>.
      </p>
    ),
  },
  {
    q: "How long should the breaks be?",
    a: (
      <p>
        Long enough for people to order food and drinks and play a <a href="#crowd-game">crowd game</a>.
      </p>
    ),
  },
  {
    q: "What setup is required to run the event?",
    a: (
      <p>
        Very little. You need a laptop or Orange Door system connected to speakers (and TVs if you&apos;re running the
        video version), printed scorecards, the call list and answer key, some pens or markers, prizes for your winners,
        a microphone and a big smile.
      </p>
    ),
  },
  {
    q: "How is my game pack delivered?",
    a: (
      <>
        <p>
          Each game pack has four quick fire games as video or audio files, plus the scorecards, the call list and the
          answer key. Log in to your customer portal to download them, along with the full host guide.
        </p>
        <p>Orange Door customers can also load games straight onto their system with the game downloader.</p>
      </>
    ),
  },
  {
    q: "Can I control the game from my phone?",
    a: (
      <p>
        Yes, if you have an Orange Door system. Pause, check the card and resume from the Remote app or a web browser.
        Without one, run the game from your own laptop.
      </p>
    ),
  },
  {
    q: "Can players use Shazam?",
    a: <p>The host decides. Say your rule in the welcome so everyone knows.</p>,
  },
  {
    q: "Can I give out prizes for winning?",
    a: (
      <p>
        Definitely, prizes are part of the fun. Keep it simple with lollies, vouchers or bar tabs, or go big with
        something like a lawnmower. See our <a href="#prizes">prize ideas</a>.
      </p>
    ),
  },
  {
    q: "Can we charge customers to play?",
    a: <p>Yes, that&apos;s up to you. If you plan to charge for cards, check the gambling laws in your area first.</p>,
  },
  {
    q: "Can I run it as a fundraiser?",
    a: (
      <p>
        Absolutely. It&apos;s easy to run, fun for guests and great for getting people involved. Ask us about fundraiser
        offers and one-off game packs for events. More on our <Link href="/fundraising-events">fundraising page</Link>.
      </p>
    ),
  },
  {
    q: "How should we advertise our event?",
    a: (
      <p>
        Start promoting at least four weeks out. We have high resolution images ready for your social media pages: just{" "}
        <Link href="/contact-us">ask us</Link>. Posting a photo of the winners after each game night is a nice touch,
        but completely optional.
      </p>
    ),
  },
];

const JUMPS = [
  { href: "#questions", label: "Questions" },
  { href: "#hosting", label: "Hosting tips" },
  { href: "#prizes", label: "Prize ideas" },
  { href: "#crowd-game", label: "The crowd game" },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-white/90">
          <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red" />
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function FaqPage() {
  return (
    <>
      <PageIntro title="FAQ and tips">
        <p>The questions we get asked most, plus everything you need to host a great quick fire night.</p>
      </PageIntro>

      <nav aria-label="On this page" className="wrap mt-2 flex flex-wrap justify-center gap-2">
        {JUMPS.map((j) => (
          <a
            key={j.href}
            href={j.href}
            className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-mist transition-colors hover:border-white/30 hover:text-white"
          >
            {j.label}
          </a>
        ))}
      </nav>

      {/* Questions */}
      <section
        id="questions"
        aria-label="Questions"
        className="wrap mt-10 grid scroll-mt-6 items-start gap-12 lg:grid-cols-[1.25fr_1fr]"
      >
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
          className="mx-auto hidden w-full max-w-md rounded-full lg:sticky lg:top-8 lg:block"
        />
      </section>

      {/* Hosting */}
      <section id="hosting" aria-labelledby="hosting-heading" className="wrap mt-24 scroll-mt-6">
        <h2 id="hosting-heading" className="text-[clamp(2rem,5vw,3rem)]">
          Tips for a great night
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-white/90">
          The game runs itself. Your job is the atmosphere. Relaxed, friendly and a bit cheeky beats polished every
          time.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="panel p-6 sm:p-8">
            <h3 className="font-sans text-xl font-bold">Before the doors open</h3>
            <div className="mt-4">
              <Bullets items={TIPS_BEFORE} />
            </div>
          </div>
          <div className="panel p-6 sm:p-8">
            <h3 className="font-sans text-xl font-bold">While you play</h3>
            <div className="mt-4">
              <Bullets items={TIPS_DURING} />
            </div>
          </div>
        </div>

        <figure className="mt-4 rounded-2xl border border-sun/30 bg-sun/[0.07] p-6 sm:p-8">
          <figcaption className="font-sans text-sm font-bold text-sun">A welcome you can borrow</figcaption>
          <blockquote className="mt-3 text-lg leading-relaxed text-white/90 sm:text-xl">
            &ldquo;{WELCOME}&rdquo;
          </blockquote>
        </figure>

        <div className="panel mt-4 p-6 sm:p-8">
          <h3 className="font-sans text-xl font-bold">When things get interesting</h3>
          <dl className="mt-4 divide-y divide-line">
            {SITUATIONS.map((s) => (
              <div key={s.what} className="grid gap-1 py-3.5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-semibold">{s.what}</dt>
                <dd className="text-white/85">{s.todo}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 rounded-2xl border border-line px-6 py-5 text-white/90">
          <strong className="text-white">Keep the music going.</strong> Before the first game, between games and after
          the show, keep music playing. A silent room loses its energy fast, and the night should feel like a party from
          the moment people walk in.
        </p>
      </section>

      {/* Prizes */}
      <section id="prizes" aria-labelledby="prizes-heading" className="wrap mt-24 scroll-mt-6">
        <h2 id="prizes-heading" className="text-[clamp(2rem,5vw,3rem)]">
          Prizes that get a reaction
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-white/90">
          Quick fire prizes are given out per game. Keep it simple or go big. The reveal matters more than the value.
        </p>
        <div className="panel mt-8 overflow-x-auto p-2 sm:p-4" tabIndex={0} role="region" aria-label="Prizes">
          <table className="table">
            <thead>
              <tr>
                <th>Prize</th>
                <th>When</th>
                <th>Ideas</th>
              </tr>
            </thead>
            <tbody>
              {PRIZES.map((p) => (
                <tr key={p.prize}>
                  <td className="font-semibold whitespace-nowrap">{p.prize}</td>
                  <td className="text-mist">{p.when}</td>
                  <td>{p.ideas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-sun/30 bg-sun/[0.07] p-6 sm:p-8">
            <h3 className="font-sans text-xl font-bold">How many prizes for a four game night?</h3>
            <p className="mt-2 text-white/90">
              At least four, one per game. Add one more for every game you play on to Blackout, and a bonus prize for
              each crowd game you run.
            </p>
          </div>
          <div className="panel p-6 sm:p-8">
            <h3 className="font-sans text-xl font-bold">The mystery prize board</h3>
            <p className="mt-2 text-white/90">
              Put removable cards on a board, showing celebrity faces, bands, musical notes or another theme your venue
              likes, with a prize written on the back of each. The winner picks a card and you reveal the prize. Mix a
              few small, funny prizes in with the bigger ones so every reveal gets a reaction.
            </p>
          </div>
        </div>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRIZE_IDEAS.map((p) => (
            <li key={p.title} className="panel p-6">
              <h3 className="font-sans text-lg font-bold text-sun">{p.title}</h3>
              <p className="mt-1.5 text-white/90">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Crowd game */}
      <section id="crowd-game" aria-labelledby="crowd-heading" className="wrap mt-24 scroll-mt-6">
        <h2 id="crowd-heading" className="text-[clamp(2rem,5vw,3rem)]">
          The crowd game
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-white/90">
          One simple crowd game fills the break between quick fire games, keeps people in their seats and gives you a
          bonus winner.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CROWD_GAME_STEPS.map((step, i) => (
            <li key={step.title} className="panel p-5">
              <span
                className="display grid h-10 w-8 place-items-center rounded-full bg-sun text-lg text-[#1b1b1b]"
                aria-hidden
              >
                {i + 1}
              </span>
              <h3 className="mt-3 font-sans text-lg font-bold">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-1 text-white/85">{step.body}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-12 font-sans text-xl font-bold">A few prompts to try</h3>
        <p className="mt-1 text-mist">
          Read the prompt, then the examples. The examples are what make the answers funny.
        </p>
        <div className="mt-5">
          <CrowdPrompts />
        </div>
        <p className="mt-5 text-white/90">
          Customers get the full set of 35 prompts in the host guide in the{" "}
          <Link href="/portal" className="font-semibold text-sun underline underline-offset-4">
            customer portal
          </Link>
          : a family-friendly set for any crowd, and an after-dark set for adults-only nights.
        </p>
      </section>

      <CallToAction />
    </>
  );
}
