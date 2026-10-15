import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";

export const metadata: Metadata = {
  title: "Host guide: audio game",
  description: "Step-by-step instructions for hosting the Bar Beats Bingo audio game.",
};

export default function AudioGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-audio-game"
      title="Host guide: audio game"
      intro={<p>How to run the audio version of Bar Beats Bingo from your own laptop and speakers.</p>}
      steps={[
        {
          title: "Download your game pack",
          body: (
            <p>
              Log in to the <Link href="/portal">customer portal</Link> to download your game pack: five audio files (one
              per round), printable scorecards and an answer sheet. Each round runs about 15 to 20 minutes. Want more
              rounds? Add one of our themed games.
            </p>
          ),
        },
        {
          title: "Hand out the scorecards",
          body: (
            <p>
              Print the cards and hand them out, or sell them. Card sales can support a local charity. Every card is
              different.
            </p>
          ),
        },
        {
          title: "Start the game",
          body: (
            <p>
              Play Round 1. Each round has music and hidden clues, so no music knowledge is needed. Pause after each
              round and start Rounds 2 to 5 when your audience is ready, leaving time for drinks, food and breaks.
            </p>
          ),
        },
        {
          title: "When someone calls BINGO!",
          body: (
            <p>
              Prizes go to the first player to complete <strong>1 line</strong>, <strong>3 lines</strong> or{" "}
              <strong>all 5 lines</strong> (blackout). You can also offer a bonus prize for the cross pattern.
            </p>
          ),
        },
        {
          title: "Celebrate the winners",
          body: (
            <p>
              Join the sing-alongs and hand out the prizes. Our <Link href="/faq-tips">FAQ</Link> has prize-giving tips.
              It&apos;s all about fun and getting everyone involved.
            </p>
          ),
        },
      ]}
      closing={
        <p>
          Questions? <Link href="/contact-us">Get in touch with the Orange Door team</Link> and we&apos;ll help you out.
        </p>
      }
    />
  );
}
