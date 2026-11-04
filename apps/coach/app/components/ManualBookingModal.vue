<script setup lang="ts">
import { MANUAL_BOOKING_MAX_COUNT, type ClientListItem, type ManualBookingCheckResponse, type ManualBookingResponse, type OfferResponse } from '@hxroom/shared'

/**
 * Termin manuell anlegen (doc/konzept-manuelle-termine.md): ein Termin zu einem gewählten
 * Zeitpunkt, oder mehrere in festem Rhythmus. Abgesprochen mit dem Klienten und deshalb
 * sofort bestätigt; der Klient bekommt eine Mail mit allen Terminen.
 *
 * Wer eingeladen wird, regeln useBookingInvitee und BookingInviteeFields wie beim
 * Spontan-Termin: `client` steht fest (Klientenseite, Folgetermin), `clients` ist die
 * Auswahl (Termine).
 *
 * Mehrere Termine sind eine Liste konkreter Zeiten, keine Regel: Jede Zeile lässt sich
 * verschieben oder streichen, und je Zeile meldet die API Überschneidungen und Zeiten
 * außerhalb der Verfügbarkeit. Beides hindert nicht am Anlegen.
 */
const props = defineProps<{
  client?: { id: string, name: string } | null
  clients?: ClientListItem[]
  offers: OfferResponse[]
  /** Vorbelegung, etwa für den Folgetermin oder einen Klick in den Kalender. */
  preset?: { start?: Date | null, offerId?: string | null, durationMinutes?: number | null } | null
}>()

const emit = defineEmits<{ created: [bookings: ManualBookingResponse] }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()
const toast = useToast()

// Eingabeflächen stehen weiß auf dem Modal-Grund (siehe AdHocSessionModal).
const inputUi = { base: 'bg-white dark:bg-elevated', content: 'bg-white dark:bg-muted' }

/** Näher als das am Jetzt ist ein Termin ein Spontan-Termin. */
const MIN_LEAD_MINUTES = 15
const NO_OFFER = 'none'
const DURATION_OPTIONS = [30, 45, 60, 90]
const REPEAT_ITEMS = [
  { label: 'Nicht wiederholen', value: 'none' },
  { label: 'Wöchentlich', value: 'weekly' },
  { label: 'Alle zwei Wochen', value: 'biweekly' },
]

const invitee = useBookingInvitee(() => props)
const { displayName, byEmail, email, selectedClient } = invitee

const offerChoice = ref<string>(NO_OFFER)
const durationMinutes = ref(60)
const date = ref('')
const time = ref('')
const repeat = ref<'none' | 'weekly' | 'biweekly'>('none')
const count = ref(5)

interface Row { key: number, date: string, time: string, editing: boolean }
const rows = ref<Row[]>([])
let rowKey = 0

const checks = ref<ManualBookingCheckResponse>([])
const pending = ref(false)
const errorMessage = ref<string | null>(null)
/** Gesetzt nach dem Anlegen – ab da zeigt das Modal das Ergebnis statt des Formulars. */
const created = ref<ManualBookingResponse | null>(null)

// Nur aktive Angebote: Ein deaktiviertes Angebot ist eines, das der Coach gerade nicht anbietet.
const activeOffers = computed(() => props.offers.filter(offer => offer.isActive))
const offerItems = computed(() => [
  ...activeOffers.value.map(offer => ({ label: `${offer.name} · ${offer.durationMinutes} Min.`, value: offer.id })),
  { label: 'Ohne Angebot', value: NO_OFFER },
])
const selectedOffer = computed(() => activeOffers.value.find(offer => offer.id === offerChoice.value))
const effectiveDuration = computed(() => selectedOffer.value?.durationMinutes ?? durationMinutes.value)
const durationItems = computed(() =>
  [...new Set([...DURATION_OPTIONS, durationMinutes.value])]
    .sort((a, b) => a - b)
    .map(minutes => ({ label: `${minutes} Min.`, value: minutes })),
)

