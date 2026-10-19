"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { hasTimes, songAt, type CallList, type CallSong } from "@/lib/call-list";
import type { CardSet } from "@/lib/bingo";
import { positionAt, soundAlive, type SyncState } from "@/lib/show-sync";
import { usePlayMode } from "./play-mode";

/** What the player lets other parts of the page do to it. */
export type PlayerHandle = {
  /** Moves playback to `time` seconds into the file (keeps playing if it was). */
  seek: (time: number) => void;
  /** Starts the sound on this device; false if the browser wouldn't. */
  play: () => Promise<boolean>;
  pause: () => void;
};

/** The game playing on another of the customer's devices, which this one follows. */
export type RemoteSound = {
  playing: boolean;
  /** Seconds into the file. */
  time: number;
  pause: () => void;
  resume: () => void;
  /** Moves it to `time` seconds into the file. */
  seek: (time: number) => void;
  /** Plays the sound on this device instead. */
  takeOver: () => void;
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
  /** Set while the show is playing on another of the customer's devices. */
  remote: RemoteSound | null;
  /** This device has stopped the show: it no longer holds the sound for the others. */
  release: () => void;
};

const ShowSessionContext = createContext<ShowSessionValue | null>(null);
const NO_SONGS: CallSong[] = [];

/** This browser tab, as one of the customer's devices (kept across reloads of the tab). */
function deviceId() {
  if (typeof window === "undefined") return "";
  const make = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    const known = sessionStorage.getItem("bbb-device");
    if (known) return known;
    const id = make();
    sessionStorage.setItem("bbb-device", id);
    return id;
  } catch {
    return make();
  }
}

/**
 * Ties a show page together: the player, the call list and the card checker all
 * work from the same position in the show.
 *
 * With `syncUrl`, it also keeps the game in step with the customer's other devices
 * showing the same show (see the sync API): whichever device plays the sound reports
 * where it's up to, and the others follow it, so a laptop can play the show while a
 * phone checks the cards. Any of them can pause it, move it on or set the songs played.
 */
