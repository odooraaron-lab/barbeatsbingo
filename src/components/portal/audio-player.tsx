"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Clapperboard,
  Expand,
  Loader2,
  MonitorSmartphone,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { songAt } from "@/lib/call-list";
import { useShowSession } from "./show-session";
import { useVideoStage } from "./play-mode";

type View = "sound" | "video";
const VIEW_KEY = "bbb-player-view";

/** The browser's fullscreen, including the older Safari names (iPhones can only make the video itself fullscreen). */
type FullscreenFrame = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
const fullscreenElement = () =>
  typeof document === "undefined"
    ? null
    : (document.fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement ?? null);

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const finite = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n > 0;

/**
 * Plays a show: as sound only (from the light MP3), or, when `video` is given, as the
 * video itself, drawn wide above the call list with a fullscreen button. Each device
 * remembers which it last used. Both follow the same clock, so switching keeps the place.
 *
 * `skipSeconds` hides an intro: playback starts that far in, and the clock,
 * length and seek bar all count from there, so the show appears to start at 0:00.
 *
 * `knownDuration` is the file's length worked out by the server, so the length
 * shows straight away. iPhones don't load any audio until Play is pressed.
 *
 * When the show is playing on another of the customer's devices, this one shows where
 * that's up to instead, and its buttons work that device (or move the sound here).
 */
