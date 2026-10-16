"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { CallList } from "@/lib/call-list";
import type { CardSet } from "@/lib/bingo";

/** What the player lets other parts of the page do to it. */
export type PlayerHandle = {
  /** Moves playback to `time` seconds into the file (keeps playing if it was). */
  seek: (time: number) => void;
};

type ShowSessionValue = {
  /** Where the show is up to, in seconds into the file (the same clock as the call list). */
  time: number;
  playing: boolean;
  callList: CallList | null;
  cards: CardSet | null;
  /** The player reports its position as it plays. */
  report: (time: number, playing: boolean) => void;
  /** Jump the show to a point, e.g. when a song on the call list is tapped. */
  seekTo: (time: number) => void;
  /** The track list hands over songs it read itself, if the server hadn't. */
  offerCallList: (list: CallList) => void;
  registerPlayer: (handle: PlayerHandle | null) => void;
  hasPlayer: boolean;
};

const ShowSessionContext = createContext<ShowSessionValue | null>(null);

/**
 * Ties a show page together: the player, the call list and the card checker all
 * work from the same position in the show.
 */
export function ShowSession({
  callList: initialCallList,
  cards,
  children,
}: {
  callList: CallList | null;
  cards: CardSet | null;
  children: React.ReactNode;
}) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [offered, setOffered] = useState<CallList | null>(null);
  const [hasPlayer, setHasPlayer] = useState(false);
  const player = useRef<PlayerHandle | null>(null);

  const report = useCallback((t: number, p: boolean) => {
    setTime(t);
    setPlaying(p);
  }, []);

  const seekTo = useCallback((t: number) => {
    if (player.current) player.current.seek(t);
    else setTime(t);
  }, []);

  const offerCallList = useCallback((list: CallList) => {
    setOffered((current) => current ?? list);
  }, []);

  const registerPlayer = useCallback((handle: PlayerHandle | null) => {
    player.current = handle;
    setHasPlayer(!!handle);
  }, []);

  const value = useMemo<ShowSessionValue>(
    () => ({
      time,
      playing,
      callList: initialCallList ?? offered,
      cards,
      report,
      seekTo,
      offerCallList,
      registerPlayer,
      hasPlayer,
    }),
    [time, playing, initialCallList, offered, cards, report, seekTo, offerCallList, registerPlayer, hasPlayer],
  );

  return <ShowSessionContext.Provider value={value}>{children}</ShowSessionContext.Provider>;
}

/** The show page's shared state, or null outside a show page. */
export function useShowSession() {
  return useContext(ShowSessionContext);
}
