<script setup lang="ts">
import type { AdHocBookingResponse, ClientListItem, OfferResponse } from '@hxroom/shared'

/**
 * Spontan-Termin: eine Sitzung, die jetzt beginnt (backoffice-coach.md 2.04).
 *
 * Zwei Einstiege, eine Komponente: Im Klientenprofil steht der Klient fest, im Dashboard
 * wird er hier gewählt. Deshalb `client` **oder** `clients` – nicht beides.
 *
 * Bewusst kein ClientPicker: Der ist ein Slideover, und ein Slideover aus einem Modal
 * heraus legt zwei überlagernde Ebenen übereinander. Für eine Auswahl aus einer bereits
 * geladenen Liste genügt ein USelectMenu.
 */
const props = defineProps<{
  /** Vorgegebener Klient (Klientenprofil). */
  client?: { id: string, name: string } | null
  /** Auswahlliste, wenn kein Klient feststeht (Dashboard). */
  clients?: ClientListItem[]
  offers: OfferResponse[]
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()
const toast = useToast()

const selectedClientId = ref<string | null>(null)
const selectedOfferId = ref<string | null>(null)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
/** Gesetzt nach dem Anlegen – ab da zeigt das Modal den Link statt des Formulars. */
const created = ref<AdHocBookingResponse | null>(null)

// Nur aktive Angebote: Ein deaktiviertes Angebot ist eines, das der Coach gerade nicht
// anbietet – auch nicht spontan.
const offerItems = computed(() =>
  props.offers
    .filter(offer => offer.isActive)
    .map(offer => ({ label: `${offer.name} · ${offer.durationMinutes} Min.`, value: offer.id })),
)

// Die E-Mail steht als `description` unter dem Namen: Zwei Klienten mit gleichem oder
// ähnlichem Namen sind sonst nicht auseinanderzuhalten, und die Adresse ist das, was
// gleich den Zugangslink bekommt.
const clientItems = computed(() =>
  (props.clients ?? []).map(client => ({
    label: client.name,
    description: client.email,
    value: client.id,
  })),
)

const clientId = computed(() => props.client?.id ?? selectedClientId.value)
const clientName = computed(() =>
  props.client?.name ?? props.clients?.find(c => c.id === selectedClientId.value)?.name ?? '',
)

const canSubmit = computed(() => Boolean(clientId.value && selectedOfferId.value) && !pending.value)

// Beim Öffnen zurücksetzen: Das Modal überlebt den Seitenwechsel nicht, wohl aber den
// zweiten Klick auf denselben Knopf – dort soll kein alter Link mehr stehen.
watch(open, (isOpen) => {
  if (!isOpen) return
  selectedClientId.value = null
  selectedOfferId.value = offerItems.value.length === 1 ? offerItems.value[0]!.value : null
  errorMessage.value = null
  created.value = null
})

async function start() {
  if (!canSubmit.value) return
  pending.value = true
  errorMessage.value = null

  try {
    created.value = await $api<AdHocBookingResponse>('/bookings/ad-hoc', {
      method: 'POST',
      body: { clientId: clientId.value, offerId: selectedOfferId.value },
    })
  } catch {
    errorMessage.value = 'Die Sitzung konnte nicht angelegt werden.'
  } finally {
    pending.value = false
  }
}

// Der Link ist der eigentliche Ertrag: Eine Mail ist für ein Gespräch in fünf Minuten oft
// zu langsam, der Coach schickt ihn nebenher per WhatsApp oder liest ihn am Telefon vor.
async function copyLink() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.callUrl)
    toast.add({ title: 'Link kopiert', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: 'Markiere den Link und kopiere ihn von Hand.', color: 'warning' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Spontan-Termin"
    :description="created
      ? 'Die Sitzung läuft. Der Klient hat den Zugang per E-Mail bekommen.'
      : 'Die Sitzung beginnt sofort. Der Klient bekommt den Zugangslink per E-Mail.'"
  >
    <template #body>
      <div v-if="created" class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          Der Raum für {{ created.clientName }} ist offen – {{ created.durationMinutes }} Min.,
          {{ created.offerName }}.
        </p>

        <UFormField label="Zugangslink" help="Falls es schneller gehen muss als die E-Mail.">
          <div class="flex gap-2">
            <UInput :model-value="created.callUrl" readonly class="flex-1" />
            <UButton icon="i-lucide-copy" color="neutral" variant="outline" aria-label="Link kopieren" @click="copyLink" />
          </div>
        </UFormField>
      </div>

      <div v-else class="flex flex-col gap-4">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />

        <UFormField v-if="props.client" label="Klient">
          <p class="text-highlighted">{{ props.client.name }}</p>
        </UFormField>
        <UFormField v-else label="Klient">
          <USelectMenu
            v-model="selectedClientId"
            :items="clientItems"
            value-key="value"
            :filter-fields="['label', 'description']"
            placeholder="Klient wählen"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Angebot" help="Bestimmt Bezeichnung und Dauer der Sitzung.">
          <USelectMenu
            v-model="selectedOfferId"
            :items="offerItems"
            value-key="value"
            placeholder="Angebot wählen"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <template v-if="created">
          <UButton color="neutral" variant="outline" label="Schließen" @click="open = false" />
          <UButton :to="`/call/${created.id}`" icon="i-lucide-video" label="Zur Sitzung" />
        </template>
        <template v-else>
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
          <UButton
            icon="i-lucide-video"
            :loading="pending"
            :disabled="!canSubmit"
            :label="clientName ? `Sitzung mit ${clientName} starten` : 'Sitzung starten'"
            @click="start"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>
