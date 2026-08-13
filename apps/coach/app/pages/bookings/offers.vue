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

const activeCount = computed(() => rows.value.filter(r => r.isActive).length)
const inactiveCount = computed(() => rows.value.length - activeCount.value)

// Cookie statt ref, damit die Einstellung Reloads und Seitenwechsel übersteht.
const showDescriptions = useCookie<boolean>('offers-show-descriptions', { default: () => true })

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

// Array von Arrays = Gruppen; UEditorToolbar fügt den Trenner automatisch
// zwischen den Gruppen ein (kein eigenes "separator"-Item nötig/vorgesehen).
const editorToolbarItems: any[] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Fett' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Kursiv' } },
  ],
  [
    { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', tooltip: { text: 'Überschrift' } },
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Liste' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Nummerierte Liste' } },
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
  ],
]

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

    <div class="flex items-center justify-between gap-4 mb-3">
      <p class="text-sm text-muted">
        <template v-if="inactiveCount > 0">{{ activeCount }} aktive Angebote ({{ inactiveCount }} inaktive)</template>
        <template v-else>{{ rows.length }} {{ rows.length === 1 ? 'Angebot' : 'Angebote' }}</template>
      </p>
      <UButton
        :label="showDescriptions ? 'Beschreibungen ausblenden' : 'Beschreibungen anzeigen'"
        :icon="showDescriptions ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="showDescriptions = !showDescriptions"
      />
    </div>

    <div class="flex flex-col gap-3">
      <p v-if="!rows.length" class="text-sm text-muted">Noch keine Angebote angelegt.</p>

      <TransitionGroup tag="div" name="offer-reorder" class="contents">
        <div
          v-for="offer in rows"
          :key="offer.id"
          role="button"
          tabindex="0"
          draggable="true"
          class="group relative flex items-start gap-3 rounded-xl border border-default bg-white dark:bg-neutral-900 p-5 text-left cursor-pointer transition-colors hover:border-accented outline-primary/25 focus-visible:outline-3"
          :class="[
            !offer.isActive && 'opacity-50',
            draggedId === offer.id && 'opacity-30',
          ]"
          @click="openEdit(offer)"
          @keydown.enter="openEdit(offer)"
          @keydown.space.prevent="openEdit(offer)"
          @dragstart="onDragStart(offer, $event)"
          @dragover="onDragOver(offer, $event)"
          @drop="onDrop($event)"
          @dragend="onDragEnd"
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
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-highlighted truncate">{{ offer.name }}</span>
              <UBadge v-if="!offer.isActive" label="Inaktiv" color="neutral" variant="subtle" size="sm" />
            </div>
            <p class="text-sm text-muted">{{ offer.durationMinutes }} min · {{ formatPrice(offer.priceCents) }}</p>

            <div v-if="showDescriptions" class="mt-2">
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
      </TransitionGroup>

      <button
        type="button"
        class="rounded-xl border border-dashed border-default p-5 flex items-center justify-center gap-2 text-sm text-muted hover:text-highlighted hover:border-accented transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
        @click="openCreate"
      >
        <UIcon name="i-lucide-plus" class="size-4" />
        Neues Angebot
      </button>
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
            <div class="rounded-lg border border-default overflow-hidden bg-white dark:bg-neutral-800">
              <UEditor
                v-model="draft.description"
                content-type="json"
                :image="false"
                :mention="false"
                :starter-kit="{ heading: { levels: [2, 3] } }"
                placeholder="Was Klient:innen erwartet, für wen dieses Angebot geeignet ist …"
                :ui="{ base: `min-h-32 py-3 sm:px-4 ${descriptionProseClasses}` }"
              >
                <template #default="{ editor }">
                  <UEditorToolbar :editor="editor" :items="editorToolbarItems" class="border-b border-default px-2 py-1.5" />
                </template>
              </UEditor>
            </div>
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
