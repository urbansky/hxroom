# Segmentierungsmodell für den Weichzeichner

`selfie_segmenter.tflite` – MediaPipe Selfie Segmenter (float16), das Modell, das
`@livekit/track-processors` sonst zur Laufzeit von Google lädt. Hier abgelegt, damit der
Browser des Klienten keinen Drittanbieter anspricht (`doc/technisches-konzept.md` §17);
ausgeliefert über `mediapipeAssets()` in `packages/livekit/vite.ts`.

- Quelle: `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite` (Stand 2026-09-28, Datei vom 2023-05-07)
- Größe: 249 537 Byte
- SHA-256: `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b`
- Lizenz: Apache 2.0, laut [Model Card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf)

Die WASM-Dateien liegen nicht hier: Sie kommen aus `node_modules/@mediapipe/tasks-vision/wasm`
in genau der Version, die `@livekit/track-processors` mitbringt.
