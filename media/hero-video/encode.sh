#!/usr/bin/env bash
# Rendert den Hero-Loop und kodiert ihn für die Landing-Page:
# MP4 (H.264, spielt jeder Browser) in 1440×900, dazu das Poster aus Bild 0. Eine WebM-Fassung (VP9)
# lohnt sich bei dieser flächigen Grafik nicht: Sie war größer als die MP4 und dabei unschärfer.
# Aufruf aus media/hero-video/:  ./encode.sh
set -euo pipefail

cd "$(dirname "$0")"
OUT=../../apps/landing/public/video
NAME=hxroom-buchung-bis-videocall
SCALE="scale=1440:900:flags=lanczos"

mkdir -p renders "$OUT"
HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -q delivery --crf 10 -o renders/master.mp4

# H.264: yuv420p und faststart, damit Safari/iOS abspielen und der Start nicht aufs Dateiende wartet.
ffmpeg -loglevel error -y -i renders/master.mp4 -an -vf "$SCALE" \
  -c:v libx264 -preset veryslow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "$OUT/$NAME.mp4"

# Poster = erstes Bild. Es ist zugleich das letzte (nahtlose Schleife) und das Standbild bei reduzierter Bewegung.
ffmpeg -loglevel error -y -i renders/master.mp4 -frames:v 1 -vf "$SCALE" \
  -c:v libwebp -quality 82 "$OUT/$NAME-poster.webp"

ls -l "$OUT"
