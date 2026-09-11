<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Die Bühne, in zwei Fassungen:
//
//   im Gespräch      – das Bild des Klienten groß, das eigene klein oben rechts darin
//   bei Freigabe     – der geteilte Bildschirm groß, daneben rechts beide Videos
//                      untereinander und gleich groß; im Vollbild ohne sie
//
// Bei laufender Freigabe schaut man auf den Inhalt, nicht auf Gesichter; keins der beiden
// Bilder hat dann Vorrang, und das eigene als Einsprengsel im geteilten Bildschirm wäre
// dort im Weg, wo gerade etwas gezeigt wird.
//
// Die Hauptfläche ist eine eigene Kachel im Seitenverhältnis 16:9 mit Rahmen und Schatten,
// nicht die ganze Bühne. Füllte sie alles aus, wäre nicht zu erkennen, wo die Kamera
// aufhört und die Anwendung anfängt – und bei einem anderen Fensterformat wäre sie
// beschnitten.
//
// Ein Bild ist echt, die anderen sind es noch nicht: Das eigene Vorschaubild kommt aus der
// Kamera des Coachs (CallCameraView, POC – der Strom bleibt im Browser). Klient und
// Bildschirmfreigabe bleiben bis B4/B5 die Andeutungen aus CallVideoSim und CallShareSim,
// damit sich beurteilen lässt, wie die Zustände über einem bewegten Bild liegen: wer da
// ist, wer stumm ist, wessen Hintergrund weichgezeichnet wird, ob gerade geteilt wird.
//
// Der Weichzeichner wirkt deshalb nur auf das simulierte Bild. Am eigenen, echten Bild
// bleibt das Abzeichen vorerst eine reine Anzeige: Den Hintergrund allein weichzuzeichnen
// verlangt eine Segmentierung der Person, die mit der LiveKit-Anbindung kommt.

const props = defineProps<{
  call: CallAccessResponse
  camOn: boolean
  /** Die eigene Kamera, sofern sie läuft – siehe useLocalCamera. */
  cameraStream: MediaStream | null
  micOn: boolean
  coachBlur: boolean
  clientBlur: boolean
  sharing: boolean
  clientMuted: boolean
}>()

const emit = defineEmits<{
  'stop-sharing': []
  /** Lage der Bildfläche im Fenster, in px – Abstand nach oben und nach unten. */
  bounds: [{ top: number, bottom: number }]
}>()

// Die Seitenleiste legt ihre Ober- und Unterkante hierauf. Gemeldet wird die Bildfläche –
// die Bühne ohne ihren Rand –, nicht das Bild selbst: Das Bild hält 16:9 und schrumpft in
// hohen Fenstern, die Leiste soll dabei stehen bleiben statt bei jeder Größenänderung mit
// ihm zu wachsen und zu schrumpfen. Es ist die Höhe, die das Bild maximal einnimmt.
const stage = useTemplateRef<HTMLElement>('stage')

onMounted(() => {
  const el = stage.value
  if (!el) return

  const measure = () => {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    emit('bounds', {
      top: rect.top + Number.parseFloat(style.paddingTop),
      bottom: window.innerHeight - rect.bottom + Number.parseFloat(style.paddingBottom),
    })
  }
  measure()

  const observer = new ResizeObserver(measure)
  observer.observe(el)
  window.addEventListener('resize', measure)

  onUnmounted(() => {
    observer.disconnect()
    window.removeEventListener('resize', measure)
  })
})

const initials = computed(() => clientInitials(props.call.clientName))

// Bei einer Freigabe zählt manchmal jeder Pixel – eine Tabelle, ein Plan, ein Formular.
// Dann fallen die beiden Videos weg und mit ihnen die Steuerleiste; der geteilte Bildschirm
// bekommt das ganze Fenster. Weil die Leiste nicht hier liegt, hält CallScreen den Zustand.
const fullscreen = defineModel<boolean>('fullscreen', { required: true })

// Die Spalte bleibt immer im Baum und wächst auf null zusammen, statt zu verschwinden – nur
// so hat sie beim Beginn einer Freigabe eine Breite, aus der heraus sie wachsen kann. inert
// nimmt sie im eingeklappten Zustand aus Tastatur und Vorlesereihenfolge.
const videoColumnOpen = computed(() => props.sharing && !fullscreen.value)

