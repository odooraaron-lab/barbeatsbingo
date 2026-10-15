import Link from "next/link";
import { BingoCard } from "@/components/site/bingo-card";
import { Photo } from "@/components/site/photo";
import { CallToAction } from "@/components/site/call-to-action";
import { IMAGES } from "@/lib/site";

const STYLES = [
  {
    name: "70s / 80s / 90s",
    blurb:
      "A nostalgic ride from disco grooves and glam rock anthems to synth-pop hits and grunge-era classics. Three decades of tunes everyone knows.",
    tone: "bg-sun text-[#1b1b1b]",
  },
  {
    name: "Pub Classics",
    blurb:
      "The crowd-pleasers that get the whole room singing, swaying and belting out the chorus in perfect, off-key harmony.",
    tone: "bg-red text-white",
  },
  {
    name: "Modern",
    blurb:
      "Today's chart-toppers from artists like Dua Lipa, The Weeknd, Harry Styles and Billie Eilish, across pop, hip-hop and indie.",
    tone: "bg-tang text-[#1b1b1b]",
  },
  {
    name: "Mixtapes",
    blurb:
      "Genre-hopping shows that mix 70s disco, 80s anthems, 90s throwbacks, pub classics and today's hits into one unpredictable game.",
    tone: "bg-coal-2 text-white",
  },
];

