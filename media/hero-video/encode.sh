#!/usr/bin/env bash
# Rendert beide Fassungen des Hero-Loops und kodiert sie für die Landing-Page:
#   index.html  → 16:10, 1440×900  (ab 640 px Breite)
#   mobile.html → 4:5,   1080×1350 (Handy)
# Je Fassung eine MP4 (H.264, spielt jeder Browser) und das Poster aus Bild 0. Eine WebM-Fassung (VP9)
# lohnt sich bei dieser flächigen Grafik nicht: Sie war größer als die MP4 und dabei unschärfer.
# Aufruf aus media/hero-video/:  ./encode.sh
set -euo pipefail

cd "$(dirname "$0")"
OUT=../../apps/landing/public/video
NAME=hxroom-buchung-bis-videocall
mkdir -p renders "$OUT"

# encode <Komposition> <Dateizusatz> <Zielgröße>
encode() {
  local master="renders/master$2.mp4"
  local scale="scale=$3:flags=lanczos"
  HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes render -c "$1" -q delivery --crf 10 -o "$master"

  # yuv420p und faststart, damit Safari/iOS abspielen und der Start nicht aufs Dateiende wartet.
  ffmpeg -loglevel error -y -i "$master" -an -vf "$scale" \
    -c:v libx264 -preset veryslow -crf 26 -profile:v high -pix_fmt yuv420p -movflags +faststart \
    "$OUT/$NAME$2.mp4"

  # Poster = erstes Bild. Es ist zugleich das letzte (nahtlose Schleife) und das Standbild bei reduzierter Bewegung.
  ffmpeg -loglevel error -y -i "$master" -frames:v 1 -vf "$scale" \
    -c:v libwebp -quality 82 "$OUT/$NAME$2-poster.webp"
}

encode index.html "" 1440:900
encode mobile.html "-mobil" 1080:1350

ls -l "$OUT"
