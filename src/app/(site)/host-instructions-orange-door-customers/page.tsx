import type { Metadata } from "next";
import Link from "next/link";
import { HostGuide } from "@/components/site/host-guide";
import { quickFireSteps } from "@/components/site/quick-fire-steps";

export const metadata: Metadata = {
  title: "Host guide: Orange Door customers",
  description: "How to run a Bar Beats Bingo quick fire night on your Orange Door system, step by step.",
};

export default function OrangeDoorGuidePage() {
  return (
    <HostGuide
      current="/host-instructions-orange-door-customers"
      title="Host guide: Orange Door customers"
      intro={
        <p>
          Everything you need to run a quick fire night on your Orange Door system. Your game pack has four quick fire
          games of 7 to 27 minutes each: run one, or run all four.
        </p>
      }
      steps={quickFireSteps(
        <p>
          Print the call list and answer key and keep them within reach. Search <strong>BINGO</strong> in the search bar on your
          Orange Door system and find your quick fire games. Test the sound and the TVs at playing volume before the
          doors open. The scorecards, call list and answer key are in your <Link href="/portal">customer portal</Link>.
        </p>,
        <>
          Play one game at a time. Use play and pause on your Orange Door system, or run it from your phone with the
          Orange Door Remote app.
        </>,
      )}
      closing={
        <>
          Need help with the technical side? Contact Orange Door support, or <Link href="/contact-us">send us a message</Link>.
        </>
      }
    />
  );
}