export function AudioPlayer({
  src,
  title,
  skipSeconds = 0,
  knownDuration = null,
  video = null,
}: {
  src: string;
  title: string;
  skipSeconds?: number;
  knownDuration?: number | null;
  /** The show's video, for players allowed to show it. */
  video?: { src: string; knownDuration: number | null } | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // What this device plays. A ref too, so event handlers know which element is the live one.
  const [view, setView] = useState<View>("sound");
  const viewRef = useRef<View>("sound");
  const [videoFailed, setVideoFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useVideoStage();
  /** The element playing on this device now. */
  const media = (): HTMLMediaElement | null => (viewRef.current === "video" ? videoRef.current : audioRef.current);
  const knownFor = (v: View) => (v === "video" ? (video?.knownDuration ?? knownDuration) : knownDuration);
  const [rawDuration, setRawDuration] = useState<number | null>(finite(knownDuration) ? knownDuration : null);
  const [loaded, setLoaded] = useState(false); // the browser has read the file's details, so seeking works
  const [rawTime, setRawTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lengthLater, setLengthLater] = useState(false);
  // True from pressing Play on an unloaded file until it's past the intro; it stays muted meanwhile.
  const startingRef = useRef(false);
  // Never stays muted for long: if the jump past the intro can't happen, better to hear the intro.
  const unmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Loading for a long time after Play: say so, rather than just a spinner.
  const [slow, setSlow] = useState(false);
  // A jump asked for before the file had loaded (e.g. a song tapped on the call list).
  const pendingSeekRef = useRef<number | null>(null);
  const session = useShowSession();
  const report = session?.report;
  const registerPlayer = session?.registerPlayer;

  // Only skip when the file is clearly longer than the intro.
  const skipFor = (fileDuration: number | null | undefined) =>
    finite(fileDuration) && fileDuration > skipSeconds + 5 ? skipSeconds : 0;
  const lengthOf = (el: HTMLMediaElement) => (finite(el.duration) ? el.duration : knownFor(viewRef.current));
  const skip = skipFor(rawDuration);

  // Stop the sound when the page is left (pages can stay mounted in the background).
  useEffect(() => {
    const audio = audioRef.current;
    const videoEl = videoRef.current;
    return () => {
      audio?.pause();
      videoEl?.pause();
      if (unmuteTimerRef.current) clearTimeout(unmuteTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!(playing && buffering)) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [playing, buffering]);

  // The page's HTML starts loading the audio before the page's scripts are running, so on a
  // fast connection its details can arrive before anything is listening. Replay that moment,
  // otherwise the seek bar would stay switched off.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.error) audio.dispatchEvent(new Event("error"));
    else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.dispatchEvent(new Event("loadedmetadata"));
  }, []);

  // Some phones don't read the length until Play is pressed; say so rather than "Getting the length…" forever.
  useEffect(() => {
    if (rawDuration != null) return;
    const timer = setTimeout(() => setLengthLater(true), 4000);
    return () => clearTimeout(timer);
  }, [rawDuration]);

  /** Moves to the start of the show (just after the intro). */
  const toStart = (audio: HTMLMediaElement) => {
    const s = skipFor(lengthOf(audio));
    audio.currentTime = s;
    setRawTime(s);
  };

  const cancelStarting = (audio: HTMLMediaElement) => {
    startingRef.current = false;
    audio.muted = false;
    if (unmuteTimerRef.current) clearTimeout(unmuteTimerRef.current);
    unmuteTimerRef.current = null;
  };

  /** Un-mutes once playback is safely past the intro. */
  const releaseIfPastIntro = (audio: HTMLMediaElement) => {
    if (startingRef.current && audio.currentTime >= skipFor(lengthOf(audio)) - 0.25) cancelStarting(audio);
  };

  /** Whether the browser can jump to `time` (it can't if the link doesn't allow it). */
  const canReach = (audio: HTMLMediaElement, time: number) => {
    const { seekable } = audio;
    return seekable.length > 0 && seekable.end(seekable.length - 1) >= time;
  };

  const play = (audio: HTMLMediaElement): Promise<boolean> => {
    const s = skipFor(lengthOf(audio));
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      if (audio.currentTime < s) toStart(audio);
    } else if (s > 0 && pendingSeekRef.current === null) {
      // Nothing loaded yet, so the browser can't jump past the intro until it has the file's details.
      startingRef.current = true;
      audio.muted = true;
    }
    setBuffering(true);
    return audio.play().then(
      () => true,
      (err: unknown) => {
        // Pressing Pause before the sound starts rejects play() harmlessly; only a real format problem is fatal.
        setBuffering(false);
        cancelStarting(audio);
        if (err instanceof DOMException && err.name === "NotSupportedError") setFailed(true);
        return false;
      },
    );
  };

  const toggle = () => {
    const audio = media();
    if (!audio) return;
    if (audio.paused) void play(audio);
    else audio.pause();
  };

  const stop = () => {
    const audio = media();
    if (!audio) return;
    audio.pause();
    toStart(audio);
    // Stopping hands the show back: another device opened now gets its own player.
    session?.release();
  };

  /** `value` is a position on the show's own clock (0 = end of the intro). */
  const seek = (value: number) => {
    const audio = media();
    if (!audio || !Number.isFinite(value)) return;
    const target = skipFor(lengthOf(audio)) + Math.max(0, value);
    audio.currentTime = target;
    setRawTime(target);
  };

  /** `time` is seconds into the file (the call list's clock). Never lands inside the intro. */
  const seekRaw = (time: number) => {
    const audio = media();
    if (!audio || !Number.isFinite(time)) return;
    const target = Math.max(time, skipFor(lengthOf(audio)));
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = target;
    else pendingSeekRef.current = target;
    setRawTime(target);
  };

  const retry = () => {
    const audio = media();
    if (!audio) return;
    setFailed(false);
    setLoaded(false);
    audio.load();
  };

  /**
   * Plays the show on the other element (sound only or video) from the same place,
   * still playing if it was. Runs straight from the button press, so browsers allow
   * the new element to start.
   */
  const switchTo = (next: View, keepPlaying = true) => {
    if (next === viewRef.current || (next === "video" && !video)) return;
    const from = media();
    const at = from && from.readyState >= HTMLMediaElement.HAVE_METADATA ? from.currentTime : rawTime;
    const wasPlaying = keepPlaying && !!from && !from.paused;
    viewRef.current = next;
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* not kept; fine */
    }
    if (from) {
      from.pause();
      cancelStarting(from);
    }
    const to = media();
    const length = to && finite(to.duration) ? to.duration : knownFor(next);
    setRawDuration(finite(length) ? length : null);
    setLoaded(!!to && to.readyState >= HTMLMediaElement.HAVE_METADATA);
    setFailed(false);
    setRawTime(at);
    setPlaying(!!to && !to.paused);
    if (!to) {
      // The video's spot isn't on the page yet: it's loaded once it is (below).
      pendingSeekRef.current = at;
      return;
    }
    if (next === "video") loadVideo(to, at);
    if (to.readyState >= HTMLMediaElement.HAVE_METADATA) to.currentTime = Math.max(at, skipFor(length));
    else pendingSeekRef.current = at;
    if (wasPlaying) void play(to);
  };

  /** Points the video element at the show's video. Only once it's wanted: it's a big file. */
  const loadVideo = (el: HTMLMediaElement, at: number) => {
    if (!video || (el.getAttribute("src") && !el.error)) return;
    setVideoFailed(false);
    // The #t= hint fetches from the right spot first.
    el.src = `${video.src}#t=${Math.max(at, skipSeconds)}`;
  };

  // The video chosen before its spot on the page was ready.
  useEffect(() => {
    const el = videoRef.current;
    if (view === "video" && el && !el.getAttribute("src")) loadVideo(el, pendingSeekRef.current ?? rawTime);
    // Only when the view or the video's spot changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, stage]);

  // Pick up the view this device used last time (after the page has drawn, so it matches the server's HTML).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {
      /* no saved choice */
    }
    if (saved === "video" && video) switchTo("video", false);
    // Only once, when the player first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The video can't play here (e.g. its link won't stream): carry on with the sound. */
  const videoGaveUp = () => {
    setVideoFailed(true);
    switchTo("sound");
  };

  const goFullscreen = () => {
    const frame = frameRef.current as FullscreenFrame | null;
    const el = videoRef.current as FullscreenVideo | null;
    if (fullscreenElement()) {
      void (document.exitFullscreen?.() ?? (document as FullscreenDocument).webkitExitFullscreen?.());
      return;
    }
    if (frame?.requestFullscreen) void frame.requestFullscreen().catch(() => {});
    else if (frame?.webkitRequestFullscreen) void frame.webkitRequestFullscreen();
    else el?.webkitEnterFullscreen?.(); // iPhone
  };

  useEffect(() => {
    const changed = () => setFullscreen(!!frameRef.current && fullscreenElement() === frameRef.current);
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("webkitfullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("webkitfullscreenchange", changed);
    };
  }, []);

  const duration = finite(rawDuration) ? rawDuration - skip : null;
  const time = Math.max(0, Math.min(rawTime - skip, duration ?? Infinity));
  const known = finite(duration);
  const progress = known ? Math.min(100, (time / duration) * 100) : 0;
  const canSeek = known && loaded;

  // Let the call list (and the customer's other devices) move the player, and tell it
  // where the show is up to.
  const handleRef = useRef({ seekRaw, play, media });
  useEffect(() => {
    handleRef.current = { seekRaw, play, media };
  });
  useEffect(() => {
    if (!registerPlayer) return;
    registerPlayer({
      seek: (t) => handleRef.current.seekRaw(t),
      play: async () => {
        const el = handleRef.current.media();
        return el ? handleRef.current.play(el) : false;
      },
      pause: () => handleRef.current.media()?.pause(),
    });
    return () => registerPlayer(null);
  }, [registerPlayer]);
  useEffect(() => {
    report?.(rawTime, playing, view === "video");
  }, [report, rawTime, playing, view]);

  // Playing on another of the customer's devices: show that, and work it from here.
  const remote = session?.remote ?? null;
  const remoteSkip = skipFor(rawDuration ?? knownDuration);
  const showVideo = view === "video" && !remote;
  const shownTime = remote ? Math.max(0, Math.min(remote.time - remoteSkip, duration ?? Infinity)) : time;
  const shownProgress = known ? Math.min(100, (shownTime / duration) * 100) : 0;
  const shownPlaying = remote ? remote.playing : playing;

  // The song playing, when the call list says when each song starts. Before the first
  // song (e.g. while the file is still loading) it's about to be song 1.
  const songs = session?.timed ? (session.callList?.songs ?? null) : null;
  const nowIndex = songs?.length ? Math.max(0, songAt(songs, remote ? remote.time : rawTime)) : -1;
  const now = songs && nowIndex >= 0 ? songs[nowIndex] : null;

  // Lock screen and headphone controls on phones.
  const latest = useRef({ toggle, stop, seek, time });
  useEffect(() => {
    latest.current = { toggle, stop, seek, time };
  });
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    try {
      session.metadata = new MediaMetadata({
        title,
        artist: "Bar Beats Bingo",
        artwork: [{ src: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      });
    } catch {
      /* not supported */
    }
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => handleRef.current.media()?.paused && latest.current.toggle()],
      ["pause", () => handleRef.current.media()?.paused === false && latest.current.toggle()],
      ["stop", () => latest.current.stop()],
      ["seekbackward", (d) => latest.current.seek(latest.current.time - (d.seekOffset ?? 10))],
      ["seekforward", (d) => latest.current.seek(latest.current.time + (d.seekOffset ?? 10))],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* this action isn't supported here */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
      session.metadata = null;
    };
  }, [title]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !known || !loaded) return;
    try {
      navigator.mediaSession.setPositionState({ duration, position: Math.min(time, duration), playbackRate: 1 });
    } catch {
      /* not supported */
    }
  }, [known, loaded, duration, time]);

  // The same handlers serve the sound and the video; only the one in use on this device counts.
  type MediaEvent = React.SyntheticEvent<HTMLMediaElement>;
  const live = (e: MediaEvent) => e.currentTarget === media();
  const handlers = {
    onLoadedMetadata: (e: MediaEvent) => {
      if (!live(e)) return;
      const el = e.currentTarget;
      if (finite(el.duration)) setRawDuration(el.duration);
      setLoaded(true);
      const s = skipFor(lengthOf(el));
      if (pendingSeekRef.current !== null) {
        const target = Math.max(pendingSeekRef.current, s);
        pendingSeekRef.current = null;
        el.currentTime = target;
        setRawTime(target);
      } else if (Math.abs(el.currentTime - s) > 0.5 && (el.paused || startingRef.current)) {
        el.currentTime = s;
        setRawTime(s);
      }
    },
    onDurationChange: (e: MediaEvent) => {
      if (live(e) && finite(e.currentTarget.duration)) setRawDuration(e.currentTarget.duration);
    },
    onTimeUpdate: (e: MediaEvent) => {
      if (!live(e)) return;
      const el = e.currentTarget;
      const s = skipFor(lengthOf(el));
      // Never let the intro play, whatever the browser did (as long as it can jump past it).
      if (!el.paused && el.currentTime < s - 0.25 && canReach(el, s)) {
        el.currentTime = s;
        return;
      }
      releaseIfPastIntro(el);
      setRawTime(el.currentTime);
    },
    onSeeked: (e: MediaEvent) => {
      if (live(e)) releaseIfPastIntro(e.currentTarget);
    },
    onPlay: (e: MediaEvent) => {
      if (live(e)) setPlaying(true);
    },
    onPlaying: (e: MediaEvent) => {
      if (!live(e)) return;
      const el = e.currentTarget;
      setBuffering(false);
      releaseIfPastIntro(el);
      if (startingRef.current && !unmuteTimerRef.current) {
        unmuteTimerRef.current = setTimeout(() => {
          unmuteTimerRef.current = null;
          if (startingRef.current) cancelStarting(el);
        }, 2500);
      }
    },
    onWaiting: (e: MediaEvent) => {
      if (live(e)) setBuffering(true);
    },
    onCanPlay: (e: MediaEvent) => {
      if (live(e)) setBuffering(false);
    },
    onPause: (e: MediaEvent) => {
      if (!live(e)) return;
      setPlaying(false);
      setBuffering(false);
      cancelStarting(e.currentTarget);
    },
    onEnded: (e: MediaEvent) => {
      if (!live(e)) return;
      setPlaying(false);
      setBuffering(false);
      toStart(e.currentTarget);
    },
    onError: (e: MediaEvent) => {
      if (!live(e)) return;
      setPlaying(false);
      setBuffering(false);
      cancelStarting(e.currentTarget);
      setFailed(true);
    },
  };
  const videoHandlers = {
    ...handlers,
    onError: (e: MediaEvent) => {
      if (!live(e)) return;
      setPlaying(false);
      setBuffering(false);
      videoGaveUp();
    },
  };

  // Space pauses and plays, and F leaves full screen, while the video fills the screen.
  useEffect(() => {
    if (!fullscreen) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        latest.current.toggle();
      } else if (e.key === "f") goFullscreen();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [fullscreen]);

  const frame = video && (
    <div
      ref={frameRef}
      hidden={!showVideo}
      className={`relative overflow-hidden bg-black ${fullscreen ? "" : "aspect-video rounded-2xl"} ${
        stage === undefined ? "mt-4" : "mb-8"
      }`}
    >
      <video
        ref={videoRef}
        preload={view === "video" ? "metadata" : "none"}
        playsInline
        onClick={toggle}
        onDoubleClick={goFullscreen}
        className="h-full w-full object-contain"
        aria-label={`Video: ${title}`}
        {...videoHandlers}
      />
      {!playing ? (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red focus-visible:outline-2 focus-visible:outline-sun"
          aria-label={time > 0 ? "Resume the video" : "Play the video"}
        >
          <Play size={34} aria-hidden className="translate-x-0.5" />
        </button>
      ) : (
        buffering && (
          <Loader2
            size={40}
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto animate-spin text-white/80"
          />
        )
      )}
      {!fullscreen && (
        <button
          type="button"
          onClick={goFullscreen}
          className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-lg bg-black/60 text-white transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-sun"
          aria-label="Full screen"
        >
          <Expand size={18} aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red/20 text-red-bright" aria-hidden>
          {view === "video" ? <Clapperboard size={22} /> : <Volume2 size={22} />}
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-lg font-bold leading-tight">
            {video ? "Play the show" : "Listen to the show"}
          </h2>
          <p className="truncate text-sm text-mist" title={title}>
            {title}
          </p>
        </div>
      </div>

      {video && !remote && (
        <div
          role="radiogroup"
          aria-label="Play as"
          className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.06] p-1"
        >
          {(
            [
              ["sound", "Sound only", Volume2],
              ["video", "Video", Clapperboard],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => switchTo(v)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-sun ${
                view === v ? "bg-white text-ink" : "text-mist hover:text-white"
              }`}
            >
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}
      {videoFailed && view === "sound" && !remote && (
        <p className="mt-3 text-sm text-mist" role="status">
          The video couldn&apos;t be played here, so it&apos;s sound only. Download the file to show the video.
        </p>
      )}

      {failed ? (
        <div className="mt-5">
          <p className="alert alert-info text-sm" role="status">
            The sound couldn&apos;t be loaded. Check your connection and try again, or use the Download button to save
            the file.
          </p>
          <button type="button" onClick={retry} className="btn btn-ghost mt-3 w-full">
            <RotateCcw size={16} aria-hidden /> Try again
          </button>
        </div>
      ) : (
        <>
          {remote && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-sun/10 px-3 py-2 text-sm text-sun" role="status">
              <MonitorSmartphone size={16} aria-hidden className="shrink-0" />
              {remote.video
                ? remote.playing
                  ? "The video is playing on your other device."
                  : "The video is paused on your other device."
                : remote.playing
                  ? "Playing on your other device."
                  : "Paused on your other device."}
            </p>
          )}
          <div className={`${remote ? "mt-4" : "mt-6"} flex items-baseline justify-between gap-3`}>
            <span className="display text-3xl tabular-nums" aria-hidden>
              {formatTime(shownTime)}
            </span>
            <span className="text-right text-sm text-mist">
              {known ? (
                <>
                  Length <strong className="tabular-nums text-white">{formatTime(duration)}</strong>
                </>
              ) : lengthLater && !shownPlaying ? (
                "Length shows once it starts"
              ) : (
                "Getting the length…"
              )}
            </span>
          </div>

          <div className="relative mt-3 rounded-full has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-sun has-[:focus-visible]:outline">
            <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-red" style={{ width: `${remote ? shownProgress : progress}%` }} />
            </div>
            {known && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `${remote ? shownProgress : progress}%` }}
              />
            )}
            {/* Taller than the bar so it's easy to grab with a finger. */}
            <input
              type="range"
              min={0}
              max={remote ? (known ? duration : 0) : canSeek ? duration : 0}
              step={1}
              value={remote ? (known ? Math.min(shownTime, duration) : 0) : canSeek ? Math.min(time, duration) : 0}
              disabled={remote ? !known : !canSeek}
              onChange={(e) =>
                remote ? remote.seek(remoteSkip + Number(e.target.value)) : seek(Number(e.target.value))
              }
              aria-label="Position in the show"
              aria-valuetext={`${formatTime(shownTime)} of ${known ? formatTime(duration) : "unknown length"}`}
              className="absolute inset-x-0 -top-4 h-10 w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
          </div>

          {remote ? (
            <>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={remote.playing ? remote.pause : remote.resume}
                  className="btn btn-red flex-1"
                  aria-pressed={remote.playing}
                >
                  {remote.playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
                  {remote.playing ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    remote.pause();
                    remote.seek(remoteSkip);
                  }}
                  className="btn btn-ghost"
                  disabled={!remote.playing && shownTime === 0}
                >
                  <Square size={16} aria-hidden /> Stop
                </button>
              </div>
              <button
                type="button"
                onClick={remote.takeOver}
                className="mt-3 text-sm text-sun underline underline-offset-4"
              >
                {remote.video ? "Play it on this device instead" : "Move the sound to this device"}
              </button>
            </>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={toggle} className="btn btn-red flex-1" aria-pressed={playing}>
                {buffering && playing ? (
                  <Loader2 size={18} aria-hidden className="animate-spin" />
                ) : playing ? (
                  <Pause size={18} aria-hidden />
                ) : (
                  <Play size={18} aria-hidden />
                )}
                {playing ? "Pause" : time > 0 ? "Resume" : "Play"}
              </button>
              <button type="button" onClick={stop} className="btn btn-ghost" disabled={!playing && time === 0}>
                <Square size={16} aria-hidden /> Stop
              </button>
              {view === "video" && (
                <button type="button" onClick={goFullscreen} className="btn btn-ghost w-full">
                  <Expand size={16} aria-hidden /> Full screen
                </button>
              )}
            </div>
          )}
          {slow && !remote && (
            <p className="mt-3 text-sm text-mist" role="status">
              Still loading. This can take a little while on a slow connection.
            </p>
          )}
          {now && songs && (
            <p className="mt-4 flex min-w-0 items-start gap-2 text-sm" aria-live="polite">
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white font-bold text-ink"
                aria-hidden
              >
                {now.letter}
              </span>
              <span className="line-clamp-2 min-w-0 pt-0.5">
                <span className="text-mist">
                  {shownPlaying ? "Now playing" : "Song"} {now.n} of {songs.length}:
                </span>{" "}
                <span className="font-semibold">{now.title}</span>
              </span>
            </p>
          )}
          {!video ? (
            <p className="mt-4 text-xs text-fog">Sound only. Download the file to play the video on your screens.</p>
          ) : (
            view === "video" &&
            !remote && (
              <p className="mt-4 text-xs text-fog">
                Start it on the laptop or screen it&apos;s showing on, then you can run it from your phone. For a big
                screen with no hiccups, download the file.
              </p>
            )
          )}
        </>
      )}

      <audio
        ref={audioRef}
        // The #t= hint lets browsers fetch from the right spot first; the handlers below make sure of it.
        src={skipSeconds > 0 ? `${src}#t=${skipSeconds}` : src}
        preload="metadata"
        playsInline
        {...handlers}
      />
      {frame && stage === undefined && frame}
      {frame && stage && createPortal(frame, stage)}
    </div>
  );
}
