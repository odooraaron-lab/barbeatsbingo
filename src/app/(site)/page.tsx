import Link from "next/link";
import { HandHeart, Music2, Smile, Sparkles } from "lucide-react";
import { ShowScene } from "@/components/site/show-scene";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { IMAGES } from "@/lib/site";

const STATS = [
  { value: "55,000+", label: "music videos" },
  { value: "1,000+", label: "players every week" },
  { value: "100%", label: "customer satisfaction" },
];

const NIGHT = [
  {
    title: "Print the scorecards",
    body: "Every player gets a different card of songs and a marker.",
  },
  {
    title: "Press play",
    body: "The show plays music videos on your screens. Each round runs about 15 to 20 minutes.",
  },
  {
    title: "Mark off the songs",
    body: "Players cross off each song as it plays. Prizes go to 1 line, 2 or 3 lines, the cross and a full card.",
  },
  {
    title: "Check the card",
    body: "Someone shouts BINGO! Pause the show from your phone, check their card against the call list and hand over the prize.",
  },
];

const STYLES = [
  {
    name: "70s, 80s and 90s",
    blurb: "Disco, glam rock, synth-pop and grunge. Three decades everyone knows.",
    tone: "bg-sun text-[#1b1b1b]",
  },
  {
    name: "Pub Classics",
    blurb: "Sing-along anthems that get the whole room belting out the chorus.",
    tone: "bg-red text-white",
  },
  {
    name: "Modern",
    blurb: "Today's chart-toppers across pop, hip-hop and indie.",
    tone: "bg-tang text-[#1b1b1b]",
  },
  {
    name: "Mixtapes",
    blurb: "Genre-hopping shows that mix the decades into one game.",
    tone: "bg-coal-2 text-white ring-1 ring-inset ring-line",
  },
];

const WHY = [
  {
    icon: Smile,
    title: "Low pressure, loud laughs",
    body: "Nobody's put on the spot. It's a feel-good mix of music and games, and the vibe stays high.",
  },
  {
    icon: Music2,
    title: "Anyone can play",
    body: "Players sip their drinks, enjoy the music and mark their cards. Nobody needs to be a trivia expert.",
  },
  {
    icon: Sparkles,
    title: "Fun over rivalry",
    body: "No racing to be the fastest thinker in the room. The focus is on a good night together.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Our crowd had a blast with this format. People were singing, laughing, and stayed longer in my venue after the event. It turned a quiet night into one of our busiest. We'll definitely be hosting it again!",
    name: "Tony Wheeler",
    role: "Owner Operator, Jimmy Jacks",
    image: IMAGES.testimonialJimmyJacks,
  },
  {
    quote:
      "Bar Beats Bingo was a total hit with our crowd. Everyone was engaged from the first beat and the energy in the room was next-level. Hands down the most fun we've had on a weeknight.",
    name: "Jess Taylor",
    role: "Events Manager, The Groove Lounge Bar",
    image: IMAGES.testimonialGroove,
  },
];

