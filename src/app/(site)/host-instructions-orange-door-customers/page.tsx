import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";

export const metadata: Metadata = {
  title: "Host guide: Orange Door customers",
  description: "Step-by-step instructions for running Bar Beats Bingo on your Orange Door system.",
};

export default function OrangeDoorGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-orange-door-customers"
      title="Host guide: Orange Door customers"
      intro={<p>Everything you need to run a Bar Beats Bingo night on your Orange Door system.</p>}
      steps={[
        {
          title: "Prepare the scorecards",
          body: (
            <p>
              Print the scorecards. Each A4 sheet holds two A5 cards, so cut each sheet in half. Give one card to each
              player or pair, along with a marker or pen.
            </p>
          ),
        },
        {
          title: "Get set up",
          body: (
            <p>
              Print the track listing so you can check winning cards, and make sure the game videos are ready. You&apos;ll
              find this week&apos;s files in your <Link href="/portal">customer portal</Link>.
            </p>
          ),
        },
        {
          title: "Load the game",
          body: (
            <p>
              Search <strong>BINGO</strong> on your Orange Door system and play the latest weekly videos in numbered
              order. Each round runs 15 to 20 minutes, with five rounds per game.
            </p>
          ),
        },
        {
          title: "Pace the game",
          body: (
            <p>
              Pause between rounds so your audience can grab food or drinks, then start the next video when
              they&apos;re ready.
            </p>
          ),
        },
        {
          title: "When someone calls BINGO!",
          body: (
            <p>
              Pause the video, check their card against the track listing, read the track titles over the microphone,
              and hand over the prize if the card is valid.
            </p>
          ),
        },
        {
          title: "Keep the music going",
          body: (
            <p>
              Play music before the game, between rounds and after the show. Use the Orange Door play/pause button or
              the OD Remote app on your smartphone.
            </p>
          ),
        },
      ]}
      closing={
        <p>
          Need help with the technical side? Contact Orange Door support, or <Link href="/contact-us">send us a message</Link>.
        </p>
      }
    />
  );
}
