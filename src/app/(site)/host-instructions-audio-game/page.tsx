import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";
import { quickFireSteps } from "@/components/site/quick-fire-steps";

export const metadata: Metadata = {
  title: "Host guide: audio game",
  description: "How to run the audio version of a Bar Beats Bingo quick fire night from your laptop and speakers, step by step.",
};

export default function AudioGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-audio-game"
      title="Host guide: audio game"
      intro={
        <p>
          How to run the audio version from your own laptop and speakers. Your game pack has four quick fire games of 7
          to 27 minutes each: run one, or run all four.
        </p>
      }
      steps={quickFireSteps(
        <p>
          Download your game pack from the <Link href="/portal">customer portal</Link>: four quick fire games as audio
          files, plus the scorecards, the call list and the answer key. Print the call list and answer key and keep them within reach. Connect
          your laptop to your speakers and test the sound at playing volume before the doors open.
        </p>,
        <>Play the games one at a time, in order. Use play and pause on your laptop to run each game.</>,
      )}
      closing={
        <>
          Questions? <Link href="/contact-us">Get in touch with the Orange Door team</Link> and we&apos;ll help you out.
        </>
      }
    />
  );
}
