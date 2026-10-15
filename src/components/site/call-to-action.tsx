import Link from "next/link";

export function CallToAction() {
  return (
    <section className="wrap mt-28">
      <div className="relative overflow-hidden rounded-[28px] bg-red px-7 py-14 sm:px-14">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10 sm:h-96 sm:w-96"
        />
        <div className="relative max-w-2xl">
          <h2 className="text-[clamp(2.2rem,5vw,3.4rem)]">Ready to bring the beats?</h2>
          <p className="mt-4 text-lg text-white/95">
            Get in touch to organise a trial with one of our team, or log in to download this week&apos;s games.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact-us" className="btn bg-white text-[#1b1b1b] hover:bg-white/90">
              Contact us
            </Link>
            <Link href="/login" className="btn border-[1.5px] border-white/70 text-white hover:bg-white/10">
              Customer login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
