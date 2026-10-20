import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";
import { quickFireSteps } from "@/components/site/quick-fire-steps";

export const metadata: Metadata = {
  title: "Host guide: video game",
  description: "How to run the music video version of a Bar Beats Bingo quick fire night from your laptop, step by step.",
};

export default function VideoGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-video-game"
      title="Host guide: video game"
      intro={
        <p>
          How to run the music video version from your own laptop, on your screens. Your game pack has four quick fire
          games of 15 to 25 minutes each: run one, or run all four.
        </p>
      }
      steps={quickFireSteps(
        <p>
          Download your game pack from the <Link href="/portal">customer portal</Link>: four quick fire games as video
          files, plus the scorecards and the track listing. Print the track listing and keep it within reach. Connect
          the laptop to your speakers and TVs, and test the sound at playing volume before the doors open.
        </p>,
        <>Play the games one at a time, in order. Use play and pause on your laptop to run each game.</>,
      )}
      closing={
        <>
          Stuck on anything? <Link href="/contact-us">Contact us</Link> and we&apos;ll help you get set up.
        </>
      }
    />
  );
}
