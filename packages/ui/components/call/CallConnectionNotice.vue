<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed } from 'vue'

// Was mit der eigenen Verbindung ist (B6), über der Bühne. Drei Lagen:
//
// - `reconnecting`: LiveKit stellt die Verbindung von selbst wieder her. Kein Knopf – es gibt
//   nichts zu tun, und ein Knopf ließe glauben, man müsse.
// - `lost`: LiveKit hat aufgegeben. Die App verbindet von selbst neu, sobald das Netz
//   zurück ist; der Knopf ist für den, der nicht warten will.
// - `elsewhere`: Das Gespräch ist in einem anderen Tab geöffnet. Hier verbindet nichts von
//   selbst, sonst würfen sich zwei Tabs gegenseitig hinaus.
//
// Rollenfrei: Der Text passt für Coach und Klient gleichermaßen, das Neuverbinden selbst
// übernimmt die App, weil nur sie einen frischen Zugang holen kann.

const props = defineProps<{
  state: 'reconnecting' | 'lost' | 'elsewhere' | null
  /** Der Neuaufbau läuft gerade – der Knopf zeigt das, statt ein zweites Mal zu starten. */
  busy?: boolean
}>()
defineEmits<{ reconnect: [] }>()

const content = computed(() => {
  switch (props.state) {
    case 'reconnecting':
      return {
        icon: 'i-lucide-wifi-off',
        color: 'warning' as const,
        title: 'Verbindung unterbrochen',
        description: 'Sie wird gerade wiederhergestellt …',
        action: null,
      }
    case 'lost':
      return {
        icon: 'i-lucide-unplug',
        color: 'error' as const,
        title: 'Verbindung verloren',
        description: 'Sobald das Netz wieder da ist, verbinden wir dich neu.',
        action: 'Erneut verbinden',
      }
    case 'elsewhere':
      return {
        icon: 'i-lucide-app-window',
        color: 'info' as const,
        title: 'In einem anderen Tab geöffnet',
        description: 'Das Gespräch läuft jetzt in einem anderen Fenster.',
        action: 'Hier weitermachen',
      }
    default:
      return null
  }
})
</script>

<template>
  <UAlert
    v-if="content"
    :icon="content.icon"
    :color="content.color"
    variant="subtle"
    class="max-w-md shadow-lg bg-default"
    :title="content.title"
    :description="content.description"
    :actions="content.action
      ? [{ label: content.action, color: content.color, variant: 'solid', loading: busy, onClick: () => $emit('reconnect') }]
      : undefined"
  />
</template>
