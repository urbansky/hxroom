<script setup lang="ts">
import type { OfferResponse } from '@hxroom/shared'

// Eine Kachel der Angebotsliste. Klick und Tastatur öffnen den Bearbeiten-Drawer; die
// Drag-Ereignisse (dragstart, dragover, drop, dragend) setzt die Seite direkt auf die
// Komponente, sie landen als Fallthrough-Attribute auf der Kachel.
defineProps<{
  offer: OfferResponse
  showDescription: boolean
  dragging: boolean
}>()

defineEmits<{ open: [] }>()
</script>

<template>
  <div
    role="button"
    tabindex="0"
    draggable="true"
    class="group relative flex items-start gap-3 rounded-xl border border-default bg-white dark:bg-neutral-900 p-5 text-left cursor-pointer transition-colors hover:border-accented outline-primary/25 focus-visible:outline-3"
    :class="[
      !offer.isActive && 'opacity-60',
      dragging && 'opacity-30',
    ]"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <!-- Absolut positioniert statt im Fluss: Als Flex-Kind belegte das Icon auch
         unsichtbar (opacity-0) seinen Platz und riss eine Lücke links neben der
         Farbpille. Rechts, weil die Kachel dort ohnehin Leerraum hat und die linke
         Seite jetzt der Farbpille gehört.
         Nur ein Hinweis, kein Bedienelement: draggable und dragstart liegen auf der
         ganzen Kachel, gezogen werden kann sie von jeder Stelle aus. -->
    <UIcon
      name="i-lucide-grip-vertical"
      class="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
    />

    <!-- Farbe der Sitzungsart (siehe offerColor in utils/offers.ts). `self-stretch`
         statt fester Höhe: Die Pille wächst mit dem Inhalt mit, also auch dann, wenn
         über "Beschreibungen anzeigen" der Beschreibungstext eingeblendet wird.
         Bewusst innerhalb des Paddings statt als Rand der Karte – ein Rand würde bei
         dieser Breite mit dem Eckradius kollidieren (innerer Radius wird 0). -->
    <span
      class="w-1 rounded-full shrink-0 self-stretch"
      :style="{ backgroundColor: offerColor(offer.id) }"
    />

    <div class="min-w-0 flex-1 flex flex-col gap-0.5">
      <span class="font-bold text-highlighted truncate">{{ offer.name }}</span>
      <p class="text-sm text-muted">{{ offer.durationMinutes }} min · {{ formatPrice(offer.priceCents) }}</p>

      <div v-if="showDescription" class="mt-2">
        <div
          v-if="descriptionPreview(offer.description)"
          class="text-muted [&_h2]:text-highlighted [&_h3]:text-highlighted"
          :class="descriptionProseClasses"
          v-html="renderDescription(offer.description)"
        />
        <p v-else class="text-sm text-muted italic">Beschreibung hinzufügen …</p>
      </div>
    </div>
  </div>
</template>
