<script setup lang="ts">
// Das eigene Kamerabild in einer Kachel. Nimmt den Strom aus useLocalCamera entgegen und
// zeigt ihn an – mehr nicht; die Kamera an- und auszuschalten ist Sache der Steuerleiste.
//
// Gespiegelt, wie jede Selbstansicht: Man ist es aus dem Spiegel so gewohnt, und eine
// Handbewegung nach rechts soll im eigenen Bild auch nach rechts gehen. Übertragen wird
// später das ungespiegelte Bild – die Spiegelung sitzt deshalb im CSS und nicht in der Spur.

const props = defineProps<{ stream: MediaStream | null }>()

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
      class="absolute inset-0 size-full object-cover -scale-x-100 bg-elevated"
      autoplay
      playsinline
      muted
    />

    <!-- Die Sekunden zwischen Klick und Bild: Der Browser fragt erst nach der Freigabe. -->
    <div v-if="!stream" class="absolute inset-0 flex items-center justify-center">
      <span class="text-[0.625rem] sm:text-xs text-dimmed">Kamera startet …</span>
    </div>
  </div>
</template>
