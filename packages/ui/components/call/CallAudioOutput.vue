<script setup lang="ts">
// Der Ton der Gegenseite. Ohne Bild, ohne Bedienelemente – ein <audio>, das spielt.
//
// Getrennt vom Video und nicht in einem gemeinsamen Stream: Das <video> der Selbstansicht
// muss `muted` tragen, sonst lässt kein Browser es von selbst anlaufen. Lägen Bild und Ton
// in derselben Spur, nähme dieses Attribut auch der Gegenstelle den Ton – und man sitzt in
// einem stummen Gespräch, ohne zu wissen, warum.
//
// Ein eigenes Element pro Spur, statt alle in eines zu mischen: Die Bildschirmfreigabe
// bringt ihren eigenen Ton mit, und im Mehrteilnehmer-Fall wächst das mit.

// Vue-APIs explizit – siehe die Anmerkung in CallCameraView.vue.
import { onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  stream: MediaStream | null
  /**
   * Nur auf dieser Seite still – für „Klient stummschalten" beim Coach. Wird der Gegenseite
   * nie gemeldet und berührt ihre Spur nicht; gedacht für technische Notfälle wie eine
   * Rückkopplung (siehe CallPeer.mutedLocally).
   */
  muted?: boolean
}>()

/**
 * Ob der Browser die Wiedergabe verweigert hat.
 *
 * Autoplay mit Ton ist nur erlaubt, wenn der Nutzer auf der Seite schon etwas getan hat.
 * Im Regelfall ist das erfüllt – in den Warteraum kommt niemand ohne Klick. Bleibt es doch
 * hängen, muss die Oberfläche es sagen können: Ein stummes Gespräch, in dem beide reden,
 * ist der ärgerlichste Fehler dieses Produkts.
 */
const blocked = ref(false)

const audio = useTemplateRef<HTMLAudioElement>('audio')

watchEffect(() => {
  const el = audio.value
  if (el && el.srcObject !== props.stream) el.srcObject = props.stream
})

/**
 * Noch ein Versuch, den Ton zu starten. Nach einer Nutzergeste gibt der Browser die
 * Wiedergabe frei – vorher hilft kein Zureden.
 */
async function resume() {
  const el = audio.value
  if (!el || !props.stream) return
  try {
    await el.play()
    blocked.value = false
  }
  catch {
    blocked.value = el.paused
  }
}

defineExpose({ blocked, resume })

// `autoplay` allein genügt nicht: Der Browser meldet die Verweigerung nur über die Promise
// von play(). Ohne diesen Aufruf bliebe es still und niemand erfährt es.
//
// Umgekehrt ist ein abgelehntes play() noch kein Beweis für Stille: `autoplay` kann die
// Wiedergabe kurz danach doch starten. Deshalb entscheidet nicht die Promise allein,
// sondern der Zustand des Elements – und das `playing`-Ereignis unten räumt die Meldung
// wieder ab. Sonst läse der Klient „Kein Ton", während er längst hört.
watch([audio, () => props.stream], () => { void resume() }, { immediate: true })

// Die Meldung verspricht, ein Klick auf die Seite gebe den Ton frei – also muss ein Klick
// das auch tun. Ohne diesen zweiten Anlauf bliebe der Hinweis stehen, solange das Gespräch
// dauert: Der Browser startet von sich aus nichts nach, und das Element wird nie erneut
// angefasst. Gehorcht wird der ersten Geste, danach ist der Horchposten wieder frei.
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

function onGesture() {
  void resume()
}

function listenForGesture(on: boolean) {
  if (typeof document === 'undefined') return
  for (const type of GESTURES) {
    if (on) document.addEventListener(type, onGesture, { passive: true })
    else document.removeEventListener(type, onGesture)
  }
}

watch(blocked, listenForGesture)

onUnmounted(() => {
  listenForGesture(false)
  if (audio.value) audio.value.srcObject = null
})
</script>

<template>
  <!-- v-show statt v-if, wie beim Video: Das Element muss stehen, bevor der Strom da ist. -->
  <audio
    v-show="stream"
    ref="audio"
    autoplay
    playsinline
    :muted="muted"
    @playing="blocked = false"
    @pause="blocked = !!stream"
  />
</template>
