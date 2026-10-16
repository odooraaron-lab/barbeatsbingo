"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Square, Volume2 } from "lucide-react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Plays a show's file as sound only (the picture of a video isn't shown).
 * The length loads before pressing play so hosts can see how long the show runs.
 *
 * `skipSeconds` hides an intro: playback starts that far in, and the clock,
 * length and seek bar all count from there, so the show appears to start at 0:00.
 */
export function AudioPlayer({ src, title, skipSeconds = 0 }: { src: string; title: string; skipSeconds?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rawDuration, setRawDuration] = useState<number | null>(null);
  const [rawTime, setRawTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);

  // Only skip when the file is clearly longer than the intro.
  const skipFor = (fileDuration: number | null | undefined) =>
    fileDuration != null && Number.isFinite(fileDuration) && fileDuration > skipSeconds + 5 ? skipSeconds : 0;
  const skip = skipFor(rawDuration);

  // Stop the sound when the page is left (pages can stay mounted in the background).
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  /** Moves to the start of the show (just after the intro). */
  const toStart = (audio: HTMLAudioElement) => {
    const s = skipFor(audio.duration);
    audio.currentTime = s;
    setRawTime(s);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime < skipFor(audio.duration)) toStart(audio);
      setBuffering(true);
      audio.play().catch(() => {
        setBuffering(false);
        setFailed(true);
      });
    } else {
      audio.pause();
    }
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
    const target = skipFor(audio.duration) + value;
    audio.currentTime = target;
    setRawTime(target);
  };

  const duration = rawDuration != null && Number.isFinite(rawDuration) ? rawDuration - skip : null;
  const time = Math.max(0, Math.min(rawTime - skip, duration ?? Infinity));
  const known = duration != null && Number.isFinite(duration) && duration > 0;
  const progress = known ? Math.min(100, (time / duration) * 100) : 0;

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
        <p className="alert alert-info mt-5 text-sm" role="status">
          This file can&apos;t be played here. Use the Download button to save it and play it on your computer.
        </p>
      ) : (
        <>
          <div className="mt-6 flex items-baseline justify-between gap-3">
            <span className="display text-3xl tabular-nums" aria-hidden>
              {formatTime(time)}
            </span>
            <span className="text-sm text-mist">
              {known ? (
                <>
                  Length <strong className="tabular-nums text-white">{formatTime(duration)}</strong>
                </>
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
            <input
              type="range"
              min={0}
              max={known ? duration : 0}
              step={1}
              value={Math.min(time, known ? duration : 0)}
              disabled={!known}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Position in the show"
              aria-valuetext={`${formatTime(time)} of ${known ? formatTime(duration) : "unknown length"}`}
              className="absolute inset-x-0 -top-2 h-6 w-full cursor-pointer opacity-0 disabled:cursor-default"
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
          <p className="mt-4 text-xs text-fog">Sound only. Download the file to play the video on your screens.</p>
        </>
      )}

      <audio
        ref={audioRef}
        // The #t= hint lets browsers fetch from the right spot first; the handlers below make sure of it.
        src={skipSeconds > 0 ? `${src}#t=${skipSeconds}` : src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          setRawDuration(audio.duration);
          const s = skipFor(audio.duration);
          if (Math.abs(audio.currentTime - s) > 0.5 && audio.paused) toStart(audio);
        }}
        onDurationChange={(e) => setRawDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          const s = skipFor(audio.duration);
          // Never let the intro play, whatever the browser did.
          if (!audio.paused && audio.currentTime < s - 0.25) {
            audio.currentTime = s;
            return;
          }
          setRawTime(audio.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPause={() => {
          setPlaying(false);
          setBuffering(false);
        }}
        onEnded={(e) => {
          setPlaying(false);
          setBuffering(false);
          toStart(e.currentTarget);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
