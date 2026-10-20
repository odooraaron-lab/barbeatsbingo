import Link from "next/link";
import type { GuideStep } from "./host-guide";

/**
 * The six steps of a quick fire night (from the Quick Fire host guide). Each host guide
 * passes its own "Get set up" step: Orange Door, laptop video or laptop audio.
 */
export function quickFireSteps(setup: React.ReactNode, control: React.ReactNode): GuideStep[] {
  return [
    {
      title: "Prepare your scorecards",
      body: (
        <p>
          Print the scorecards. Each A4 sheet holds two A5 cards, so cut them down the middle. Hand out one per player or
          pair, with a pen or marker. Print a few spares for latecomers.
        </p>
      ),
    },
    { title: "Get set up", body: setup },
    {
      title: "Welcome the room",
      body: (
        <p>
          Explain the game in under a minute. Say what the prizes are and what your phone rule is. Here&apos;s{" "}
          <Link href="/faq-tips#hosting">a welcome you can borrow</Link>.
        </p>
      ),
    },
    {
      title: "Name the way to win and press play",
      body: (
        <>
          <p>
            Before each game, tell the room the <Link href="/more-information#patterns">winning pattern</Link>, like 1
            line or the Cross, and whether you&apos;re playing on to Blackout. Then press play and sing along.
            It&apos;s half the fun.
          </p>
          <p>{control}</p>
        </>
      ),
    },
    {
      title: "When someone calls BINGO!",
      body: (
        <p>
          Pause the game. Check their card against the track listing and read their song titles out on the microphone,
          so the whole room is in on it. If the card checks out, award the prize. Then end the game there, or resume and
          play on to Blackout.
        </p>
      ),
    },
    {
      title: "Break between games",
      body: (
        <p>
          Give people time to order food and drinks, and run a <Link href="/faq-tips#crowd-game">crowd game</Link>.
          Start the next quick fire game when everyone is set. Before the first game, between games and after the show,
          keep music playing: a silent room loses its energy fast.
        </p>
      ),
    },
  ];
}
