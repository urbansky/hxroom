<script setup lang="ts">
// Ein Kamerabild in einer Kachel: den übergebenen Strom anzeigen – mehr nicht; die Kamera
// an- und auszuschalten ist Sache der Steuerleiste. Seit B4 trägt die Komponente beide
// Seiten, das eigene Bild und das der Gegenstelle.
//
// Das eigene Bild ist gespiegelt, wie jede Selbstansicht: Man ist es aus dem Spiegel so
// gewohnt, und eine Handbewegung nach rechts soll im eigenen Bild auch nach rechts gehen.
// Das der Gegenstelle darf es nicht sein – dort sähe man Schrift verkehrt. Die Spiegelung
// sitzt deshalb im CSS und nicht in der Spur; übertragen wird immer ungespiegelt.

// Vue-APIs stehen hier explizit. In einer App nimmt Nuxt bzw. das Nuxt-UI-Plugin sie über
// Auto-Imports mit; für eine Datei in einem Workspace-Paket gilt das nur, solange die
// pnpm-Symlinks auf Pfade ohne node_modules zeigen. Explizit ist es unabhängig davon.
import { onUnmounted, useTemplateRef, watchEffect } from 'vue'

const props = withDefaults(defineProps<{
  stream: MediaStream | null
  /** Selbstansicht spiegeln. Für die Gegenstelle false. */
  mirrored?: boolean
  /** Was steht, solange kein Bild da ist. */
  placeholder?: string
  /**
   * `cover` füllt die Kachel und schneidet an – für Gesichter richtig. Ein geteilter
   * Bildschirm braucht `contain`: Angeschnittene Ränder sind dort Menüleisten und Text.
   */
  fit?: 'cover' | 'contain'
}>(), { mirrored: true, placeholder: 'Kamera startet …', fit: 'cover' })

const video = useTemplateRef<HTMLVideoElement>('video')

// srcObject ist keine Eigenschaft, die sich binden ließe – sie will zugewiesen werden.
watchEffect(() => {
  const el = video.value
  if (el && el.srcObject !== props.stream) el.srcObject = props.stream
})

// Ohne das behält das Element den Strom, und der Browser hält ihn für in Benutzung.
onUnmounted(() => {
  if (video.value) video.value.srcObject = null
})
</script>

<template>
  <div class="absolute inset-0 overflow-hidden">
    <!-- v-show statt v-if: Das Element muss stehen, bevor der Strom da ist, sonst gäbe es
         nichts, dem man ihn zuweisen könnte.
         muted ist Pflicht – ohne das Attribut lässt kein Browser ein Video von selbst
         anlaufen; zu hören gäbe es ohnehin nichts, die Spur ist reines Video. -->
    <video
      v-show="stream"
      ref="video"
      class="absolute inset-0 size-full bg-elevated"
      :class="[fit === 'contain' ? 'object-contain' : 'object-cover', mirrored ? '-scale-x-100' : undefined]"
      autoplay
      playsinline
      muted
    />

    <!-- Die Sekunden zwischen Klick und Bild: Der Browser fragt erst nach der Freigabe. -->
    <div v-if="!stream" class="absolute inset-0 flex items-center justify-center">
      <span class="text-[0.625rem] sm:text-xs text-dimmed">{{ placeholder }}</span>
    </div>
  </div>
</template>
