/**
 * Keeping a game of a show in step across a customer's devices (say a laptop playing
 * the sound and a phone checking cards): one device plays the sound, the others follow
 * it, and any of them can pause it, move it on or set the songs played.
 */

/** Where the game is up to, as last changed by one of the devices. */
export type SyncState = {
  /** Seconds into the show's file at the moment of the change. */
  time: number;
  playing: boolean;
  /** The device the sound plays on, or null if none has played it yet. */
  sound: string | null;
  /** True when the device with the sound is showing the video too (not just the sound). */
  video?: boolean;
  /** Songs played, as set by hand; null follows the player. */
  played: number | null;
  /** The device that made the change. */
  by: string;
  /** When the change reached the server, in ms. */
  at: number;
};

/**
 * How long the sound's device counts as still there without being heard from. While it
 * plays it checks in every 5 seconds once another device has joined in, every 15 before.
 */
const ALIVE_PLAYING_MS = 45_000;
const ALIVE_PAUSED_MS = 150_000;

/** Where the show is (seconds into the file), given the server's clock now. */
export function positionAt(state: SyncState, serverNow: number) {
  return state.playing ? state.time + Math.max(0, serverNow - state.at) / 1000 : state.time;
}

/** Whether the device with the sound is still there. */
export function soundAlive(state: SyncState, serverNow: number) {
  return !!state.sound && serverNow - state.at < (state.playing ? ALIVE_PLAYING_MS : ALIVE_PAUSED_MS);
}