// Datum und Uhrzeit in der Zeitzone des Browsers – so, wie der Coach sie eingibt.
function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
/** "2026-11-17" + "10:00" → Zeitpunkt in Ortszeit; ohne Offset liest der Browser lokal. */
function combine(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null
  const result = new Date(`${dateValue}T${timeValue}`)
  return Number.isNaN(result.getTime()) ? null : result
}

const rowLabelFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
function rowLabel(row: Row): string {
  const start = combine(row.date, row.time)
  return start ? `${rowLabelFormatter.format(start)} · ${row.time}` : 'Zeit fehlt'
}

// Die Liste folgt Datum, Uhrzeit, Rhythmus und Anzahl. Wer danach eine Zeile anpasst und
// dann den Rhythmus ändert, bekommt eine neue Liste – der Rhythmus ist die Grundlage.
function regenerateRows() {
  const base = combine(date.value, time.value)
  if (!base) {
    rows.value = []
    return
  }
  const total = repeat.value === 'none' ? 1 : Math.min(Math.max(count.value || 1, 2), MANUAL_BOOKING_MAX_COUNT)
  const stepDays = repeat.value === 'biweekly' ? 14 : 7
  rows.value = Array.from({ length: total }, (_, index) => {
    // setDate statt Millisekunden: Über eine Zeitumstellung hinweg bleibt die Uhrzeit gleich.
    const start = new Date(base)
    start.setDate(start.getDate() + index * stepDays)
    return { key: ++rowKey, date: toDateInput(start), time: toTimeInput(start), editing: false }
  })
}
watch([date, time, repeat, count], regenerateRows)

function removeRow(row: Row) {
  rows.value = rows.value.filter(other => other.key !== row.key)
}

const rowStarts = computed(() => rows.value.map(row => combine(row.date, row.time)))
const starts = computed(() => rowStarts.value.filter((start): start is Date => start !== null).map(start => start.toISOString()))

// Was am Anlegen hindert, je Zeile: fehlende Zeit, zu nah am Jetzt, doppelt.
function rowError(index: number): string | null {
  const start = rowStarts.value[index]
  if (!start) return 'Datum und Uhrzeit fehlen.'
  if (start.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) {
    return start.getTime() < Date.now() ? 'Liegt in der Vergangenheit.' : 'Beginnt gleich – dafür gibt es den Spontan-Termin.'
  }
  const duplicate = rowStarts.value.findIndex(other => other?.getTime() === start.getTime())
  if (duplicate !== index) return 'Diese Zeit steht schon in der Liste.'
  return null
}

const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })
// Hinweise der API, je Zeile: Überschneidung mit einem anderen Termin, außerhalb der Verfügbarkeit.
function rowHint(index: number): string | null {
  const start = rowStarts.value[index]
  if (!start) return null
  const check = checks.value.find(item => new Date(item.start).getTime() === start.getTime())
  if (!check) return null
  const [conflict] = check.conflicts
  if (conflict) {
    const more = check.conflicts.length > 1 ? ` und ${check.conflicts.length - 1} weiteren` : ''
    return `Überschneidet sich mit ${conflict.clientName}, ${timeFormatter.format(new Date(conflict.start))}${more}.`
  }
  if (check.outsideAvailability) return 'Außerhalb deiner Verfügbarkeit.'
  return null
}

// Die Prüfung läuft kurz nach der letzten Änderung, nicht bei jedem Tastendruck.
let checkTimer: ReturnType<typeof setTimeout> | undefined
watch([starts, effectiveDuration, offerChoice], () => {
  clearTimeout(checkTimer)
  if (!open.value || !starts.value.length) {
    checks.value = []
    return
  }
  checkTimer = setTimeout(async () => {
    try {
      checks.value = await $api<ManualBookingCheckResponse>('/bookings/manual/check', {
        method: 'POST',
        body: { ...timingPayload(), starts: starts.value },
      })
    } catch {
      // Die Hinweise sind eine Hilfe, kein Hindernis – ohne sie lässt sich trotzdem anlegen.
      checks.value = []
    }
  }, 300)
})
onUnmounted(() => clearTimeout(checkTimer))

// Angebot oder Dauer – weglassen statt null, beides ist im Schema optional.
function timingPayload() {
  return selectedOffer.value ? { offerId: selectedOffer.value.id } : { durationMinutes: durationMinutes.value }
}

