<script setup lang="ts">
import { offerColor, type OfferResponse } from '@hxroom/shared';
import { formatOfferPrice } from '../utils/offers';

const { offer } = defineProps<{ offer: OfferResponse }>();
</script>

<template>
  <!-- Farbiger Balken links wie in der Agenda des Coach-Backoffices und im Termin-Block der
       E-Mails: dieselbe Ableitung aus der Angebots-ID, damit ein Angebot überall dieselbe
       Farbe trägt. -->
  <RouterLink
    :to="`/offers/${offer.id}`"
    class="group flex items-stretch gap-3 p-4 rounded-xl border border-default bg-white dark:bg-neutral-900 hover:border-accented transition-colors no-underline outline-primary/25 focus-visible:outline-3"
  >
    <span class="w-1 rounded-full shrink-0 self-stretch" :style="{ backgroundColor: offerColor(offer.id) }" />
    <div class="flex-1 min-w-0">
      <div class="font-medium text-highlighted truncate">{{ offer.name }}</div>
      <div class="text-sm text-muted">{{ offer.durationMinutes }} Minuten</div>
    </div>
    <div class="flex items-center gap-2.5 shrink-0">
      <span class="text-sm" :class="offer.priceCents === null ? 'text-primary' : 'text-highlighted'">
        {{ formatOfferPrice(offer.priceCents) }}
      </span>
      <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed group-hover:text-muted transition-colors" />
    </div>
  </RouterLink>
</template>
