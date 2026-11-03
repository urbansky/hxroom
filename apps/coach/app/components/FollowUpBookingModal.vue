<script setup lang="ts">
import type { CoachBookingResponse, ManualBookingResponse, OfferResponse } from '@hxroom/shared'

// Folgetermin (doc/konzept-manuelle-termine.md §2): der häufigste Fall des manuellen
// Anlegens. Vereinbart wird er am Ende einer Sitzung – deshalb steht er auf der Terminseite
// und auf der Abschlusskarte, vorbelegt mit Klient, Angebot und derselben Uhrzeit eine
// Woche später.
const props = defineProps<{ booking: CoachBookingResponse }>()
const emit = defineEmits<{ created: [bookings: ManualBookingResponse] }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()
const offers = ref<OfferResponse[]>([])
const ready = ref(false)

// Die Angebote erst beim ersten Öffnen: Die meisten Besuche der Terminseite legen keinen
// Folgetermin an. Das Modal öffnet erst danach, damit es mit der richtigen Vorbelegung startet.
const modalOpen = ref(false)
watch(open, async (isOpen) => {
  if (!isOpen) {
    modalOpen.value = false
    return
  }
  if (!ready.value) {
    try {
      offers.value = await $api<OfferResponse[]>('/offers')
    } catch {
      offers.value = []
    }
    ready.value = true
  }
  modalOpen.value = true
})
watch(modalOpen, (isOpen) => {
  if (!isOpen) open.value = false
})

const preset = computed(() => {
  const start = new Date(props.booking.start)
  start.setDate(start.getDate() + 7)
  return {
    start,
    offerId: props.booking.offerId,
    // Ohne Angebot die geplante Dauer, nicht die tatsächliche des Gesprächs.
    durationMinutes: props.booking.offerId ? null : props.booking.durationMinutes,
  }
})

const client = computed(() => props.booking.clientId ? { id: props.booking.clientId, name: props.booking.clientName } : null)
</script>

<template>
  <ManualBookingModal
    v-if="client"
    v-model:open="modalOpen"
    :client="client"
    :offers="offers"
    :preset="preset"
    @created="emit('created', $event)"
  />
</template>
