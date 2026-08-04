"""
Optimize assets/videos/mono_video.mp4 for web playback.

The original is 720p, ~12 Mbps, 14.8 MB for a 10-second clip.
This re-encodes it to H.264 (~1.5-2 Mbps, faststart, 540p max, no audio)
so that decoding is light and the file loads fast inside the activity.

The original file is backed up as mono_video.original.mp4.
"""
import os
import shutil
import subprocess
import sys

import imageio_ffmpeg

BASE = os.path.dirname(os.path.abspath(__file__))
VIDEO_DIR = os.path.join(BASE, "assets", "videos")
SRC = os.path.join(VIDEO_DIR, "mono_video.mp4")
BAK = os.path.join(VIDEO_DIR, "mono_video.original.mp4")
DST = os.path.join(VIDEO_DIR, "mono_video.optimized.mp4")


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Source video not found: {SRC}")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    print("ffmpeg binary:", ffmpeg)
    print("Source size :", f"{os.path.getsize(SRC) / 1024 / 1024:.2f} MB")

    probe = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", SRC],
        capture_output=True,
        text=True,
    )
    print("--- probe stderr (stream info) ---")
    for line in probe.stderr.splitlines():
        if any(k in line.lower() for k in ("stream", "duration", "video:", "audio:")):
            print(line)

    # Re-encode: H.264, 540p max height, ~1.8 Mbps, faststart for streaming,
    # no audio (the video is shown paused and plays without sound),
    # yuv420p for browser compat.
    cmd = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", SRC,
        "-an",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-maxrate", "2000k",
        "-bufsize", "4000k",
        "-vf", "scale=-2:min(540\\,ih)",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-profile:v", "high",
        "-level", "4.0",
        DST,
    ]
    print("\nEncoding...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"Encoding failed:\n{result.stderr}")

    if not os.path.exists(DST):
        sys.exit("Output file was not created")

    new_size = os.path.getsize(DST) / 1024 / 1024
    print("Output size :", f"{new_size:.2f} MB")

    # Keep a backup of the original if we don't have one yet
    if not os.path.exists(BAK):
        shutil.copy2(SRC, BAK)
        print("Backup saved:", os.path.basename(BAK))

    # Replace the working file with the optimized version
    shutil.move(DST, SRC)
    print("Replaced video with optimized version.")
    print("Original backup retained at:", os.path.basename(BAK))


if __name__ == "__main__":
    main()

