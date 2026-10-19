"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Volume2 } from "lucide-react";
import { setPlayMode } from "@/app/portal/actions";

type PlayModeValue = { on: boolean; allowed: boolean; setOn: (on: boolean) => void };

const PlayModeContext = createContext<PlayModeValue>({ on: false, allowed: false, setOn: () => {} });

/**
 * Whether a show page shows the tools for playing the show (the player, the live call
 * list and the bingo checker) or just the files to download. The customer switches it;
 * it's kept on their account, so it's the same on all their devices. `allowed` is
 * false when an admin has taken the tools away from them.
 */
export function PlayMode({ allowed, initialOn, children }: { allowed: boolean; initialOn: boolean; children: React.ReactNode }) {
  const [on, setOnState] = useState(allowed && initialOn);
  const [, startTransition] = useTransition();
  const setOn = (next: boolean) => {
    if (!allowed) return;
    setOnState(next);
    startTransition(async () => {
      const result = await setPlayMode(next).catch(() => ({ ok: false }));
      if (!result.ok) setOnState(!next);
    });
  };
  return <PlayModeContext.Provider value={{ on: allowed && on, allowed, setOn }}>{children}</PlayModeContext.Provider>;
}

export function usePlayMode() {
  return useContext(PlayModeContext);
}

/** The switch on a show page. */
export function PlayModeToggle() {
  const { on, allowed, setOn } = usePlayMode();
  if (!allowed) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className="group mt-6 flex max-w-md items-center gap-3 rounded-2xl border border-line bg-coal px-4 py-3 text-left transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
    >
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-red" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? "left-6" : "left-1"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">
          <Volume2
            size={16}
            aria-hidden
            className={`mr-1.5 inline align-[-2px] ${on ? "text-red-bright" : "text-mist"}`}
          />
          Show player and bingo checker
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-mist">
          {on
            ? "On. Switch off if you just want to download the files."
            : "Off. Switch on to play the show here, follow the call list and check bingos."}
        </span>
      </span>
    </button>
  );
}

/**
 * Lays out the track list and, while the play tools are on, the player and checker
 * beside it (above it on phones).
 */
export function ShowTools({ trackList, side }: { trackList: React.ReactNode; side: React.ReactNode }) {
  const { on } = usePlayMode();
  const tools = on ? side : null;
  if (!trackList) return tools ? <div className="mt-10 max-w-md">{tools}</div> : null;
  return (
    <div className={`mt-14 grid items-start gap-8 ${tools ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
      {trackList}
      {tools && (
        // Stays in view beside the call list; if it's taller than the window, it scrolls by itself.
        <aside className="order-first lg:sticky lg:top-6 lg:order-none lg:mt-[4.25rem] lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]">
          {tools}
        </aside>
      )}
    </div>
  );
}
