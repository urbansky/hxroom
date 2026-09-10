<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Schaufenster für die Call-Oberfläche (doc/poc/videocall-v2.html, Screen 3).
//
// Zweck ist allein die Beurteilung des Entwurfs: Der Screen hängt an erfundenen Daten, und
// die Leiste am unteren Rand setzt Zustände, die im echten Ablauf von außen kommen –
// Verbindungsabbruch, eingehende Nachricht, Bildschirmfreigabe. Ohne sie wäre etwa der
// Reconnect-Zustand lokal gar nicht zu sehen.
//
// Der Zugang liegt wie das übrige Backoffice hinter der Anmeldung.
definePageMeta({ middleware: 'auth', layout: 'call' })

const START = new Date(Date.now() - 12 * 60_000)
const END = new Date(START.getTime() + 60 * 60_000)

const call: CallAccessResponse = {
  bookingId: 'prototype',
  state: 'admitted',
  start: START.toISOString(),
  end: END.toISOString(),
  offerName: 'Einzelcoaching',
  offerId: null,
  coachName: 'Anna Bergmann Coaching',
  clientName: 'Markus Kellner',
  opensAt: new Date(START.getTime() - 60 * 60_000).toISOString(),
  closesAt: new Date(END.getTime() + 120 * 60_000).toISOString(),
  waitingSince: new Date(START.getTime() - 4 * 60_000).toISOString(),
  admittedAt: START.toISOString(),
  clientOnline: true,
  livekit: null,
}

// Eigener Sekundentakt statt useCallState – der Prototyp soll keine API anfragen.
const now = ref(new Date())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => { ticker = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(ticker))

const screen = useTemplateRef('screen')
const toast = useToast()

const SAMPLE_INCOMING = [
  'Ton ist bei mir gerade komisch – kannst du mich noch hören?',
  'Kannst du mir den Fragebogen nochmal schicken?',
  'Einen Moment, ich schließe kurz das Fenster.',
]
let incomingIndex = 0

function toggleConnection() {
  if (!screen.value) return
  screen.value.connection = screen.value.connection === 'live' ? 'reconnecting' : 'live'
}

function sendIncoming() {
  screen.value?.receiveChatMessage(SAMPLE_INCOMING[incomingIndex % SAMPLE_INCOMING.length]!)
  incomingIndex++
}

function toggleClientBlur() {
  if (!screen.value) return
  screen.value.clientBlur = !screen.value.clientBlur
}

function onEnd() {
  toast.add({
    title: 'Sitzung beendet',
    description: 'Im Prototyp passiert hier nichts weiter.',
    icon: 'i-lucide-check',
    color: 'success',
  })
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 min-h-0">
      <CallScreen ref="screen" :call="call" :now="now" @end="onEnd" />
    </div>

    <!-- Entwicklerwerkzeug, bewusst als solches erkennbar und nicht Teil des Entwurfs. -->
    <div class="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-t border-default bg-elevated">
      <span class="text-xs text-dimmed uppercase tracking-wider mr-1">Prototyp</span>
      <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-wifi-off" label="Verbindung" @click="toggleConnection" />
      <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-message-square" label="Nachricht" @click="sendIncoming" />
      <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-aperture" label="Blur Klient" @click="toggleClientBlur" />
      <span class="text-xs text-dimmed ml-auto hidden sm:block">
        Mikrofon, Kamera, Teilen und Stummschalten stehen in der Leiste darüber.
      </span>
    </div>
  </div>
</template>
