<script setup lang="ts">
import type { OfferResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

// `description` bindet an UEditor (Tiptap) und wird serverseitig gegen
// richTextDocSchema (@hxroom/shared) validiert – hier bewusst locker typisiert,
// da Tiptaps eigener Content-Typ nicht mit unserem Zod-Typ deckungsgleich ist.
interface OfferDraft {
  id: string | null
  name: string
  durationMinutes: number
  priceEuro: string
  isFree: boolean
  description: any
  isActive: boolean
}

function emptyDraft(): OfferDraft {
  return { id: null, name: '', durationMinutes: 60, priceEuro: '', isFree: false, description: null, isActive: true }
}

function toDraft(offer: OfferResponse): OfferDraft {
  return {
    id: offer.id,
    name: offer.name,
    durationMinutes: offer.durationMinutes,
    priceEuro: offer.priceCents != null ? (offer.priceCents / 100).toFixed(2) : '',
    isFree: offer.priceCents == null,
    description: offer.description,
    isActive: offer.isActive,
  }
}

function parsePriceCents(priceEuro: string): number | null {
  const trimmed = priceEuro.trim().replace(',', '.')
  if (!trimmed) return null
  const value = Number(trimmed)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100)
}

const rows = ref<OfferResponse[]>([])

// Aktive und inaktive Angebote in getrennten Abschnitten, beide in der Reihenfolge von
// `rows`. Inaktive sind nicht buchbar und stehen deshalb zugeklappt unter den aktiven.
const activeRows = computed(() => rows.value.filter(r => r.isActive))
const inactiveRows = computed(() => rows.value.filter(r => !r.isActive))

const activeCountLabel = computed(() => {
  const n = activeRows.value.length
  if (n === 0) return 'Kein aktives Angebot – Klienten können gerade nichts buchen.'
  return n === 1 ? '1 aktives Angebot' : `${n} aktive Angebote`
})

// Cookie statt ref, damit die Einstellung Reloads und Seitenwechsel übersteht.
const showDescriptions = useCookie<boolean>('offers-show-descriptions', { default: () => true })
const showInactive = useCookie<boolean>('offers-show-inactive', { default: () => false })

// Reihenfolge per Drag & Drop. Die Liste wird bereits während des Ziehens
// live umsortiert (onDragOver), nicht erst beim Drop – die TransitionGroup
// im Template animiert den Positionswechsel der übrigen Kacheln. Persistiert
// wird erst beim Loslassen (onDragEnd), per Bulk-Endpoint mit der
// vollständigen neuen Reihenfolge statt einzelner Patches pro Kachel.
const draggedId = ref<string | null>(null)
let orderBeforeDrag: string[] = []
const toast = useToast()

function onDragStart(offer: OfferResponse, event: DragEvent) {
  draggedId.value = offer.id
  orderBeforeDrag = rows.value.map(r => r.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', offer.id)
  }
}

function onDragOver(offer: OfferResponse, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  if (offer.id === draggedId.value) return

  const fromIndex = rows.value.findIndex(r => r.id === draggedId.value)
  const overIndex = rows.value.findIndex(r => r.id === offer.id)
  if (fromIndex === -1 || overIndex === -1) return
  // Nur innerhalb des eigenen Abschnitts: Ziehen ändert die Reihenfolge, nicht den Status.
  if (rows.value[fromIndex]!.isActive !== offer.isActive) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const isBefore = event.clientY < rect.top + rect.height / 2
  const targetIndex = isBefore ? overIndex : overIndex + 1
  const adjustedIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex
  if (adjustedIndex === fromIndex) return

  const moved = rows.value.splice(fromIndex, 1)[0]!
  rows.value.splice(adjustedIndex, 0, moved)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
}

async function onDragEnd() {
  draggedId.value = null
  const newOrder = rows.value.map(r => r.id)
  if (newOrder.join() === orderBeforeDrag.join()) return

  try {
    await $api('/offers/reorder', { method: 'PATCH', body: { ids: newOrder } })
  } catch {
    rows.value.sort((a, b) => orderBeforeDrag.indexOf(a.id) - orderBeforeDrag.indexOf(b.id))
    toast.add({ title: 'Reihenfolge konnte nicht gespeichert werden.', color: 'error' })
  }
}

await useFetch<OfferResponse[]>('/offers', {
  $fetch: $api,
  onResponse({ response }) {
    rows.value = response._data as OfferResponse[]
  },
})

const isDrawerOpen = ref(false)
const confirmingDelete = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const draft = reactive<OfferDraft>(emptyDraft())

watch(isDrawerOpen, (open) => {
  if (!open) {
    confirmingDelete.value = false
    saveError.value = null
  }
})

watch(() => draft.isFree, (free) => {
  if (free) draft.priceEuro = ''
})

