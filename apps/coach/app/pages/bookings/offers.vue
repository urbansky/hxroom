<script setup lang="ts">
import type { OfferResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

// `description` bindet an UEditor (Tiptap) und wird serverseitig gegen
// richTextDocSchema (@hxroom/shared) validiert – hier bewusst locker typisiert,
// da Tiptaps eigener Content-Typ nicht mit unserem Zod-Typ deckungsgleich ist.
interface OfferRow {
  id: string
  name: string
  durationMinutes: number
  priceEuro: string
  description: any
  isActive: boolean
}

function toRow(offer: OfferResponse): OfferRow {
  return {
    id: offer.id,
    name: offer.name,
    durationMinutes: offer.durationMinutes,
    priceEuro: offer.priceCents != null ? (offer.priceCents / 100).toFixed(2) : '',
    description: offer.description,
    isActive: offer.isActive,
  }
}

function cloneDoc(doc: any): any {
  // JSON-Roundtrip statt structuredClone: row.description kann ein reaktives
  // Vue-Proxy-Objekt sein, das structuredClone mit DataCloneError ablehnt.
  return doc ? JSON.parse(JSON.stringify(doc)) : null
}

function parsePriceCents(priceEuro: string): number | null {
  const trimmed = priceEuro.trim().replace(',', '.')
  if (!trimmed) return null
  const value = Number(trimmed)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100)
}

const rows = ref<OfferRow[]>([])
const savedRows = ref<Record<string, OfferRow>>({})

await useFetch<OfferResponse[]>('/offers', {
  $fetch: $api,
  onResponse({ response }) {
    const data = (response._data as OfferResponse[]).map(toRow)
    rows.value = data
    savedRows.value = Object.fromEntries(data.map(row => [row.id, { ...row, description: cloneDoc(row.description) }]))
  },
})

const saveStatus = ref<Record<string, 'saving' | 'saved' | 'error' | null>>({})
const savedTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function diffChanges(row: OfferRow) {
  const saved = savedRows.value[row.id]
  const changes: Record<string, unknown> = {}
  if (!saved || saved.name !== row.name) changes.name = row.name.trim()
  if (!saved || saved.durationMinutes !== row.durationMinutes) changes.durationMinutes = row.durationMinutes
  if (!saved || saved.priceEuro !== row.priceEuro) changes.priceCents = parsePriceCents(row.priceEuro)
  if (!saved || JSON.stringify(saved.description) !== JSON.stringify(row.description)) changes.description = row.description
  return changes
}

async function saveRow(row: OfferRow) {
  if (!row.name.trim() || !row.durationMinutes) return
  const changes = diffChanges(row)
  if (!Object.keys(changes).length) return

  if (savedTimers[row.id]) clearTimeout(savedTimers[row.id])
  saveStatus.value[row.id] = 'saving'
  try {
    await $api(`/offers/${row.id}`, { method: 'PATCH', body: changes })
    savedRows.value[row.id] = { ...row, description: cloneDoc(row.description) }
    saveStatus.value[row.id] = 'saved'
    savedTimers[row.id] = setTimeout(() => { saveStatus.value[row.id] = null }, 2500)
  } catch {
    saveStatus.value[row.id] = 'error'
  }
}

async function toggleActive(row: OfferRow) {
  if (savedTimers[row.id]) clearTimeout(savedTimers[row.id])
  saveStatus.value[row.id] = 'saving'
  try {
    await $api(`/offers/${row.id}`, { method: 'PATCH', body: { isActive: row.isActive } })
    savedRows.value[row.id] = { ...row, description: cloneDoc(row.description) }
    saveStatus.value[row.id] = 'saved'
    savedTimers[row.id] = setTimeout(() => { saveStatus.value[row.id] = null }, 2500)
  } catch {
    row.isActive = !row.isActive
    saveStatus.value[row.id] = 'error'
  }
}

const newOffer = reactive({ name: '', durationMinutes: 60, priceEuro: '' })
const creating = ref(false)
const createError = ref<string | null>(null)

async function addOffer() {
  createError.value = null
  if (!newOffer.name.trim() || !newOffer.durationMinutes) return
  creating.value = true
  try {
    const created = await $api<OfferResponse>('/offers', {
      method: 'POST',
      body: {
        name: newOffer.name.trim(),
        durationMinutes: newOffer.durationMinutes,
        priceCents: parsePriceCents(newOffer.priceEuro),
      },
    })
    const row = toRow(created)
    rows.value.push(row)
    savedRows.value[row.id] = { ...row, description: cloneDoc(row.description) }
    newOffer.name = ''
    newOffer.durationMinutes = 60
    newOffer.priceEuro = ''
  } catch {
    createError.value = 'Angebot konnte nicht angelegt werden.'
  } finally {
    creating.value = false
  }
}

const confirmingDeleteId = ref<string | null>(null)

