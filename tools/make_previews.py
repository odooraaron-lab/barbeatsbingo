#!/usr/bin/env python3
"""
Make small MP3 previews of your show videos for the Bar Beats Bingo website.

The website's player streams the show's sound. Streaming it from a full video
means downloading the whole video (picture and sound are woven together), which
is slow. A 128 kbps MP3 of the same show is around 30 times smaller.

HOW TO USE (Windows)
  1. Install ffmpeg once, the easy way:      pip install imageio-ffmpeg
  2. Drag your library folder onto this file, or run:
         python make_previews.py "D:\\Bar Beats Bingo\\Shows"
  3. It lists the videos it found and asks before converting.

For every video, it writes "<video name> - Preview.mp3" in the same folder.
Videos that already have an up-to-date preview are skipped, so run it again
whenever you add shows. The preview keeps the whole show, intro included: the
website skips the intro itself, so the timings still match your call lists.

OPTIONS
  --only "Play Now"   only convert videos whose name contains this text
                      (use this if the folder also holds individual music videos)
  --bitrate 128       MP3 quality in kbps (96, 128, 160 or 192). 128 is plenty.
  --dry-run           list what would be converted, without converting
  --yes               don't ask before converting
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time

VIDEO_EXTENSIONS = {".mp4", ".m4v", ".mov", ".mkv", ".avi", ".wmv", ".webm"}
SUFFIX = " - Preview.mp3"


def find_ffmpeg() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit in ("B", "KB") else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


def find_videos(root: str, only: str | None) -> list[str]:
    videos = []
    for folder, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for name in sorted(files):
            if name.startswith("."):
                continue
            if os.path.splitext(name)[1].lower() not in VIDEO_EXTENSIONS:
                continue
            if only and only.lower() not in name.lower():
                continue
            videos.append(os.path.join(folder, name))
    return videos


def preview_path(video: str) -> str:
    return os.path.splitext(video)[0] + SUFFIX


def is_up_to_date(video: str) -> bool:
    out = preview_path(video)
    return os.path.exists(out) and os.path.getsize(out) > 0 and os.path.getmtime(out) >= os.path.getmtime(video)


def convert(ffmpeg: str, video: str, bitrate: int) -> tuple[bool, str]:
    out = preview_path(video)
    partial = out[: -len(".mp3")] + ".partial.mp3"
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-i", video,
        "-map", "0:a:0",  # the first sound track
        "-vn",
        "-c:a", "libmp3lame", "-b:a", f"{bitrate}k", "-ac", "2",
        partial,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(partial) or os.path.getsize(partial) == 0:
        if os.path.exists(partial):
            os.remove(partial)
        message = (result.stderr or "").strip().splitlines()
        reason = message[-1] if message else "ffmpeg couldn't read this file"
        if "matches no streams" in (result.stderr or ""):
            reason = "this video has no sound track"
        return False, reason
    os.replace(partial, out)
    return True, out


def pause_before_closing() -> None:
    # When the folder is dragged onto the script in Windows, keep the window open to read the result.
    if os.name == "nt":
        try:
            input("\nPress Enter to close...")
        except EOFError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Make small MP3 previews of show videos.")
    parser.add_argument("folder", nargs="?", help="your library folder")
    parser.add_argument("--only", help='only videos whose name contains this text, e.g. "Play Now"')
    parser.add_argument("--bitrate", type=int, default=128, choices=[96, 128, 160, 192])
    parser.add_argument("--dry-run", action="store_true", help="list what would be converted")
    parser.add_argument("--yes", action="store_true", help="don't ask before converting")
    args = parser.parse_args()

    folder = args.folder
    if not folder:
        folder = input("Drag your library folder into this window, then press Enter:\n> ").strip().strip('"')
    if not os.path.isdir(folder):
        print(f"Can't find the folder: {folder}")
        pause_before_closing()
        return 1

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print("ffmpeg isn't installed. The easiest way to get it is to run:\n\n    pip install imageio-ffmpeg\n")
        print("then run this script again.")
        pause_before_closing()
        return 1

    videos = find_videos(folder, args.only)
    todo = [v for v in videos if not is_up_to_date(v)]
    done_already = len(videos) - len(todo)

    print(f"Found {len(videos)} video(s) in {folder}" + (f' with "{args.only}" in the name' if args.only else ""))
    if done_already:
        print(f"{done_already} already have an up-to-date preview and will be skipped.")
    if not todo:
        print("Nothing to do.")
        pause_before_closing()
        return 0

    total = sum(os.path.getsize(v) for v in todo)
    print(f"{len(todo)} to convert ({human_size(total)} of video):")
    for v in todo[:15]:
        print(f"  {os.path.relpath(v, folder)}")
    if len(todo) > 15:
        print(f"  ...and {len(todo) - 15} more")

    if args.dry_run:
        return 0
    if not args.yes:
        answer = input(f"\nConvert these {len(todo)} video(s)? [y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            print("Stopped. Nothing was changed.")
            pause_before_closing()
            return 0

    ok = failed = 0
    started = time.time()
    for i, video in enumerate(todo, 1):
        name = os.path.relpath(video, folder)
        print(f"[{i}/{len(todo)}] {name} ... ", end="", flush=True)
        success, detail = convert(ffmpeg, video, args.bitrate)
        if success:
            ok += 1
            print(f"{human_size(os.path.getsize(detail))} (video was {human_size(os.path.getsize(video))})")
        else:
            failed += 1
            print(f"FAILED: {detail}")

    minutes = (time.time() - started) / 60
    print(f"\nDone in {minutes:.1f} min: {ok} made" + (f", {failed} failed" if failed else "") + ".")
    if ok:
        print('Next: share each "... - Preview.mp3" in WorkDrive and paste the link into the show\'s')
        print('"MP3 for the player" box in the website admin.')
    pause_before_closing()
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
