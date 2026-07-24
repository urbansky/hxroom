<script setup lang="ts">
import type { OfferResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

interface OfferRow {
  id: string
  name: string
  durationMinutes: number
  priceEuro: string
  isActive: boolean
}

function toRow(offer: OfferResponse): OfferRow {
  return {
    id: offer.id,
    name: offer.name,
    durationMinutes: offer.durationMinutes,
    priceEuro: offer.priceCents != null ? (offer.priceCents / 100).toFixed(2) : '',
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

const rows = ref<OfferRow[]>([])
const savedRows = ref<Record<string, OfferRow>>({})

await useFetch<OfferResponse[]>('/offers', {
  $fetch: $api,
  onResponse({ response }) {
    const data = (response._data as OfferResponse[]).map(toRow)
    rows.value = data
    savedRows.value = Object.fromEntries(data.map(row => [row.id, { ...row }]))
  },
})

const saveStatus = ref<Record<string, 'saving' | 'saved' | 'error' | null>>({})
let savedTimer: ReturnType<typeof setTimeout> | null = null

function isUnchanged(row: OfferRow): boolean {
  const saved = savedRows.value[row.id]
  return !!saved
    && saved.name === row.name
    && saved.durationMinutes === row.durationMinutes
    && saved.priceEuro === row.priceEuro
}

async function saveRow(row: OfferRow) {
  if (isUnchanged(row) || !row.name.trim() || !row.durationMinutes) return
  if (savedTimer) clearTimeout(savedTimer)
  saveStatus.value[row.id] = 'saving'
  try {
    await $api(`/offers/${row.id}`, {
      method: 'PATCH',
      body: {
        name: row.name.trim(),
        durationMinutes: row.durationMinutes,
        priceCents: parsePriceCents(row.priceEuro),
      },
    })
    savedRows.value[row.id] = { ...row }
    saveStatus.value[row.id] = 'saved'
    savedTimer = setTimeout(() => { saveStatus.value[row.id] = null }, 2500)
  } catch {
    saveStatus.value[row.id] = 'error'
  }
}

async function toggleActive(row: OfferRow) {
  saveStatus.value[row.id] = 'saving'
  try {
    await $api(`/offers/${row.id}`, { method: 'PATCH', body: { isActive: row.isActive } })
    savedRows.value[row.id] = { ...row }
    saveStatus.value[row.id] = 'saved'
    savedTimer = setTimeout(() => { saveStatus.value[row.id] = null }, 2500)
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
    savedRows.value[row.id] = { ...row }
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
  <div class="p-4 sm:p-6 max-w-2xl mx-auto w-full">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Sitzungsangebote</h1>
    <p class="text-muted mb-8">Lege fest, welche Sitzungsformate deine Klienten buchen können – mit Name, Dauer und Preis.</p>

    <SettingsSection title="Deine Angebote" description="Änderungen an Name, Dauer und Preis werden beim Verlassen des Felds automatisch gespeichert.">
      <div class="flex flex-col gap-2">
        <p v-if="!rows.length" class="text-sm text-muted">Noch keine Angebote angelegt.</p>

        <div
          v-for="row in rows"
          :key="row.id"
          class="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-default bg-neutral-50 dark:bg-neutral-800/50"
        >
          <UInput v-model="row.name" placeholder="Name" class="flex-1 min-w-40" :ui="inputUi" @blur="saveRow(row)" />
          <UInput v-model.number="row.durationMinutes" type="number" min="5" max="480" class="w-24" :ui="inputUi" @blur="saveRow(row)">
            <template #trailing>
              <span class="text-xs text-muted">min</span>
            </template>
          </UInput>
          <UInput v-model="row.priceEuro" placeholder="kostenlos" class="w-32" :ui="inputUi" @blur="saveRow(row)">
            <template #trailing>
              <span class="text-xs text-muted">€</span>
            </template>
          </UInput>

          <div class="flex items-center gap-2 ml-auto">
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

        <!-- Neues Angebot -->
        <div class="flex items-center gap-2 flex-wrap p-3 rounded-lg border border-dashed border-default">
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
    </SettingsSection>

    <SettingsSection title="Geplante Features" description="Das kommt als Nächstes für deine Sitzungsangebote." class="hidden mt-6">
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