async function removeOffer(row: OfferRow) {
  await $api(`/offers/${row.id}`, { method: 'DELETE' })
  rows.value = rows.value.filter(r => r.id !== row.id)
  delete savedRows.value[row.id]
  confirmingDeleteId.value = null
}

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

// Locker typisiert: die generischen Toolbar-Item-Types von Nuxt UI sind hier
// nicht der Mühe wert, exakt nachzubilden – reine statische UI-Konfiguration.
const editorToolbarItems: any[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Fett' } },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Kursiv' } },
  { type: 'separator' },
  { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', tooltip: { text: 'Überschrift' } },
  { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Liste' } },
  { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Nummerierte Liste' } },
  { type: 'separator' },
  { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
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

    <div class="flex flex-col gap-5">
      <p v-if="!rows.length" class="text-sm text-muted">Noch keine Angebote angelegt.</p>

      <div
        v-for="row in rows"
        :key="row.id"
        class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 flex flex-col gap-5"
      >
        <!-- Name + Status/Aktionen -->
        <div class="flex items-start justify-between gap-4">
          <UInput
            v-model="row.name"
            placeholder="Name"
            size="xl"
            class="flex-1 min-w-40"
            :ui="{ base: 'text-lg font-medium bg-white dark:bg-neutral-800' }"
            @blur="saveRow(row)"
          />
          <div class="flex items-center gap-3 shrink-0 pt-1.5">
            <SaveStatusHint :status="saveStatus[row.id] ?? null" />
            <USwitch v-model="row.isActive" @update:model-value="toggleActive(row)" />
            <UButton
              v-if="confirmingDeleteId !== row.id"
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Angebot löschen"
              @click="confirmingDeleteId = row.id"
            />
            <template v-else>
              <UButton label="Löschen" color="error" variant="soft" size="sm" @click="removeOffer(row)" />
              <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirmingDeleteId = null" />
            </template>
          </div>
        </div>

        <!-- Dauer & Preis -->
        <div class="flex items-center gap-6 flex-wrap">
          <UFormField label="Dauer" class="w-32">
            <UInput v-model.number="row.durationMinutes" type="number" min="5" max="480" :ui="inputUi" @blur="saveRow(row)">
              <template #trailing>
                <span class="text-xs text-muted">min</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Preis" class="w-36">
            <UInput v-model="row.priceEuro" placeholder="kostenlos" :ui="inputUi" @blur="saveRow(row)">
              <template #trailing>
                <span class="text-xs text-muted">€</span>
              </template>
            </UInput>
          </UFormField>
        </div>

        <!-- Beschreibung -->
        <div>
          <label class="text-sm font-medium text-highlighted mb-2 block">Beschreibung</label>
          <div class="rounded-lg border border-default overflow-hidden bg-white dark:bg-neutral-800">
            <UEditor
              v-model="row.description"
              content-type="json"
              :image="false"
              :mention="false"
              :starter-kit="{ heading: { levels: [2, 3] } }"
              placeholder="Was Klient:innen erwartet, für wen dieses Angebot geeignet ist …"
              :ui="{ base: 'min-h-32 sm:px-4' }"
              @blur="saveRow(row)"
            >
              <template #default="{ editor }">
                <UEditorToolbar :editor="editor" :items="editorToolbarItems" class="border-b border-default px-2 py-1.5" />
              </template>
            </UEditor>
          </div>
        </div>
      </div>

      <!-- Neues Angebot -->
      <div class="rounded-xl border border-dashed border-default p-5 flex flex-col gap-3">
        <p class="text-sm font-medium text-highlighted">Neues Angebot</p>
        <div class="flex items-center gap-2 flex-wrap">
          <UInput v-model="newOffer.name" placeholder="Name, z. B. Coaching-Sitzung" class="flex-1 min-w-40" :ui="inputUi" @keyup.enter="addOffer" />
          <UInput v-model.number="newOffer.durationMinutes" type="number" min="5" max="480" class="w-24" :ui="inputUi" @keyup.enter="addOffer">
            <template #trailing>
              <span class="text-xs text-muted">min</span>
            </template>
          </UInput>
          <UInput v-model="newOffer.priceEuro" placeholder="kostenlos" class="w-32" :ui="inputUi" @keyup.enter="addOffer">
            <template #trailing>
              <span class="text-xs text-muted">€</span>
            </template>
          </UInput>
          <UButton label="Hinzufügen" icon="i-lucide-plus" :loading="creating" @click="addOffer" />
        </div>
        <p v-if="createError" class="text-sm text-error">{{ createError }}</p>
      </div>
    </div>

    <SettingsSection title="Geplante Features" description="Das kommt als Nächstes für deine Sitzungsangebote." class="mt-6">
      <div class="flex flex-col gap-2">
        <UpcomingFeature
          v-for="item in plannedFeatures"
          :key="item.title"
          v-bind="item"
        />
      </div>
    </SettingsSection>
  </div>
</template>
