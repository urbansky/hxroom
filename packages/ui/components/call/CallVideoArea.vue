<script setup lang="ts">
// Vue-APIs und Geschwisterkomponenten stehen hier explizit, ohne Auto-Import: Für eine
// Datei in einem Workspace-Paket trägt der nur, solange die pnpm-Symlinks auf Pfade ohne
// node_modules zeigen. Die U-Komponenten bleiben dagegen bewusst beim Resolver – ein
// direkter Import aus @nuxt/ui zöge von hier aus eine zweite Kopie der Bibliothek herein.
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { firstName, initials } from '@hxroom/shared'
import CallCameraView from './CallCameraView.vue'
import type { CallPeer } from './types'

// Die Bühne, in zwei Fassungen:
//
//   im Gespräch      – das Bild des Gegenübers groß, das eigene klein oben rechts darin
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
// beschnitten. Bei einer Freigabe übernimmt die Kachel das Seitenverhältnis des geteilten
// Bildes: Ein Ultrawide-Monitor in einer 16:9-Kachel ließe oben und unten breite Leerflächen
// und bliebe kleiner, als das Fenster hergibt.
//
// Rollenfrei: Es gibt „local" und „remote". Wer davon der Coach ist und wer der Klient,
// weiß nur die App, die die Bühne einbindet – für die Bühne ist es dieselbe Fläche.
//
// Seit B5 sind beide Bilder echt: Sie kommen als MediaStream aus dem LiveKit-Raum
// (CallCameraView). Kommt vom Gegenüber keines, zeigt die Bühne eine neutrale Kachel mit
// Initialen und einem Satz – nie ein angedeutetes Bild. Im Prototyp stand hier eine
// Silhouette; im echten Gespräch täuschte sie vor, jemand sei im Bild.
//
// Die Bildschirmfreigabe kommt als eigener Strom (`shareStream`) und steht, solange sie läuft,
// groß auf der Bühne – eingepasst statt angeschnitten, weil die Ränder eines Bildschirms
// Menüleisten und Text sind. Die Kameras beider Seiten rücken in die Spalte daneben.