const WHY = [
  {
    title: "Fun, lighthearted enjoyment",
    body: "A feel-good mix of music and games. The pressure's low, the laughs are loud and the vibes stay high.",
  },
  {
    title: "Easy to host",
    body: "Players sip drinks, enjoy great music and mark their cards. Nobody needs to be a trivia expert.",
  },
  {
    title: "Less competitive",
    body: "No pressure to be the fastest thinker in the room. The focus is on shared fun, not fierce rivalry.",
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="wrap grid items-center gap-12 pb-20 pt-12 md:pt-20 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <h1 className="text-[clamp(3.4rem,10vw,6.6rem)] leading-[0.92]">
              Bar
              <br />
              Beats
              <br />
              <span className="text-red-bright">Bingo</span>
            </h1>
            <p className="mt-7 max-w-md text-xl leading-relaxed text-white/90">
              Classic bingo with banging tunes, sing-alongs and epic prizes. Whether you run a bar, club, workplace or
              event, we bring the beats.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact-us" className="btn btn-red">
                Book a trial night
              </Link>
              <Link href="/more-information" className="btn btn-ghost">
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[600px]">
            <div
              className="absolute right-[2%] top-1/2 aspect-square w-[78%] -translate-y-1/2 rounded-full bg-red"
              aria-hidden
            />
            <Photo
              src={IMAGES.heroComposite}
              alt="A player celebrating next to a Bar Beats Bingo scorecard"
              width={1254}
              height={1024}
              priority
              className="relative w-full"
            />
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section aria-label="Bar Beats Bingo in numbers" className="wrap">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["55,000+", "music videos in the library", "bg-coal border border-line"],
            ["100%", "customer satisfaction", "bg-red"],
            ["1,000+", "players every week", "bg-coal border border-line"],
          ].map(([value, label, tone]) => (
            <div key={label} className={`rounded-[var(--radius-card)] px-6 py-8 text-center ${tone}`}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="display block text-5xl">{value}</span>
                <span className="mt-2 block text-[1.05rem] text-white/90">{label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Phone control */}
      <section className="wrap mt-28 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-[clamp(2.3rem,5vw,3.6rem)]">Control bingo from your smartphone</h2>
          <p className="mt-5 max-w-lg text-lg text-white/90">
            When someone yells BINGO!, pause the game from the remote app or your laptop and check their card. Then
            press play for the next winner. Too easy.
          </p>
        </div>
        <Photo
          src={IMAGES.phoneControl}
          alt="The Orange Door remote app on a phone and laptop"
          width={1024}
          height={836}
          className="w-full"
        />
      </section>

      {/* What is it */}
      <section className="wrap mt-28">
        <div className="grid items-center gap-12 border-t-4 border-red pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-[clamp(2.3rem,5vw,3.6rem)]">What is Bar Beats Bingo?</h2>
            <p className="mt-5 text-xl font-semibold text-red-bright">Bored of the same old fundraiser or event?</p>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              Crank up the fun with BBB. Your crowd will be singing their hearts out, laughing and loosening their
              wallets, all in the name of charity or the thrill of winning prizes. Easy to run, epic to play, and
              guaranteed to turn your night into a legendary one.
            </p>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              Every player gets a different scorecard of songs. Mark them off as the music videos play, and shout
              BINGO! when you complete a line.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[460px]">
            <BingoCard className="rotate-[4deg]" />
            <p className="absolute -bottom-4 left-4 rotate-[-4deg] rounded-full bg-sun px-4 py-2 text-sm font-bold text-[#1b1b1b] shadow-lg">
              Every card is different
            </p>
          </div>
        </div>
      </section>

      {/* Music styles */}
      <section className="wrap mt-28" aria-labelledby="styles-heading">
        <div className="max-w-2xl">
          <h2 id="styles-heading" className="text-[clamp(2.3rem,5vw,3.6rem)]">
            What styles of music?
          </h2>
          <p className="mt-4 text-lg text-white/90">
            From 80s hits and classic rock to modern pop, hip-hop and themed playlists like disco nights or holiday jams,
            every round stays fresh and keeps everyone on their toes.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STYLES.map((s) => (
            <li key={s.name} className={`flex flex-col rounded-[var(--radius-card)] p-6 ${s.tone}`}>
              <h3 className="text-[1.75rem] leading-none">{s.name}</h3>
              <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed opacity-90">{s.blurb}</p>
              <Link href="/contact-us" className="mt-6 font-bold underline decoration-2 underline-offset-4">
                Get started<span className="sr-only"> with {s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Bingo vs trivia */}
      <section className="wrap mt-28 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-[clamp(2.1rem,4.4vw,3.2rem)]">Which is better, a bingo show or a trivia show?</h2>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            Trivia nights can feel high-pressure. Bar Beats Bingo is relaxed and music-driven, so everyone stays engaged
            without being put on the spot. Just good tunes, great company and easygoing fun.
          </p>
          <ol className="mt-8 space-y-6">
            {WHY.map((w, i) => (
              <li key={w.title} className="flex gap-5">
                <span className="display grid h-14 w-11 shrink-0 place-items-center rounded-full bg-sun text-2xl text-[#1b1b1b]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-xl font-bold text-red-bright">{w.title}</h3>
                  <p className="mt-1 max-w-md text-white/90">{w.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact-us" className="btn btn-red">
              Get started
            </Link>
            <Link href="/more-information" className="btn btn-ghost">
              Learn more
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-t-full bg-red pt-10">
          <Photo
            src={IMAGES.triviaHost}
            alt="A game show host with a microphone"
            width={800}
            height={879}
            className="relative w-full"
          />
          <p aria-hidden className="display absolute right-[7%] top-[19%] text-right text-[clamp(2.4rem,7vw,3.6rem)] leading-[0.95]">
            Bingo
            <br />
            vs
            <br />
            Trivia
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="wrap mt-28" aria-labelledby="testimonials-heading">
        <h2 id="testimonials-heading" className="text-[clamp(2.3rem,5vw,3.6rem)]">
          Venues love it
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="panel flex flex-col p-7">
              <blockquote className="flex-1 text-lg leading-relaxed text-white/90">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                <Photo src={t.image} alt="" width={100} height={64} className="h-16 w-[100px] rounded-lg object-cover" />
                <span>
                  <span className="block font-bold">{t.name}</span>
                  <span className="block text-sm text-mist">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <CallToAction />
    </>
  );
}
