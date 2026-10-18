"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { hasTimes, songAt, type CallList, type CallSong } from "@/lib/call-list";
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
  /** True when the call list says when each song starts, so the songs can follow the player. */
  timed: boolean;
  /**
   * How many songs of the call list have played: followed from the player when the
   * call list has times, otherwise (or once the host sets it) as the host sets it.
   */
  played: number;
  /** True while `played` follows the player. */
  following: boolean;
  /** The host sets how many songs have played; null goes back to following the player. */
  setPlayed: (n: number | null) => void;
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
const NO_SONGS: CallSong[] = [];

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
  const [override, setOverride] = useState<number | null>(null);
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

  const callList = useMemo(() => {
    if (!initialCallList) return offered;
    // Read before the site looked for answer keys: use the one read from the PDF here.
    if (initialCallList.answers === undefined && offered?.answers) return { ...initialCallList, answers: offered.answers };
    return initialCallList;
  }, [initialCallList, offered]);

  const songs = callList?.songs ?? NO_SONGS;
  const timed = hasTimes(songs);
  const followIndex = timed ? songAt(songs, time) : -1;
  const followed = followIndex >= 0 ? songs[followIndex].n : 0;
  const played = Math.max(0, Math.min(override ?? followed, songs.length));
  const following = timed && override === null;

  const value = useMemo<ShowSessionValue>(
    () => ({
      time,
      playing,
      callList,
      cards,
      timed,
      played,
      following,
      setPlayed: setOverride,
      report,
      seekTo,
      offerCallList,
      registerPlayer,
      hasPlayer,
    }),
    [time, playing, callList, cards, timed, played, following, report, seekTo, offerCallList, registerPlayer, hasPlayer],
  );

  return <ShowSessionContext.Provider value={value}>{children}</ShowSessionContext.Provider>;
}

/** The show page's shared state, or null outside a show page. */
export function useShowSession() {
  return useContext(ShowSessionContext);
}