const props = defineProps<{
  /** Man selbst. Der Name wird nicht gezeigt – im eigenen Bild steht „Du". */
  local: CallPeer
  /** Das Gegenüber, oder null, solange niemand sonst da ist. */
  remote: CallPeer | null
  /** Wer gerade teilt – Teilnehmer-ID oder null. Daraus folgen beide Beschriftungen. */
  sharingBy?: string | null
  /** Das Bild der laufenden Freigabe – von welcher Seite auch immer. */
  shareStream?: MediaStream | null
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

// Die Selbstansicht schwebt nur beim Betreten des Calls herein, nicht jedes Mal, wenn sie
// neu entsteht: Sie liegt im Zweig „Gespräch" der Überblendung und wird deshalb nach
// jeder Bildschirmfreigabe neu gemountet. Ohne dieses Flag käme sie dann ein zweites Mal
// verzögert angeflogen, während die Überblendung längst fertig ist.
const entering = ref(true)

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

const remoteInitials = computed(() => initials(props.remote?.name ?? ''))
const remoteShort = computed(() => firstName(props.remote?.name ?? '', 'Dein Gegenüber'))

// Was statt eines Bildes steht. Drei Lagen, die sich für den Wartenden unterschiedlich
// anfühlen: Ist die Kamera aus, kommt kein Bild mehr; verbindet sich die Gegenseite zum
// ersten Mal, kommt es gleich; war sie schon da und ist jetzt weg, ist offen, wann sie
// zurückkommt (B6). Wer das eine für das andere hält, wartet vergeblich oder fragt nach.
const remoteAway = computed(() => props.remote?.presence === 'away' || props.remote?.presence === 'unknown')
const remotePlaceholder = computed(() => {
  // Die eigene Verbindung fehlt: Über das Gegenüber lässt sich nichts sagen – den Grund
  // nennt der Hinweis über der Bühne.
  if (props.remote?.presence === 'unknown') return ''
  if (remoteAway.value) return `${remoteShort.value} ist gerade nicht verbunden`
  if (props.remote && props.remote.presence !== 'connecting' && !props.remote.cameraOn) return 'Kamera aus'
  return `${remoteShort.value} verbindet sich …`
})

// Ob geteilt wird, und von wem. Beides folgt aus einer Angabe: Wer selbst teilt, sieht den
// Hinweis in der ersten Person und darf die Freigabe beenden; wer zusieht, nicht.
const sharing = computed(() => props.sharingBy != null)
const sharingIsLocal = computed(() => props.sharingBy === props.local.id)

// Bei einer Freigabe zählt manchmal jeder Pixel – eine Tabelle, ein Plan, ein Formular.
// Dann fallen die beiden Videos weg und mit ihnen die Steuerleiste; der geteilte Bildschirm
// bekommt das ganze Fenster. Weil die Leiste nicht hier liegt, hält CallScreen den Zustand.
const fullscreen = defineModel<boolean>('fullscreen', { required: true })

// Die Spalte bleibt immer im Baum und wächst auf null zusammen, statt zu verschwinden – nur
// so hat sie beim Beginn einer Freigabe eine Breite, aus der heraus sie wachsen kann. inert
// nimmt sie im eingeklappten Zustand aus Tastatur und Vorlesereihenfolge.
const videoColumnOpen = computed(() => sharing.value && !fullscreen.value)

// Seitenverhältnis des geteilten Bildes – unbekannt, bis das erste Bild da ist; bis dahin
// bleibt die Kachel bei 16:9. Ein neuer Strom kann ein ganz anderes Format haben.
const shareRatio = ref<number | null>(null)
watch(() => props.shareStream, () => { shareRatio.value = null })

// Die Maße der Kachel als CSS-Variablen, gerechnet wird im Stylesheet (siehe .video-tile).
const tileStyle = computed(() => ({
  '--tile-ratio': sharing.value && shareRatio.value ? shareRatio.value : 16 / 9,
  '--tile-bar': sharing.value ? 'var(--share-bar)' : '0px',
}))

// Namensschild in den kleinen Bildern. Mit eigenem Grund, nicht als bloßer Text: Ein
// Kamerabild ist an dieser Stelle mal hell und mal dunkel, blanke Schrift verschwindet darin.
const TILE_LABEL = 'absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-default/85 backdrop-blur px-1.5 py-0.5 text-[0.625rem] text-toned'
</script>

<template>
  <div ref="stage" class="relative h-full w-full overflow-hidden bg-muted flex items-stretch justify-center p-3 sm:p-5">
    <!-- Die Hauptfläche: im Gespräch das Gegenüber, bei Freigabe der geteilte Bildschirm. -->
    <div class="main flex-1 min-w-0 grid place-items-center">
      <div class="video-tile relative overflow-hidden rounded-xl ring-1 ring-accented bg-elevated shadow-lg" :style="tileStyle">
        <!-- Der Wechsel zwischen Gespräch und Freigabe ist eine Überblendung: Beide
             Fassungen liegen deckungsgleich übereinander und tauschen die Deckkraft. Ein
             harter Schnitt an dieser Stelle liest sich wie ein Verbindungsabbruch. -->
        <Transition name="call-swap">
          <div v-if="sharing" key="share" class="absolute inset-0">
            <!-- Das Bild steht unter dem Banner, nicht dahinter: Die Kachel hat genau das
                 Format der Freigabe, ein überlagerndes Banner deckte deren Menüleiste zu. -->
            <div class="absolute inset-x-0 bottom-0 top-(--share-bar)">
              <CallCameraView
                :stream="shareStream ?? null"
                :mirrored="false"
                fit="contain"
                placeholder="Freigabe startet …"
                @dimensions="shareRatio = $event.width / $event.height"
              />
            </div>

          <!-- Läuft eine Freigabe, muss das ohne Suchen erkennbar sein: Wer seinen
               Bildschirm teilt, ohne es zu merken, zeigt im Zweifel die Akte des
               Nächsten. Deshalb ein deckender Grund – darunter liegt ein beliebiger
               Bildschirm, oft dunkel, und ein durchscheinendes Banner verschwand darin. -->
          <div class="absolute inset-x-0 top-0 z-20 h-(--share-bar) flex items-center justify-center gap-3 px-4 bg-default border-b border-default">
            <UIcon name="i-lucide-monitor-up" class="size-4 text-primary shrink-0" />
            <span class="text-sm text-primary truncate">
              {{ sharingIsLocal ? 'Du teilst deinen Bildschirm' : `${remoteShort} teilt den Bildschirm` }}
            </span>

            <!-- Beenden darf nur, wer auch teilt. -->
            <UButton
              v-if="sharingIsLocal"
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
            <!-- Erst die Kamera, dann die Spur: LiveKit schaltet eine ausgeschaltete Kamera nur
                 stumm, die Spur bleibt als Objekt bestehen. Mit der umgekehrten Prüfung stünde
                 hier das letzte Bild eingefroren. -->
            <CallCameraView v-if="!remoteAway && remote?.cameraOn && remote.stream" :stream="remote.stream" :mirrored="false" />
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span
                class="size-16 sm:size-20 rounded-full font-medium text-lg sm:text-xl flex items-center justify-center"
                :class="remoteAway ? 'bg-elevated text-dimmed' : 'bg-primary/10 text-primary'"
              >
                {{ remoteInitials }}
              </span>
              <span v-if="remotePlaceholder" class="text-xs sm:text-sm text-muted">{{ remotePlaceholder }}</span>
              <span v-if="remote?.presence === 'away' && remote.awayHint" class="max-w-xs text-xs text-dimmed">{{ remote.awayHint }}</span>
            </div>

            <!-- Die Verbindung des Gegenübers ist abgerissen: Sein Bild steht womöglich still.
                 Darüber gelegt statt an seine Stelle – kommt sie gleich zurück, soll nichts
                 umspringen. -->
            <div
              v-if="remote?.presence === 'unstable'"
              class="absolute inset-x-0 top-4 flex justify-center px-4 pointer-events-none"
            >
              <span class="inline-flex items-center gap-2 rounded-full border border-default bg-default/90 backdrop-blur px-3 py-1.5 text-xs text-toned shadow">
                <UIcon name="i-lucide-wifi-off" class="size-3.5 text-warning" />
                Verbindung zu {{ remoteShort }} unterbrochen …
              </span>
            </div>

          <!-- Name und Zustand des Gegenübers, unten links wie im Entwurf. -->
          <div v-if="remote" class="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2">
            <div class="flex items-center gap-2 rounded-lg border border-default bg-default/85 backdrop-blur px-2.5 py-1.5">
              <span class="size-5 rounded-full bg-primary/10 text-primary text-[0.625rem] font-medium flex items-center justify-center">
                {{ remoteInitials }}
              </span>
              <span class="text-xs text-toned">{{ remote.name }}</span>
            </div>

            <UTooltip v-if="remote.mutedLocally" text="Von dir stummgeschaltet">
              <span class="size-7 rounded-full bg-error/10 flex items-center justify-center">
                <UIcon name="i-lucide-mic-off" class="size-3.5 text-error" />
              </span>
            </UTooltip>

            <UBadge
              v-if="remote.blurred"
              icon="i-lucide-aperture"
              color="neutral"
              variant="subtle"
              size="sm"
              :label="`Hintergrund von ${remoteShort} weichgezeichnet`"
              class="hidden sm:inline-flex"
            />
          </div>

          <!-- Eigenes Bild. Klein, oben rechts – man soll sich nicht selbst anschauen.
               Die Breite ist ein Anteil des großen Bildes, damit beide zusammen
               schrumpfen. -->
          <div
            class="absolute right-3 sm:right-4 top-3 sm:top-4 w-[28%] max-w-56 aspect-video rounded-lg overflow-hidden border border-accented bg-elevated shadow-sm"
            :class="{ 'call-enter-self': entering }"
            @animationend.self="entering = false"
          >
            <CallCameraView v-if="local.cameraOn" :stream="local.stream ?? null" />
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <span class="text-[0.625rem] sm:text-xs text-dimmed">Kamera aus</span>
            </div>

            <span
              v-if="!local.micOn"
              class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
            >
              <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
            </span>

            <span
              v-if="local.blurred"
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
      <div v-if="remote" class="relative aspect-video rounded-lg overflow-hidden ring-1 ring-accented bg-elevated shadow-sm">
        <CallCameraView v-if="remote.cameraOn && remote.stream" :stream="remote.stream" :mirrored="false" />
        <div v-else class="absolute inset-0 flex items-center justify-center">
          <span class="text-[0.625rem] sm:text-xs text-dimmed">{{ remotePlaceholder }}</span>
        </div>

        <span
          v-if="remote.mutedLocally"
          class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
          :title="`${remoteShort} ist stummgeschaltet`"
        >
          <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
        </span>

        <span :class="TILE_LABEL">{{ remote.name }}</span>
      </div>

      <div class="relative aspect-video rounded-lg overflow-hidden ring-1 ring-accented bg-elevated shadow-sm">
        <CallCameraView v-if="local.cameraOn" :stream="local.stream ?? null" />
        <div v-else class="absolute inset-0 flex items-center justify-center">
          <span class="text-[0.625rem] sm:text-xs text-dimmed">Kamera aus</span>
        </div>

        <span
          v-if="!local.micOn"
          class="absolute top-1.5 right-1.5 size-4 rounded-full bg-error flex items-center justify-center"
        >
          <UIcon name="i-lucide-mic-off" class="size-2.5 text-inverted" />
        </span>

        <span
          v-if="local.blurred"
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

/* Der Einstieg in den Call. Die Bühne öffnet sich, die Selbstansicht kommt einen Moment
   später dazu – erst das Gegenüber, dann man selbst, wie beim Betreten eines Raums.

   Bewegt wird nur, was innerhalb der gemessenen Fläche liegt: `stage` meldet seine Maße per
   getBoundingClientRect an die Seitenleiste, und das rechnet Transforms der Vorfahren mit
   ein. Eine Skalierung *um* die Bühne herum lieferte beim Mounten verkleinerte Maße – und
   weil ein Transform keine Größenänderung auslöst, würde danach nie neu gemessen.

   `backwards` statt `both`: Vor dem Start gilt der Anfangszustand (sonst blitzte die
   verzögerte Selbstansicht kurz auf), danach aber wieder das eigene Styling – ein
   festgehaltener Endzustand überdeckte spätere Transforms. */
.video-tile {
  animation: call-enter-stage 450ms var(--ease-out, ease-out) backwards;
}

.call-enter-self {
  animation: call-enter-self 350ms var(--ease-out, ease-out) 220ms backwards;
}

@keyframes call-enter-stage {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}

@keyframes call-enter-self {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .video-tile,
  .call-enter-self {
    animation: none;
  }
}

/* Bewusst ohne eigene Transition: Die Breite folgt aus dem Platz, den die Videospalte und
   das Polster der Steuerleiste freigeben – und die beiden bewegen sich bereits weich. Eine
   zweite Transition darüber liefe einem bewegten Ziel hinterher, käme verspätet an und
   hinkte beim Ziehen am Fensterrand mit.

   Das Bild hat das Verhältnis --tile-ratio, darüber sitzt bei einer Freigabe die Leiste mit
   dem Banner (--tile-bar). Ein aspect-ratio für die ganze Kachel ginge deshalb nicht auf;
   Breite und Höhe sind je ein min(): entweder begrenzt die Breite des Platzes und die Höhe
   folgt aus ihr, oder umgekehrt – beide min() entscheiden sich dabei stets für denselben
   Fall. */
.video-tile {
  --share-bar: 2.75rem;
  width: min(100cqw, calc((100cqh - var(--tile-bar)) * var(--tile-ratio)));
  height: min(100cqh, calc(100cqw / var(--tile-ratio) + var(--tile-bar)));
}
</style>
