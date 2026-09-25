<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { CallViewerImage } from './types'

// Großansicht der im Chat geteilten Bilder (B7).
//
// Keine eigene Slideshow, sondern eine Galerie: Geöffnet wird das angeklickte Bild, geblättert
// wird durch alle Bilder der Sitzung – mit Pfeilen, Pfeiltasten oder Wischen. Wer Bilder
// vorführen will, hat dafür die Bildschirmfreigabe; der Chat bleibt die Rückfallebene
// (project.md §5a).
//
// Geladen wird erst hier das Original. Im Chat steht nur das kleine Vorschaubild, damit ein
// Foto mit mehreren Megabyte nicht mitten im Gespräch die Leitung belegt.
//
// Die ausdrückliche Ebene (z-[100]) ist nötig: Nuxt UI gibt dem Modal keine eigene, sondern
// verlässt sich auf die Reihenfolge im DOM. Die Großansicht landete dadurch unter der
// Seitenleiste (z-30) und der Steuerleiste (z-40) des Calls – das Bild war halb verdeckt, der
// Schließen-Knopf gar nicht zu sehen.

const open = defineModel<boolean>('open', { required: true })
const index = defineModel<number>('index', { required: true })

const props = defineProps<{ images: CallViewerImage[] }>()

const current = computed(() => props.images[index.value] ?? null)

// Neu aufbauen bei jedem Öffnen: Das Karussell übernimmt seinen Startpunkt nur beim Mounten.
const mountKey = ref(0)
watch(open, (isOpen) => { if (isOpen) mountKey.value++ })

const carousel = ref<{ emblaApi?: { scrollPrev: () => void, scrollNext: () => void } } | null>(null)

// Pfeiltasten wie in jeder Bildansicht. Nur solange sie offen ist – sonst gehörten die Tasten
// dem Gespräch, etwa dem Eingabefeld des Chats.
function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'ArrowLeft') carousel.value?.emblaApi?.scrollPrev()
  if (event.key === 'ArrowRight') carousel.value?.emblaApi?.scrollNext()
}
watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="current?.name ?? 'Bild'"
    :description="images.length > 1 ? `${index + 1} von ${images.length}` : undefined"
    :ui="{
      overlay: 'z-[100]',
      content: 'z-[100]',
      body: 'flex items-center justify-center p-2 sm:p-4 bg-neutral-950/95',
      header: 'min-w-0',
    }"
  >
    <template #body>
      <UCarousel
        :key="mountKey"
        ref="carousel"
        v-slot="{ item }"
        :items="images"
        :start-index="index"
        :arrows="images.length > 1"
        :dots="images.length > 1 && images.length <= 12"
        class="w-full h-full"
        :ui="{
          viewport: 'h-full',
          container: 'h-full',
          item: 'h-full flex items-center justify-center',
          // Pfeile und Punkte liegen bei Nuxt UI außerhalb des Karussells (sm:-start-12,
          // -bottom-7). Hier füllt es die ganze Breite – dort wären sie abgeschnitten.
          prev: 'sm:start-4',
          next: 'sm:end-4',
          dots: 'bottom-3',
        }"
        @select="(selected: number) => { index = selected }"
      >
        <!-- lazy: Beim Öffnen lädt nur das gezeigte Bild und seine Nachbarn im Blick, nicht
             alle Originale der Sitzung auf einmal. -->
        <img
          :src="item.href"
          :alt="item.name"
          loading="lazy"
          class="max-w-full max-h-[calc(100dvh-9rem)] object-contain select-none"
          draggable="false"
        >
      </UCarousel>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <p class="text-xs text-muted truncate">
          {{ current?.name }}
        </p>
        <!-- target="_blank" aus demselben Grund wie im Chat: Im selben Tab endete das
             Gespräch (livekit-client trennt bei beforeunload). Ein schlichtes <a> statt
             UButton mit Link: Dieses Paket löst eine eigene @nuxt/ui-Kopie auf, und deren
             Link-Komponente greift auf den Router der App nicht verlässlich zu. -->
        <a
          v-if="current"
          :href="current.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-default bg-elevated hover:bg-accented ring ring-inset ring-default"
        >
          <UIcon name="i-lucide-external-link" class="size-4" />
          In neuem Tab öffnen
        </a>
      </div>
    </template>
  </UModal>
</template>