const termsLabel = computed(() => rows.value.length === 1 ? 'Termin' : `${rows.value.length} Termine`)

const canSubmit = computed(() =>
  !pending.value
  && invitee.isComplete.value
  && rows.value.length > 0
  && rows.value.every((_, index) => rowError(index) === null),
)

// Wer was bekommt – bei einer neuen Adresse ausgeschrieben, damit ein Tippfehler auffällt.
const recipientHint = computed(() => {
  const what = rows.value.length > 1
    ? `eine E-Mail mit allen ${rows.value.length} Terminen, Kalendereinträgen und den Links zum Warteraum`
    : 'eine E-Mail mit Kalendereintrag und dem Link zum Warteraum'
  if (byEmail.value) {
    return email.value.trim() ? `${email.value.trim()} bekommt ${what}.` : null
  }
  if (!displayName.value) return null
  const address = selectedClient.value?.email
  return address ? `${displayName.value} bekommt ${what} an ${address}.` : `${displayName.value} bekommt ${what}.`
})

// Beim Öffnen zurücksetzen und vorbelegen: Angebot aus der Vorbelegung, sonst das einzige
// aktive; Zeitpunkt aus der Vorbelegung, sonst morgen um 10 Uhr.
watch(open, (isOpen) => {
  if (!isOpen) return
  invitee.reset()
  const presetOffer = activeOffers.value.find(offer => offer.id === props.preset?.offerId)
  offerChoice.value = presetOffer?.id
    ?? (props.preset?.durationMinutes ? NO_OFFER : null)
    ?? (activeOffers.value.length === 1 ? activeOffers.value[0]!.id : NO_OFFER)
  durationMinutes.value = props.preset?.durationMinutes ?? 60

  const start = props.preset?.start ? new Date(props.preset.start) : (() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow
  })()
  repeat.value = 'none'
  count.value = 5
  date.value = toDateInput(start)
  time.value = toTimeInput(start)
  regenerateRows()
  checks.value = []
  errorMessage.value = null
  created.value = null
})

async function submit() {
  if (!canSubmit.value) return
  pending.value = true
  errorMessage.value = null

  try {
    created.value = await $api<ManualBookingResponse>('/bookings/manual', {
      method: 'POST',
      body: { ...invitee.payload(), ...timingPayload(), starts: starts.value },
    })
    emit('created', created.value)
  } catch (err: any) {
    errorMessage.value = err?.statusCode === 409
      ? 'Zu einer dieser Zeiten beginnt schon ein anderer Termin.'
      : 'Der Termin konnte nicht angelegt werden.'
  } finally {
    pending.value = false
  }
}

async function copyLink() {
  const [first] = created.value ?? []
  if (!first) return
  try {
    await navigator.clipboard.writeText(first.callUrl)
    toast.add({ title: 'Link kopiert', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: 'Markiere den Link und kopiere ihn von Hand.', color: 'warning' })
  }
}

