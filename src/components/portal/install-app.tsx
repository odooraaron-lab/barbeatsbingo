"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bbb-install-dismissed";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPads report themselves as Macs, but have touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return /Android/.test(ua) ? "android" : "desktop";
}

const noop = () => () => {};
const standaloneQuery = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(standaloneQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function isStandalone() {
  return window.matchMedia(standaloneQuery).matches || (navigator as { standalone?: boolean }).standalone === true;
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Helps customers put the portal on their phone's home screen.
 * `banner` is a small, dismissible prompt for phones; `panel` always explains how (account page).
 */
export function InstallApp({ variant }: { variant: "banner" | "panel" }) {
  const platform = useSyncExternalStore<Platform | null>(noop, detectPlatform, () => null);
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => true);
  const storedDismissed = useSyncExternalStore(noop, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser's mini bar
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private browsing: it just shows again next time */
    }
  };

  if (!platform) return null;
  const done = standalone || installed;

  if (variant === "banner") {
    // Only on phones, only until it's installed or waved away.
    if (done || dismissed || storedDismissed || platform === "desktop") return null;
    if (platform === "android" && !prompt) return null;
  }

  const howTo =
    platform === "ios" ? (
      <p className="text-sm text-mist">
        In Safari, tap <Share size={15} aria-hidden className="inline -translate-y-px text-white" />{" "}
        <strong className="text-white">Share</strong> (on newer iPhones it&apos;s in the ••• menu), then{" "}
        <SquarePlus size={15} aria-hidden className="inline -translate-y-px text-white" />{" "}
        <strong className="text-white">Add to Home Screen</strong>.
      </p>
    ) : prompt ? (
      <p className="text-sm text-mist">It opens straight into your library, full screen, like any other app.</p>
    ) : platform === "android" ? (
      <p className="text-sm text-mist">
        Open your browser&apos;s menu (⋮), then choose <strong className="text-white">Install app</strong> or{" "}
        <strong className="text-white">Add to Home screen</strong>.
      </p>
    ) : (
      <p className="text-sm text-mist">
        On your phone, open this page and add it to your home screen. In Chrome or Edge on a computer, use the install
        icon in the address bar.
      </p>
    );

  if (variant === "panel") {
    return (
      <section className="panel p-6 sm:p-8" aria-labelledby="install-heading">
        <h2 id="install-heading" className="font-sans text-xl font-bold">
          Use it like an app
        </h2>
        {done ? (
          <p className="mt-2 text-sm text-mist">You&apos;re using the app. It opens straight into your library.</p>
        ) : (
          <div className="mt-2 grid gap-4">
            <p className="text-mist">Put Bar Beats Bingo on your home screen to open your shows in one tap.</p>
            {howTo}
            {prompt && (
              <div>
                <button type="button" onClick={install} className="btn btn-red">
                  <Download size={17} aria-hidden /> Install the app
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <aside
      className="relative mt-6 flex items-start gap-4 rounded-2xl border border-line bg-coal p-4 pr-12"
      aria-label="Install the app"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="grid gap-1">
        <p className="font-semibold">Add Bar Beats Bingo to your home screen</p>
        {howTo}
        {prompt && (
          <div className="mt-2">
            <button type="button" onClick={install} className="btn btn-red btn-sm">
              <Download size={16} aria-hidden /> Install
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-fog hover:bg-white/5 hover:text-white"
        aria-label="Not now"
      >
        <X size={18} aria-hidden />
      </button>
    </aside>
  );
}