export function ShowSession({
  callList: initialCallList,
  cards,
  syncUrl: syncWith = null,
  children,
}: {
  callList: CallList | null;
  cards: CardSet | null;
  syncUrl?: string | null;
  children: React.ReactNode;
}) {
  // Only while the play tools are switched on.
  const syncUrl = usePlayMode().on ? syncWith : null;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [offered, setOffered] = useState<CallList | null>(null);
  const [hasPlayer, setHasPlayer] = useState(false);
  const [override, setOverride] = useState<number | null>(null);
  const player = useRef<PlayerHandle | null>(null);

  // ── Keeping in step with the customer's other devices ──
  const [me] = useState(deviceId);
  /** The game as last shared, by this device or another. */
  const shared = useRef<SyncState | null>(null);
  const [sharedState, setSharedState] = useState<SyncState | null>(null);
  /** The server's clock minus ours, in ms. */
  const offset = useRef(0);
  /** The server's clock, ticking while there's a shared game (0 until known). */
  const [serverNow, setServerNow] = useState(0);
  /** What this device's own player is doing. */
  const local = useRef({ time: 0, playing: false });
  const overrideRef = useRef<number | null>(null);
  /** Set once the shared game has been read after the page loaded. */
  const started = useRef(false);
  /** When another device last changed the game (server clock, ms). Until one has, this one checks in less often. */
  const lastOther = useRef(0);
  /** Set when this device stops the show, until it plays again. */
  const released = useRef(false);

  const report = useCallback((t: number, p: boolean) => {
    if (p) released.current = false;
    local.current = { time: t, playing: p };
    setTime(t);
    setPlaying(p);
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

  const clock = useCallback(() => Date.now() + offset.current, []);
  /** Whether another device has been in on this game lately. */
  const together = useCallback(() => clock() - lastOther.current < 10 * 60_000, [clock]);

  /** Whether another device has the sound (and is still there). */
  const elsewhere = useCallback(
    (s: SyncState | null, now: number) => !!s && s.sound !== me && soundAlive(s, now),
    [me],
  );

  // Changes go to the server one at a time, so they arrive in order.
  const sending = useRef<Promise<void> | null>(null);
  const queued = useRef<Partial<SyncState> | null>(null);

  /** The game as this device sees it now, with `patch` changed. */
  const snapshot = useCallback(
    (patch: Partial<SyncState>) => {
      const s = shared.current;
      const now = clock();
      const base =
        s && elsewhere(s, now)
          ? { time: positionAt(s, now), playing: s.playing, sound: s.sound }
          : {
              time: local.current.time,
              playing: local.current.playing,
              sound: local.current.playing || (s?.sound === me && !released.current) ? me : null,
            };
      return { ...base, played: overrideRef.current, ...patch, by: me };
    },
    [clock, elsewhere, me],
  );

  const send = useCallback(
    (patch: Partial<SyncState>) => {
      if (!syncUrl || !me) return;
      queued.current = { ...(queued.current ?? {}), ...patch };
      if (sending.current) return;
      const run = async () => {
        while (queued.current) {
          const body = snapshot(queued.current);
          queued.current = null;
          try {
            const sent = Date.now();
            const res = await fetch(syncUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
              cache: "no-store",
            });
            if (res.ok) {
              const { state, now } = (await res.json()) as { state: SyncState; now: number };
              offset.current = now - (sent + Date.now()) / 2;
              shared.current = state;
              setSharedState(state);
            }
          } catch {
            /* offline for a moment: the next change or heartbeat catches up */
          }
        }
        sending.current = null;
      };
      sending.current = run();
    },
    [syncUrl, me, snapshot],
  );

  /** Does on this device what another device asked. `first`: just after the page loaded. */
  const apply = useCallback(
    (s: SyncState, first: boolean) => {
      overrideRef.current = s.played;
      setOverride(s.played);
      const p = player.current;
      const now = clock();
      const at = positionAt(s, now);
      const mine = local.current;
      if (s.sound === me) {
        if (first) {
          // This tab was reloaded while it had the sound, which stopped it: park where it was.
          p?.seek(at);
          if (s.playing) send({ playing: false, time: at, sound: me });
          return;
        }
        if (!p) return;
        if (Math.abs(mine.time - at) > 2) p.seek(at);
        if (s.playing && !mine.playing) {
          void p.play().then((ok) => {
            if (!ok) send({ playing: false, time: at, sound: me });
          });
        } else if (!s.playing && mine.playing) {
          p.pause();
        }
      } else if (mine.playing && soundAlive(s, now)) {
        // The sound has moved to another device.
        p?.pause();
      }
    },
    [clock, send, me],
  );

  const receive = useCallback(
    (s: SyncState) => {
      const last = shared.current;
      const first = !started.current;
      started.current = true;
      if (last && (s.at < last.at || (s.at === last.at && s.by === last.by))) return; // nothing new
      shared.current = s;
      setSharedState(s);
      if (s.by !== me) lastOther.current = Math.max(lastOther.current, s.at);
      if (s.by !== me || first) apply(s, first);
    },
    [apply, me],
  );

  // Read the shared game every couple of seconds (more often while it's playing).
  useEffect(() => {
    if (!syncUrl || !me) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let busy = false;
    const poll = async () => {
      clearTimeout(timer);
      if (busy || stopped) return;
      busy = true;
      // A phone in a pocket needn't follow along; the device playing the sound always does.
      if (!document.hidden || local.current.playing) {
        try {
          const sent = Date.now();
          const res = await fetch(syncUrl, { cache: "no-store" });
          if (res.status === 404) stopped = true; // not allowed to play this show here
          if (res.ok) {
            const { state, now } = (await res.json()) as { state: SyncState | null; now: number };
            offset.current = now - (sent + Date.now()) / 2;
            if (state) receive(state);
            else started.current = true;
          }
        } catch {
          /* try again next time */
        }
        // While this device has the sound, keep the others up to date, and let them know it's still here.
        const s = shared.current;
        const heartbeat = s?.playing ? (together() ? 5000 : 15000) : 30000;
        if (s && s.sound === me && clock() - s.at > heartbeat) send({});
      }
      busy = false;
      const s = shared.current;
      // Quick to follow once another device has joined in; on its own, a show page checks in now and then.
      const wait = together() ? (local.current.playing || s?.playing ? 1500 : 3000) : 5000;
      if (!stopped) timer = setTimeout(poll, wait);
    };
    void poll();
    const wake = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [syncUrl, me, receive, send, clock, together]);

  // Share what happens on this device: playing the sound here, pausing, a jump.
  useEffect(() => {
    if (!syncUrl || !started.current) return;
    const s = shared.current;
    if (playing) {
      if (!s || s.sound !== me || !s.playing) send({ playing: true, time, sound: me });
      else if (Math.abs(positionAt(s, clock()) - time) > 2) send({ time });
    } else if (s && s.sound === me) {
      if (s.playing) send({ playing: false, time });
      else if (Math.abs(s.time - time) > 2) send({ time });
    }
  }, [syncUrl, playing, time, send, clock, me]);

  // Keep the server's clock ticking here while there's a shared game: often while
  // following another device's sound, so the clock and songs move smoothly.
  const fast = !!sharedState?.playing && sharedState.sound !== me;
  useEffect(() => {
    if (!syncUrl || !sharedState) return;
    const tick = () => setServerNow(clock());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, fast ? 250 : 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [syncUrl, sharedState, fast, clock]);

  const followingElsewhere = !!syncUrl && serverNow > 0 && elsewhere(sharedState, serverNow);
  const remoteTime = followingElsewhere && sharedState ? positionAt(sharedState, serverNow) : null;
  const showTime = remoteTime ?? time;
  const showPlaying = followingElsewhere && sharedState ? sharedState.playing : playing;

  const release = useCallback(() => {
    if (shared.current?.sound !== me) return;
    released.current = true;
    send({ playing: false, sound: null });
  }, [send, me]);

  const setPlayed = useCallback(
    (n: number | null) => {
      overrideRef.current = n;
      setOverride(n);
      send({ played: n });
    },
    [send],
  );

  const seekTo = useCallback(
    (t: number) => {
      if (elsewhere(shared.current, clock())) send({ time: t });
      else if (player.current) player.current.seek(t);
      else setTime(t);
    },
    [elsewhere, clock, send],
  );

  const remote = useMemo<RemoteSound | null>(
    () =>
      followingElsewhere && sharedState && remoteTime !== null
        ? {
            playing: sharedState.playing,
            time: remoteTime,
            pause: () => send({ playing: false }),
            resume: () => send({ playing: true }),
            seek: (t: number) => send({ time: t }),
            takeOver: () => {
              const p = player.current;
              if (!p) return;
              p.seek(positionAt(sharedState, clock()));
              void p.play();
            },
          }
        : null,
    [followingElsewhere, sharedState, remoteTime, send, clock],
  );

  const songs = callList?.songs ?? NO_SONGS;
  const timed = hasTimes(songs);
  const followIndex = timed ? songAt(songs, showTime) : -1;
  const followed = followIndex >= 0 ? songs[followIndex].n : 0;
  const played = Math.max(0, Math.min(override ?? followed, songs.length));
  const following = timed && override === null;

  const value = useMemo<ShowSessionValue>(
    () => ({
      time: showTime,
      playing: showPlaying,
      callList,
      cards,
      timed,
      played,
      following,
      setPlayed,
      report,
      seekTo,
      offerCallList,
      registerPlayer,
      hasPlayer,
      remote,
      release,
    }),
    [showTime, showPlaying, callList, cards, timed, played, following, setPlayed, report, seekTo, offerCallList, registerPlayer, hasPlayer, remote, release],
  );

  return <ShowSessionContext.Provider value={value}>{children}</ShowSessionContext.Provider>;
}

/** The show page's shared state, or null outside a show page. */
export function useShowSession() {
  return useContext(ShowSessionContext);
}