// Namensschild in den kleinen Bildern. Mit eigenem Grund, nicht als bloßer Text: Ein
// Kamerabild ist an dieser Stelle mal hell und mal dunkel, blanke Schrift verschwindet darin.
const TILE_LABEL = 'absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-default/85 backdrop-blur px-1.5 py-0.5 text-[0.625rem] text-toned'
</script>

<template>
  <div ref="stage" class="relative h-full w-full overflow-hidden bg-muted flex items-stretch justify-center p-3 sm:p-5">
    <!-- Die Hauptfläche: im Gespräch der Klient, bei Freigabe der geteilte Bildschirm. -->
    <div class="main flex-1 min-w-0 grid place-items-center">
      <div class="video-tile relative overflow-hidden rounded-xl ring-1 ring-accented bg-elevated shadow-lg">
        <!-- Der Wechsel zwischen Gespräch und Freigabe ist eine Überblendung: Beide
             Fassungen liegen deckungsgleich übereinander und tauschen die Deckkraft. Ein
             harter Schnitt an dieser Stelle liest sich wie ein Verbindungsabbruch. -->
        <Transition name="call-swap">
          <div v-if="sharing" key="share" class="absolute inset-0">
            <CallShareSim />

          <!-- Läuft eine Freigabe, muss das ohne Suchen erkennbar sein: Wer seinen
               Bildschirm teilt, ohne es zu merken, zeigt im Zweifel die Klientenakte des
               Nächsten. -->
          <div class="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-3 px-4 py-2 bg-primary/10 backdrop-blur border-b border-primary/20">
            <UIcon name="i-lucide-monitor-up" class="size-4 text-primary shrink-0" />
            <span class="text-sm text-primary truncate">Du teilst deinen Bildschirm</span>

            <UButton
              icon="i-lucide-monitor-x"
              color="primary"
              size="sm"
              class="shrink-0"
              label="Freigabe beenden"
              @click="$emit('stop-sharing')"
            />
          </div>

          <!-- Größer zeigen: Der Knopf sitzt im Bild, oben rechts, wo man ihn bei einem
               Video sucht – und an derselben Stelle führt er wieder zurück. Er bleibt auch
               im Vollbild sichtbar, denn dort ist er der einzige Weg heraus, solange der
               Zeiger nicht am unteren Rand steht. -->
          <UTooltip :text="fullscreen ? 'Vollbild verlassen' : 'Vollbild – ohne Videos und Steuerleiste'">
            <UButton
              :icon="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              color="neutral"
              variant="subtle"
              size="lg"
              class="absolute top-14 right-3 sm:right-4 z-20 rounded-full size-9 justify-center bg-default/85 backdrop-blur shadow-sm"
              :aria-label="fullscreen ? 'Vollbild verlassen' : 'Freigabe im Vollbild zeigen'"
              :aria-pressed="fullscreen"
              @click="fullscreen = !fullscreen"
            />
          </UTooltip>
          </div>

          <div v-else key="video" class="absolute inset-0">
            <CallVideoSim :blurred="clientBlur" />

          <!-- Name und Zustand des Klienten, unten links wie im Entwurf. -->
          <div class="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2">
            <div class="flex items-center gap-2 rounded-lg border border-default bg-default/85 backdrop-blur px-2.5 py-1.5">
              <span class="size-5 rounded-full bg-primary/10 text-primary text-[0.625rem] font-medium flex items-center justify-center">
                {{ initials }}
              </span>
              <span class="text-xs text-toned">{{ call.clientName }}</span>
            </div>

            <UTooltip v-if="clientMuted" text="Von dir stummgeschaltet">
              <span class="size-7 rounded-full bg-error/10 flex items-center justify-center">
                <UIcon name="i-lucide-mic-off" class="size-3.5 text-error" />
              </span>
            </UTooltip>

            <UBadge
              v-if="clientBlur"
              icon="i-lucide-aperture"
              color="neutral"
              variant="subtle"
              size="sm"
              :label="`Hintergrund von ${call.clientName.split(' ')[0]} weichgezeichnet`"
              class="hidden sm:inline-flex"
            />
          </div>

          <!-- Eigenes Bild. Klein, oben rechts – der Coach soll sich nicht selbst
               anschauen. Die Breite ist ein Anteil des großen Bildes, damit beide zusammen
               schrumpfen. -->
          <div class="absolute right-3 sm:right-4 top-3 sm:top-4 w-[28%] max-w-56 aspect-video rounded-lg overflow-hidden border border-accented bg-elevated shadow-sm">
            <CallCameraView v-if="camOn" :stream="cameraStream" />
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <span class="text-[0.625rem] sm:text-xs text-dimmed">Kamera aus</span>
            </div>

            <span
              v-if="!micOn"
              class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
            >
              <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
            </span>

            <span
              v-if="coachBlur"
              class="absolute top-1.5 left-1.5 size-4 rounded-full bg-primary flex items-center justify-center"
              title="Dein Hintergrund wird weichgezeichnet"
            >
              <UIcon name="i-lucide-aperture" class="size-2.5 text-inverted" />
            </span>

            <span :class="TILE_LABEL">Du</span>
          </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Bei Freigabe: beide Videos rechts, untereinander, in gleicher Größe.
         Im Vollbild fällt die Spalte nicht weg, sondern schmilzt auf null zusammen – und
         die Freigabe wächst im selben Zug in den frei werdenden Platz hinein. Wer sieht,
         wohin etwas geht, muss es nicht suchen, wenn es wiederkommt. Der Abstand steckt
         deshalb als Rand in dieser Spalte und nicht als gap in der Bühne: Er muss
         mitschrumpfen, sonst bliebe eine Lücke stehen.

         inert bekommt undefined statt false: Es ist ein Boolean-Attribut, das Vue nicht als
         solches kennt – an false gebunden landete inert="false" im DOM und wirkte trotzdem. -->
    <div
      class="shrink-0 overflow-hidden flex flex-col justify-center gap-3 sm:gap-4 transition-[width,margin,opacity] duration-[250ms] ease-out motion-reduce:transition-none"
      :class="videoColumnOpen ? 'w-40 sm:w-56 xl:w-72 ms-3 sm:ms-4 opacity-100' : 'w-0 ms-0 opacity-0'"
      :inert="videoColumnOpen ? undefined : true"
    >
      <div class="relative aspect-video rounded-lg overflow-hidden ring-1 ring-accented bg-elevated shadow-sm">
        <CallVideoSim :blurred="clientBlur" />

        <span
          v-if="clientMuted"
          class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
          :title="`${call.clientName.split(' ')[0]} ist stummgeschaltet`"
        >
          <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
        </span>

        <span :class="TILE_LABEL">{{ call.clientName }}</span>
      </div>

      <div class="relative aspect-video rounded-lg overflow-hidden ring-1 ring-accented bg-elevated shadow-sm">
        <CallCameraView v-if="camOn" :stream="cameraStream" />
        <div v-else class="absolute inset-0 flex items-center justify-center">
          <span class="text-[0.625rem] sm:text-xs text-dimmed">Kamera aus</span>
        </div>

        <span
          v-if="!micOn"
          class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
        >
          <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
        </span>

        <span
          v-if="coachBlur"
          class="absolute top-1.5 left-1.5 size-4 rounded-full bg-primary flex items-center justify-center"
          title="Dein Hintergrund wird weichgezeichnet"
        >
          <UIcon name="i-lucide-aperture" class="size-2.5 text-inverted" />
        </span>

        <span :class="TILE_LABEL">Du</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Die Hauptfläche soll so groß wie möglich sein und dabei 16:9 behalten – mal begrenzt sie
   die Breite, mal die Höhe. Mit "width: min(...)" folgt die Breite der verfügbaren Höhe,
   solange sie nicht breiter wird als der Platz daneben; die Höhe ergibt sich aus dem
   Seitenverhältnis. container-type: size macht diese Höhe als cqh verfügbar. */
.main {
  container-type: size;
}

/* Die Überblendung zwischen Gespräch und Freigabe. Beide Fassungen füllen die Kachel und
   liegen währenddessen übereinander; die ausgehende nimmt keine Klicks mehr an. */
.call-swap-enter-active,
.call-swap-leave-active {
  transition: opacity 220ms var(--ease-out, ease-out);
}

.call-swap-leave-active {
  pointer-events: none;
}

.call-swap-enter-from,
.call-swap-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .call-swap-enter-active,
  .call-swap-leave-active {
    transition: none;
  }
}

/* Bewusst ohne eigene Transition: Die Breite folgt aus dem Platz, den die Videospalte und
   das Polster der Steuerleiste freigeben – und die beiden bewegen sich bereits weich. Eine
   zweite Transition darüber liefe einem bewegten Ziel hinterher, käme verspätet an und
   hinkte beim Ziehen am Fensterrand mit. */
.video-tile {
  aspect-ratio: 16 / 9;
  width: min(100%, calc(100cqh * 16 / 9));
}
</style>
