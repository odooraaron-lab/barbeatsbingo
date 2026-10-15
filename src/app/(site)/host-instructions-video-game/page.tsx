import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";

export const metadata: Metadata = {
  title: "Host guide: video game",
  description: "Step-by-step instructions for hosting the Bar Beats Bingo music video game.",
};

export default function VideoGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-video-game"
      title="Host guide: video game"
      intro={<p>How to run the music video version of Bar Beats Bingo on your screens.</p>}
      steps={[
        {
          title: "Download your game pack",
          body: (
            <p>
              Log in to the <Link href="/portal">customer portal</Link> to download this week&apos;s five video rounds
              (about 15 to 20 minutes each), printable scorecards and an answer sheet.
            </p>
          ),
        },
        {
          title: "Hand out the scorecards",
          body: (
            <p>
              Print the cards and hand them out, or sell them to raise money for charity. Every card is different.
            </p>
          ),
        },
        {
          title: "Let the games begin",
          body: <p>Play Rounds 1 to 5 in order. Each round has music videos and clues.</p>,
        },
        {
          title: "When someone yells BINGO!",
          body: (
            <p>
              Prizes go to the first player to complete <strong>one line</strong>, <strong>three lines</strong> or{" "}
              <strong>all five lines</strong> (blackout). You can add a bonus prize for the cross pattern.
            </p>
          ),
        },
        {
          title: "Celebrate and sing along",
          body: (
            <p>
              Lead the sing-alongs, hand out the prizes, and keep the music going before, between and after the rounds.
            </p>
          ),
        },
      ]}
      closing={
        <p>
          Stuck on anything? <Link href="/contact-us">Contact us</Link> and we&apos;ll help you get set up.
        </p>
      }
    />
  );
}
