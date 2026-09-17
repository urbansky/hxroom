<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed, onUnmounted, ref, watch } from 'vue'

// Pegelanzeige für das eigene Mikrofon: fünf Balken, die beim Sprechen ausschlagen.
//
// Wer im Warteraum ein Mikrofon auswählt, will wissen, ob es das richtige ist – ein Name in
// einer Liste sagt das nicht, ein Ausschlag schon. Gemessen wird hier im Browser über die Web
// Audio API und nicht über LiveKit: Vor dem Beitritt gibt es keinen Raum, der einen Pegel
// meldet, und die Oberfläche bleibt so frei von der Mechanik (sie bekommt nur einen
// MediaStream).
//
// Ohne Strom – Mikrofon aus – stehen die Balken im Ruhezustand.

const props = withDefaults(defineProps<{
  stream: MediaStream | null
  bars?: number
}>(), { bars: 5 })

/** 0 bis 1. */
const level = ref(0)

let context: AudioContext | undefined
let source: MediaStreamAudioSourceNode | undefined
let frame = 0

// Leiser als -60 dB ist Stille, lauter als -10 dB ist Rufen. Dazwischen verteilen sich die
// Balken gleichmäßig in Dezibel – linear gemessen schlüge nur beim Rufen etwas aus.
const FLOOR_DB = -60
const CEILING_DB = -10
// Die Anzeige fällt langsamer, als sie steigt: Sprache besteht aus kurzen Spitzen, und ohne
// Nachlauf flackerten die Balken, statt zu zeigen, dass gesprochen wird.
const DECAY = 0.85
// Rund 20 Messungen je Sekunde genügen dem Auge; jedes Bild wäre nur Rechenzeit.
const INTERVAL_MS = 50

function start(stream: MediaStream) {
  context = new AudioContext()
  source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  // Der Klick auf „einrichten" ist die Nutzergeste, die der Browser dafür verlangt – der
  // Kontext entsteht aber erst, wenn die Freigabe durch ist, und kann dann schlafend beginnen.
  if (context.state === 'suspended') void context.resume()

  const samples = new Float32Array(analyser.fftSize)
  let last = 0
  const tick = (time: number) => {
    frame = requestAnimationFrame(tick)
    if (time - last < INTERVAL_MS) return
    last = time

    analyser.getFloatTimeDomainData(samples)
    let sum = 0
    for (const sample of samples) sum += sample * sample
    const rms = Math.sqrt(sum / samples.length)
    const db = rms > 0 ? 20 * Math.log10(rms) : FLOOR_DB
    const measured = Math.min(1, Math.max(0, (db - FLOOR_DB) / (CEILING_DB - FLOOR_DB)))
    level.value = Math.max(measured, level.value * DECAY)
  }
  frame = requestAnimationFrame(tick)
}

function stop() {
  cancelAnimationFrame(frame)
  source?.disconnect()
  source = undefined
  void context?.close()
  context = undefined
  level.value = 0
}

// Ein Gerätewechsel bringt einen neuen Strom – gemessen wird dann der neue.
watch(() => props.stream, (stream) => {
  stop()
  if (stream?.getAudioTracks().length) start(stream)
}, { immediate: true })

onUnmounted(stop)

const lit = computed(() => Math.round(level.value * props.bars))
</script>

<template>
  <div
    class="flex items-end gap-0.5 h-4"
    role="meter"
    aria-label="Mikrofonpegel"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(level * 100)"
  >
    <span
      v-for="bar in bars"
      :key="bar"
      class="w-1 rounded-full transition-colors duration-75"
      :class="stream && bar <= lit ? 'bg-primary' : 'bg-accented'"
      :style="{ height: `${40 + (60 * bar) / bars}%` }"
    />
  </div>
</template>