function openCreate() {
  Object.assign(draft, emptyDraft())
  isDrawerOpen.value = true
}

function openEdit(offer: OfferResponse) {
  Object.assign(draft, toDraft(offer))
  isDrawerOpen.value = true
}

async function saveDraft() {
  if (!draft.name.trim() || !draft.durationMinutes) return
  saveError.value = null
  saving.value = true
  const body = {
    name: draft.name.trim(),
    durationMinutes: draft.durationMinutes,
    priceCents: draft.isFree ? null : parsePriceCents(draft.priceEuro),
    description: draft.description,
    isActive: draft.isActive,
  }
  try {
    if (draft.id) {
      const updated = await $api<OfferResponse>(`/offers/${draft.id}`, { method: 'PATCH', body })
      const idx = rows.value.findIndex(r => r.id === draft.id)
      if (idx !== -1) rows.value[idx] = updated
    } else {
      const created = await $api<OfferResponse>('/offers', { method: 'POST', body })
      rows.value.push(created)
    }
    isDrawerOpen.value = false
  } catch {
    saveError.value = 'Angebot konnte nicht gespeichert werden.'
  } finally {
    saving.value = false
  }
}

async function deleteDraft() {
  if (!draft.id) return
  await $api(`/offers/${draft.id}`, { method: 'DELETE' })
  rows.value = rows.value.filter(r => r.id !== draft.id)
  isDrawerOpen.value = false
}

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const plannedFeatures = [
  {
    icon: 'i-lucide-clock-4',
    title: 'Eigene Zeiten pro Angebot',
    description: 'Optionaler Schalter „Eigene Zeiten verwenden" – wähle dafür eine Teilmenge deiner Verfügbarkeitsslots aus.',
  },
  {
    icon: 'i-lucide-triangle-alert',
    title: 'Warnhinweis bei fehlender Zeitzuordnung',
    description: 'Deutlich sichtbare Warnung, wenn ein Angebot mit eigenen Zeiten aktuell keinem Zeitfenster zugeordnet ist.',
  },
  {
    icon: 'i-lucide-bell-ring',
    title: 'Hinweis bei neuen Verfügbarkeiten',
    description: 'Legst du einen neuen Verfügbarkeitsslot an, wirst du auf Angebote mit eigenen Zeiten hingewiesen, die ihn ggf. übernehmen sollten.',
  },
  {
    icon: 'i-lucide-users',
    title: 'Angebotsauswahl für Klienten',
    description: 'Klienten wählen auf der Buchungsseite zuerst ein Angebot – die buchbaren Zeitfenster richten sich nach dessen Dauer und Verfügbarkeitsregel.',
  },
  {
    icon: 'i-lucide-history',
    title: 'Migration bestehender Buchungen',
    description: 'Für Bestandscoaches wird automatisch ein Default-Angebot aus der bisherigen Standarddauer erzeugt.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Sitzungsangebote</h1>
    <p class="text-muted mb-8">Lege fest, welche Sitzungsformate deine Klienten buchen können – mit Name, Dauer, Preis und einer ausführlichen Beschreibung.</p>

    <template v-if="rows.length">
      <!-- Wie in der Klientenliste: Hauptaktion rechts, gefüllt. Auf dem Handy stehen
           Zähler und Hauptaktion in der ersten Zeile, der Beschreibungs-Schalter rutscht
           per order-last darunter. -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
        <p class="text-sm text-muted">{{ activeCountLabel }}</p>
        <UButton
          :label="showDescriptions ? 'Beschreibungen ausblenden' : 'Beschreibungen anzeigen'"
          :icon="showDescriptions ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          color="neutral"
          variant="ghost"
          size="sm"
          class="-ms-2.5 max-sm:order-last"
          @click="showDescriptions = !showDescriptions"
        />
        <UButton
          label="Angebot anlegen"
          icon="i-lucide-plus"
          color="primary"
          class="ms-auto shrink-0"
          @click="openCreate"
        />
      </div>

      <TransitionGroup tag="div" name="offer-reorder" class="flex flex-col gap-3">
        <OfferCard
          v-for="offer in activeRows"
          :key="offer.id"
          :offer="offer"
          :show-description="showDescriptions"
          :dragging="draggedId === offer.id"
          @open="openEdit(offer)"
          @dragstart="onDragStart(offer, $event)"
          @dragover="onDragOver(offer, $event)"
          @drop="onDrop($event)"
          @dragend="onDragEnd"
        />
      </TransitionGroup>

      <UCollapsible v-if="inactiveRows.length" v-model:open="showInactive" class="mt-8">
        <UButton
          :label="`Inaktiv (${inactiveRows.length})`"
          color="neutral"
          variant="ghost"
          size="sm"
          trailing-icon="i-lucide-chevron-down"
          class="group -ms-2.5"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
        />

        <template #content>
          <p class="text-sm text-muted mt-1 mb-3">Nicht auf deiner Buchungsseite sichtbar. Zum Aktivieren ein Angebot öffnen.</p>
          <TransitionGroup tag="div" name="offer-reorder" class="flex flex-col gap-3">
            <OfferCard
              v-for="offer in inactiveRows"
              :key="offer.id"
              :offer="offer"
              :show-description="showDescriptions"
              :dragging="draggedId === offer.id"
              @open="openEdit(offer)"
              @dragstart="onDragStart(offer, $event)"
              @dragover="onDragOver(offer, $event)"
              @drop="onDrop($event)"
              @dragend="onDragEnd"
            />
          </TransitionGroup>
        </template>
      </UCollapsible>
    </template>

    <div v-else class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center justify-center gap-3 text-center">
      <UIcon name="i-lucide-layers" class="size-6 text-muted" />
      <p class="text-sm text-muted">Noch keine Angebote. Lege dein erstes an – erst dann können Klienten bei dir buchen.</p>
      <!-- Gefüllt, nicht soft wie bei den Klienten: Ohne Angebot bleibt die Buchungsseite
           leer, der Knopf ist hier der einzige Weg weiter. -->
      <UButton
        label="Angebot anlegen"
        icon="i-lucide-plus"
        color="primary"
        @click="openCreate"
      />
    </div>

    <SettingsSection title="Geplante Features" description="Das kommt als Nächstes für deine Sitzungsangebote." class="mt-6 hidden">
      <div class="flex flex-col gap-2">
        <UpcomingFeature
          v-for="item in plannedFeatures"
          :key="item.title"
          v-bind="item"
        />
      </div>
    </SettingsSection>

    <!-- Bearbeiten-/Anlegen-Drawer -->
    <USlideover v-model:open="isDrawerOpen" :title="draft.id ? 'Angebot bearbeiten' : 'Neues Angebot'">
      <template #body>
        <div class="flex flex-col gap-6">
          <div
            class="flex items-center justify-between gap-4 rounded-lg border border-default bg-neutral-50 dark:bg-neutral-800/50 p-4 cursor-pointer"
            @click="draft.isActive = !draft.isActive"
          >
            <div>
              <p class="text-sm font-medium text-highlighted">Auf Buchungsseite sichtbar</p>
              <p class="text-sm text-muted">Klienten können dieses Format buchen.</p>
            </div>
            <USwitch v-model="draft.isActive" @click.stop />
          </div>

          <UFormField label="Name">
            <UInput v-model="draft.name" placeholder="z. B. Coaching-Sitzung" class="w-full" :ui="inputUi" />
          </UFormField>

          <div class="flex items-end gap-4 flex-wrap">
            <UFormField label="Dauer" class="w-32">
              <UInput v-model.number="draft.durationMinutes" type="number" min="5" max="480" :ui="inputUi">
                <template #trailing>
                  <span class="text-xs text-muted">min</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField label="Preis" class="w-32">
              <UInput v-model="draft.priceEuro" placeholder="0" :disabled="draft.isFree" :ui="inputUi">
                <template #trailing>
                  <span class="text-xs text-muted">€</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField label="" class="shrink-0">
              <div class="h-8 flex items-center">
                <UCheckbox v-model="draft.isFree" label="Kostenlos" :ui="{ base: 'rounded-[4px]' }" />
              </div>
            </UFormField>
          </div>

          <div>
            <label class="text-sm font-medium text-highlighted block">Beschreibung</label>
            <p class="text-sm text-muted mb-2">Erscheint als Angebotstext auf deiner Buchungsseite.</p>
            <RichTextEditor
              v-model="draft.description"
              placeholder="Was Klient:innen erwartet, für wen dieses Angebot geeignet ist …"
            />
          </div>

          <p v-if="saveError" class="text-sm text-error">{{ saveError }}</p>
        </div>
      </template>

      <template #footer>
        <div v-if="confirmingDelete" class="flex items-center justify-between w-full">
          <span class="text-sm text-muted">Angebot wirklich löschen?</span>
          <div class="flex items-center gap-2">
            <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirmingDelete = false" />
            <UButton label="Löschen" color="error" variant="solid" size="sm" @click="deleteDraft" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between w-full">
          <UButton v-if="draft.id" label="Löschen" icon="i-lucide-trash-2" color="error" variant="ghost" @click="confirmingDelete = true" />
          <div v-else />
          <div class="flex items-center gap-2">
            <UButton label="Abbrechen" color="neutral" variant="ghost" @click="isDrawerOpen = false" />
            <UButton :label="draft.id ? 'Speichern' : 'Anlegen'" color="primary" :loading="saving" @click="saveDraft" />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.offer-reorder-move {
  transition: transform 0.25s ease;
}
</style>