const createdDescription = computed(() => {
  const list = created.value ?? []
  if (list.length > 1) return `${list.length} Termine stehen. Die E-Mail mit allen Terminen ist unterwegs.`
  return 'Der Termin steht. Die E-Mail mit Kalendereintrag ist unterwegs.'
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Termin anlegen"
    :description="created ? createdDescription : 'Für einen abgesprochenen Termin – er ist sofort bestätigt.'"
  >
    <template #body>
      <div v-if="created" class="flex flex-col gap-4">
        <ul class="flex flex-col gap-1 text-sm">
          <li v-for="booking in created" :key="booking.id" class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar-check" class="size-4 text-success shrink-0" />
            <span class="text-highlighted">{{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}</span>
            <span class="text-muted truncate">· {{ booking.offerName }}</span>
          </li>
        </ul>

        <UFormField v-if="created.length === 1" label="Zugangslink" help="Falls du ihn zusätzlich selbst schicken möchtest.">
          <div class="flex gap-2">
            <UInput :model-value="created[0]!.callUrl" readonly class="flex-1" :ui="inputUi" />
            <UButton icon="i-lucide-copy" color="neutral" variant="outline" aria-label="Link kopieren" @click="copyLink" />
          </div>
        </UFormField>
      </div>

      <div v-else class="flex flex-col gap-4">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />

        <BookingInviteeFields :invitee="invitee" :client="props.client" :clients="props.clients" />

        <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <UFormField label="Angebot">
            <USelect v-model="offerChoice" :items="offerItems" class="w-full" :ui="inputUi" />
          </UFormField>
          <UFormField label="Dauer">
            <USelect
              v-if="!selectedOffer"
              v-model="durationMinutes"
              :items="durationItems"
              class="w-full"
              :ui="inputUi"
            />
            <p v-else class="h-8 flex items-center text-sm text-muted">{{ selectedOffer.durationMinutes }} Min.</p>
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Datum" required>
            <UInput v-model="date" type="date" class="w-full" :ui="inputUi" />
          </UFormField>
          <UFormField label="Uhrzeit" required>
            <UInput v-model="time" type="time" step="900" class="w-full" :ui="inputUi" />
          </UFormField>
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <UFormField label="Wiederholen">
            <USelect v-model="repeat" :items="REPEAT_ITEMS" class="w-full" :ui="inputUi" />
          </UFormField>
          <UFormField v-if="repeat !== 'none'" label="Anzahl">
            <UInputNumber v-model="count" :min="2" :max="MANUAL_BOOKING_MAX_COUNT" class="w-full" :ui="inputUi" />
          </UFormField>
        </div>

        <!-- Ein Termin: Hinweise direkt unter den Feldern. Mehrere: die Liste, je Zeile
             änderbar und mit ihren eigenen Hinweisen. -->
        <template v-if="repeat === 'none'">
          <p v-if="rowError(0)" class="text-sm text-error">{{ rowError(0) }}</p>
          <p v-else-if="rowHint(0)" class="text-sm text-warning flex items-center gap-1.5">
            <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0" />
            {{ rowHint(0) }}
          </p>
        </template>

        <ul v-else class="max-h-72 overflow-y-auto rounded-lg border border-default divide-y divide-default bg-white dark:bg-muted">
          <li v-for="(row, index) in rows" :key="row.key" class="flex flex-col gap-1 px-3 py-2">
            <div class="flex items-center gap-2">
              <template v-if="row.editing">
                <UInput v-model="row.date" type="date" size="sm" class="flex-1 min-w-0" :ui="inputUi" />
                <UInput v-model="row.time" type="time" step="900" size="sm" class="w-28" :ui="inputUi" />
                <UButton icon="i-lucide-check" color="neutral" variant="ghost" size="xs" aria-label="Fertig" @click="row.editing = false" />
              </template>
              <template v-else>
                <span class="flex-1 min-w-0 text-sm tabular-nums text-highlighted">{{ rowLabel(row) }}</span>
                <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Zeit ändern" @click="row.editing = true" />
              </template>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Termin streichen"
                :disabled="rows.length <= 1"
                @click="removeRow(row)"
              />
            </div>
            <p v-if="rowError(index)" class="text-xs text-error">{{ rowError(index) }}</p>
            <p v-else-if="rowHint(index)" class="text-xs text-warning flex items-center gap-1">
              <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
              {{ rowHint(index) }}
            </p>
          </li>
        </ul>

        <p v-if="recipientHint" class="text-sm text-muted flex items-start gap-1.5">
          <UIcon name="i-lucide-mail" class="size-4 shrink-0 mt-0.5" />
          {{ recipientHint }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <template v-if="created">
          <UButton color="neutral" variant="outline" label="Schließen" @click="open = false" />
          <UButton
            v-if="created.length === 1"
            :to="`/bookings/${created[0]!.id}`"
            icon="i-lucide-arrow-right"
            trailing
            label="Zum Termin"
            @click="open = false"
          />
        </template>
        <template v-else>
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
          <UButton
            icon="i-lucide-calendar-plus"
            :loading="pending"
            :disabled="!canSubmit"
            :label="`${termsLabel} anlegen`"
            @click="submit"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>
