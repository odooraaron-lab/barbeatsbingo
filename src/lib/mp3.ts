/**
 * Works out an MP3's playing time from its first few KB and its total size,
 * so the length can be shown before the browser loads any audio.
 *
 * Uses the Xing/Info header that encoders such as LAME (and ffmpeg) write into
 * the first frame; falls back to size ÷ bitrate for constant-bitrate files.
 */

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

/** Size of the ID3v2 tag at the start of the file (0 if there isn't one). */
export function id3Size(head: Uint8Array): number {
  if (head.length < 10 || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return 0; // "ID3"
  const size = ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
  const footer = head[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

type Frame = { version: number; bitrate: number; sampleRate: number; samplesPerFrame: number; mono: boolean };

function readFrameHeader(b: Uint8Array, i: number): Frame | null {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const version = (b[i + 1] >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layer = (b[i + 1] >> 1) & 0x03; // 1 = Layer III
  const bitrateIndex = b[i + 2] >> 4;
  const rateIndex = (b[i + 2] >> 2) & 0x03;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const bitrate = (version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][rateIndex];
  return { version, bitrate, sampleRate, samplesPerFrame: version === 3 ? 1152 : 576, mono: b[i + 3] >> 6 === 3 };
}

/**
 * `bytes` should start at the beginning of the audio (just after any ID3 tag);
 * `audioBytes` is the size of the file from that point on.
 */
export function mp3Duration(bytes: Uint8Array, audioBytes: number): number | null {
  // The first frame normally starts right away; allow for a little padding.
  let at = -1;
  let frame: Frame | null = null;
  for (let i = 0; i < Math.min(bytes.length - 4, 4096); i++) {
    frame = readFrameHeader(bytes, i);
    if (frame) {
      at = i;
      break;
    }
  }
  if (!frame || at < 0) return null;

  const sideInfo = frame.version === 3 ? (frame.mono ? 17 : 32) : frame.mono ? 9 : 17;
  const tagAt = at + 4 + sideInfo;
  const tag = String.fromCharCode(...bytes.subarray(tagAt, tagAt + 4));
  if ((tag === "Xing" || tag === "Info") && tagAt + 12 <= bytes.length) {
    const flags = (bytes[tagAt + 4] << 24) | (bytes[tagAt + 5] << 16) | (bytes[tagAt + 6] << 8) | bytes[tagAt + 7];
    if (flags & 0x1) {
      const frames =
        ((bytes[tagAt + 8] << 24) >>> 0) + (bytes[tagAt + 9] << 16) + (bytes[tagAt + 10] << 8) + bytes[tagAt + 11];
      if (frames > 0) return (frames * frame.samplesPerFrame) / frame.sampleRate;
    }
  }
  // A Xing header without a frame count means variable bitrate, so size ÷ bitrate would be a guess.
  if (tag === "Xing") return null;
  const seconds = ((audioBytes - at) * 8) / frame.bitrate;
  return seconds > 0 ? seconds : null;
}