export default function HomePage() {
  return (
    <>
      {/* The show, playing */}
      <section className="overflow-hidden">
        <div className="wrap grid gap-x-12 gap-y-6 pb-16 pt-7 [grid-template-areas:'intro'_'scene'_'act'] sm:pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-y-8 lg:pb-24 lg:pt-14 lg:[grid-template-areas:'intro_scene'_'act_scene']">
          <h1 className="text-[clamp(2.3rem,7.5vw,4.4rem)] leading-[0.98] [grid-area:intro] lg:self-end">
            Music video bingo for your venue
          </h1>

          <ShowScene className="-mx-5 [grid-area:scene] sm:mx-0" />

          <div className="[grid-area:act] lg:self-start">
            <p className="max-w-md text-[1.08rem] leading-relaxed text-white/90 sm:text-lg">
              Music videos play on your screens. Players mark off the songs they hear and shout BINGO when they get a
              line.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact-us" className="btn btn-red flex-1 sm:flex-none">
                Book a trial night
              </Link>
              <Link href="/more-information" className="btn btn-ghost flex-1 sm:flex-none">
                How it works
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span className="display block text-[clamp(1.35rem,5.4vw,2rem)]">{s.value}</span>
                    <span className="mt-1 block text-[0.82rem] leading-snug text-mist sm:text-sm">{s.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* A night, step by step */}
      <section className="wrap" aria-labelledby="night-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="night-heading" className="text-[clamp(2rem,6vw,3.2rem)]">
            How a night goes
          </h2>
          <Link href="/more-information" className="font-semibold text-red-bright underline underline-offset-4">
            Read the full guide
          </Link>
        </div>
        <ol className="night-steps mt-8 grid gap-7 lg:grid-cols-4 lg:gap-6">
          {NIGHT.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 lg:block">
              <span className="night-step-number display" aria-hidden>
                {i + 1}
              </span>
              <div className="lg:mt-5">
                <h3 className="font-sans text-xl font-bold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-white/85">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Music styles */}
      <section className="wrap mt-20 sm:mt-24" aria-labelledby="styles-heading">
        <h2 id="styles-heading" className="text-[clamp(2rem,6vw,3.2rem)]">
          Pick the music
        </h2>
        <p className="mt-3 max-w-xl text-white/90">
          From disco nights and 80s anthems to today&apos;s hits, every round stays fresh. New shows are added all the
          time.
        </p>
        <ul className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {STYLES.map((s) => (
            <li key={s.name} className={`rounded-2xl p-4 sm:p-6 ${s.tone}`}>
              <h3 className="text-[clamp(1.15rem,4.6vw,1.65rem)] leading-tight">{s.name}</h3>
              <p className="mt-2 text-[0.9rem] leading-snug opacity-90 sm:text-[0.98rem]">{s.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Phone control */}
      <section className="wrap mt-20 grid items-center gap-8 sm:mt-24 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="text-[clamp(2rem,6vw,3.2rem)]">Run the show from your phone</h2>
          <p className="mt-4 max-w-lg text-lg text-white/90">
            When someone shouts BINGO!, pause the game from the remote app or your laptop and check their card. Then
            press play for the next winner. Too easy.
          </p>
        </div>
        <Photo
          src={IMAGES.phoneControl}
          alt="The Orange Door remote app on a phone and laptop"
          width={1024}
          height={836}
          className="mx-auto w-full max-w-[330px] sm:max-w-[420px] lg:max-w-none"
        />
      </section>

      {/* Bingo or trivia */}
      <section className="wrap mt-20 sm:mt-24" aria-labelledby="trivia-heading">
        <h2 id="trivia-heading" className="text-[clamp(2rem,6vw,3.2rem)]">
          Easier than a trivia night
        </h2>
        <p className="mt-3 max-w-xl text-white/90">
          Trivia can feel like an exam. Bar Beats Bingo is relaxed and music-led, so the whole room stays in the game.
        </p>
        <ul className="mt-7 grid gap-5 md:grid-cols-3">
          {WHY.map((w) => (
            <li key={w.title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-sun" aria-hidden>
                <w.icon size={21} />
              </span>
              <div>
                <h3 className="font-sans text-lg font-bold">{w.title}</h3>
                <p className="mt-1 text-white/85">{w.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonials */}
      <section className="wrap mt-20 sm:mt-24" aria-labelledby="testimonials-heading">
        <h2 id="testimonials-heading" className="text-[clamp(2rem,6vw,3.2rem)]">
          Venues love it
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="panel flex flex-col p-5 sm:p-7">
              <blockquote className="flex-1 leading-relaxed text-white/90 sm:text-lg">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-4">
                <Photo src={t.image} alt="" width={100} height={64} className="h-14 w-[88px] rounded-lg object-cover" />
                <span>
                  <span className="block font-bold">{t.name}</span>
                  <span className="block text-sm text-mist">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Fundraisers */}
      <section className="wrap mt-20 sm:mt-24">
        <div className="flex flex-col gap-5 rounded-2xl border border-sun/30 bg-sun/[0.07] p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sun text-[#1b1b1b]" aria-hidden>
            <HandHeart size={24} />
          </span>
          <div className="flex-1">
            <h2 className="font-sans text-xl font-bold sm:text-2xl">Running a fundraiser?</h2>
            <p className="mt-1.5 max-w-2xl text-white/90">
              Sell tickets for $1 to $5 a player, add a few donated prizes and give the takings to your cause. It&apos;s
              easy to run, and everyone gets a great night out.
            </p>
          </div>
          <Link href="/fundraising-events" className="btn btn-sun self-start sm:self-center">
            Fundraising and events
          </Link>
        </div>
      </section>

      <CallToAction />
    </>
  );
}
