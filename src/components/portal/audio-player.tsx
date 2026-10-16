"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { songAt } from "@/lib/call-list";
import { useShowSession } from "./show-session";

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
 * Plays a show's file as sound only (the picture of a video isn't shown).
 *
 * `skipSeconds` hides an intro: playback starts that far in, and the clock,
 * length and seek bar all count from there, so the show appears to start at 0:00.
 *
 * `knownDuration` is the file's length worked out by the server, so the length
 * shows straight away. iPhones don't load any audio until Play is pressed.
 */
export function AudioPlayer({
  src,
  title,
  skipSeconds = 0,
  knownDuration = null,
}: {
  src: string;
  title: string;
  skipSeconds?: number;
  knownDuration?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rawDuration, setRawDuration] = useState<number | null>(finite(knownDuration) ? knownDuration : null);
  const [loaded, setLoaded] = useState(false); // the browser has read the file's details, so seeking works
  const [rawTime, setRawTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lengthLater, setLengthLater] = useState(false);
  // True from pressing Play on an unloaded file until it's past the intro; it stays muted meanwhile.
  const startingRef = useRef(false);
  // A jump asked for before the file had loaded (e.g. a song tapped on the call list).
  const pendingSeekRef = useRef<number | null>(null);
  const session = useShowSession();
  const report = session?.report;
  const registerPlayer = session?.registerPlayer;

  // Only skip when the file is clearly longer than the intro.
  const skipFor = (fileDuration: number | null | undefined) =>
    finite(fileDuration) && fileDuration > skipSeconds + 5 ? skipSeconds : 0;
  const lengthOf = (audio: HTMLAudioElement) => (finite(audio.duration) ? audio.duration : knownDuration);
  const skip = skipFor(rawDuration);

  // Stop the sound when the page is left (pages can stay mounted in the background).
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

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
  const toStart = (audio: HTMLAudioElement) => {
    const s = skipFor(lengthOf(audio));
    audio.currentTime = s;
    setRawTime(s);
  };

  /** Un-mutes once playback is safely past the intro. */
  const releaseIfPastIntro = (audio: HTMLAudioElement) => {
    if (startingRef.current && audio.currentTime >= skipFor(lengthOf(audio)) - 0.25) {
      startingRef.current = false;
      audio.muted = false;
    }
  };

  const cancelStarting = (audio: HTMLAudioElement) => {
    startingRef.current = false;
    audio.muted = false;
  };

  const play = (audio: HTMLAudioElement) => {
    const s = skipFor(lengthOf(audio));
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      if (audio.currentTime < s) toStart(audio);
    } else if (s > 0) {
      // Nothing loaded yet, so the browser can't jump past the intro until it has the file's details.
      startingRef.current = true;
      audio.muted = true;
    }
    setBuffering(true);
    audio.play().catch((err: unknown) => {
      // Pressing Pause before the sound starts rejects play() harmlessly; only a real format problem is fatal.
      setBuffering(false);
      cancelStarting(audio);
      if (err instanceof DOMException && err.name === "NotSupportedError") setFailed(true);
    });
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play(audio);
    else audio.pause();
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    toStart(audio);
  };

  /** `value` is a position on the show's own clock (0 = end of the intro). */
  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    const target = skipFor(lengthOf(audio)) + Math.max(0, value);
    audio.currentTime = target;
    setRawTime(target);
  };

  /** `time` is seconds into the file (the call list's clock). Never lands inside the intro. */
  const seekRaw = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    const target = Math.max(time, skipFor(lengthOf(audio)));
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = target;
    else pendingSeekRef.current = target;
    setRawTime(target);
  };

  const retry = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setFailed(false);
    setLoaded(false);
    audio.load();
  };

  const duration = finite(rawDuration) ? rawDuration - skip : null;
  const time = Math.max(0, Math.min(rawTime - skip, duration ?? Infinity));
  const known = finite(duration);
  const progress = known ? Math.min(100, (time / duration) * 100) : 0;
  const canSeek = known && loaded;

  // Let the call list move the player, and tell it where the show is up to.
  const seekRawRef = useRef(seekRaw);
  useEffect(() => {
    seekRawRef.current = seekRaw;
  });
  useEffect(() => {
    if (!registerPlayer) return;
    registerPlayer({ seek: (t) => seekRawRef.current(t) });
    return () => registerPlayer(null);
  }, [registerPlayer]);
  useEffect(() => {
    report?.(rawTime, playing);
  }, [report, rawTime, playing]);

  const songs = session?.callList?.songs ?? null;
  // Before the first song (e.g. while the file is still loading) it's about to be song 1.
  const nowIndex = songs?.length ? Math.max(0, songAt(songs, rawTime)) : -1;
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
      ["play", () => audioRef.current?.paused && latest.current.toggle()],
      ["pause", () => audioRef.current && !audioRef.current.paused && latest.current.toggle()],
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

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red/20 text-red-bright" aria-hidden>
          <Volume2 size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-lg font-bold leading-tight">Listen to the show</h2>
          <p className="truncate text-sm text-mist" title={title}>
            {title}
          </p>
        </div>
      </div>

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
          <div className="mt-6 flex items-baseline justify-between gap-3">
            <span className="display text-3xl tabular-nums" aria-hidden>
              {formatTime(time)}
            </span>
            <span className="text-right text-sm text-mist">
              {known ? (
                <>
                  Length <strong className="tabular-nums text-white">{formatTime(duration)}</strong>
                </>
              ) : lengthLater && !playing ? (
                "Length shows once it starts"
              ) : (
                "Getting the length…"
              )}
            </span>
          </div>

          <div className="relative mt-3 rounded-full has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-sun has-[:focus-visible]:outline">
            <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full rounded-full bg-red" style={{ width: `${progress}%` }} />
            </div>
            {known && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `${progress}%` }}
              />
            )}
            {/* Taller than the bar so it's easy to grab with a finger. */}
            <input
              type="range"
              min={0}
              max={canSeek ? duration : 0}
              step={1}
              value={canSeek ? Math.min(time, duration) : 0}
              disabled={!canSeek}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Position in the show"
              aria-valuetext={`${formatTime(time)} of ${known ? formatTime(duration) : "unknown length"}`}
              className="absolute inset-x-0 -top-4 h-10 w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
          </div>

          <div className="mt-5 flex gap-2">
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
          </div>
          {now && songs && (
            <p className="mt-4 flex min-w-0 items-start gap-2 text-sm" aria-live="polite">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white font-bold text-ink" aria-hidden>
                {now.letter}
              </span>
              <span className="line-clamp-2 min-w-0 pt-0.5">
                <span className="text-mist">
                  {playing ? "Now playing" : "Song"} {now.n} of {songs.length}:
                </span>{" "}
                <span className="font-semibold">{now.title}</span>
              </span>
            </p>
          )}
          <p className="mt-4 text-xs text-fog">Sound only. Download the file to play the video on your screens.</p>
        </>
      )}

      <audio
        ref={audioRef}
        // The #t= hint lets browsers fetch from the right spot first; the handlers below make sure of it.
        src={skipSeconds > 0 ? `${src}#t=${skipSeconds}` : src}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          if (finite(audio.duration)) setRawDuration(audio.duration);
          setLoaded(true);
          const s = skipFor(lengthOf(audio));
          if (pendingSeekRef.current !== null) {
            const target = Math.max(pendingSeekRef.current, s);
            pendingSeekRef.current = null;
            audio.currentTime = target;
            setRawTime(target);
          } else if (Math.abs(audio.currentTime - s) > 0.5 && (audio.paused || startingRef.current)) {
            audio.currentTime = s;
            setRawTime(s);
          }
        }}
        onDurationChange={(e) => finite(e.currentTarget.duration) && setRawDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          const s = skipFor(lengthOf(audio));
          // Never let the intro play, whatever the browser did.
          if (!audio.paused && audio.currentTime < s - 0.25) {
            audio.currentTime = s;
            return;
          }
          releaseIfPastIntro(audio);
          setRawTime(audio.currentTime);
        }}
        onSeeked={(e) => releaseIfPastIntro(e.currentTarget)}
        onPlay={() => setPlaying(true)}
        onPlaying={(e) => {
          setBuffering(false);
          releaseIfPastIntro(e.currentTarget);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPause={(e) => {
          setPlaying(false);
          setBuffering(false);
          cancelStarting(e.currentTarget);
        }}
        onEnded={(e) => {
          setPlaying(false);
          setBuffering(false);
          toStart(e.currentTarget);
        }}
        onError={(e) => {
          setPlaying(false);
          setBuffering(false);
          cancelStarting(e.currentTarget);
          setFailed(true);
        }}
      />
    </div>
  );
}
