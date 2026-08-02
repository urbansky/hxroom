<script setup lang="ts">
import { inject, computed, reactive, ref, watch, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import { useAvailableSlots } from '../composables/useAvailableSlots';
import { formatOfferPrice, renderDescription, descriptionProseClasses } from '../utils/offers';
import { createBookingSchema, type AvailableSlotResponse } from '@hxroom/shared';

const props = defineProps<{ id: string }>();

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const { offers, loading } = inject(OFFERS_KEY) as UseOffersReturn;
// Getter statt Wert übergeben: /offers/:id nutzt dieselbe Routen-Komponente für
// jedes Angebot (kein Neu-Mount bei ID-Wechsel über "Andere Sitzungsarten"), daher
// muss das Composable selbst reaktiv auf props.id reagieren und neu fetchen.
const { slots: availableSlots, loading: slotsLoading, refresh: refreshSlots } = useAvailableSlots(() => props.id);

const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null);
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach');

const offer = computed(() => offers.value.find((o) => o.id === props.id) ?? null);
const notFound = computed(() => !loading.value && !offer.value);

const descriptionHtml = computed(() => offer.value ? renderDescription(offer.value.description) : '');

const otherOffers = computed(() => offers.value.filter((o) => o.id !== props.id));

const TIME_ZONE = 'Europe/Berlin';

const dayFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, weekday: 'long' });
const dateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
// 'en-CA' liefert direkt "YYYY-MM-DD" – als zeitzonenkorrekter Gruppierungsschlüssel (Europe/Berlin, nicht Browser-Lokalzeit)
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month, day }
}

// Montag-first Wochentag rein aus Kalenderdatum (Y/M/D) – bewusst ohne Zeitzonen-Konvertierung,
// da "welcher Wochentag ist der 3.8.2026" unabhängig von der Zeitzone ist.
function weekdayOfDateKey(key: string) {
  const { year, month, day } = parseDateKey(key)
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

const todayKey = dateKeyFormatter.format(new Date())

const slotsByDay = computed(() => {
  const map = new Map<string, AvailableSlotResponse[]>()
  for (const slot of availableSlots.value) {
    const key = dateKeyFormatter.format(new Date(slot.start))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(slot)
  }
  return map
})

const monthsWithData = computed(() =>
  [...new Set([...slotsByDay.value.keys()].map(key => key.slice(0, 7)))].sort()
)

const monthIndex = ref(0)
const currentMonthKey = computed(() => monthsWithData.value[monthIndex.value] ?? null)

// Mittag UTC statt lokaler Mitternacht, damit die anschließende Formatierung mit
// timeZone: 'Europe/Berlin' unabhängig von der Browser-Zeitzone den korrekten
// Kalendertag zeigt (keine Verschiebung nahe der Tagesgrenze).
function dateKeyToUtcNoon(key: string) {
  const { year, month, day } = parseDateKey(key)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

const monthLabel = computed(() => {
  if (!currentMonthKey.value) return ''
  const label = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' }).format(dateKeyToUtcNoon(`${currentMonthKey.value}-01`))
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const calendarDays = computed(() => {
  if (!currentMonthKey.value) return []
  const [year, month] = currentMonthKey.value.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = weekdayOfDateKey(`${year}-${String(month).padStart(2, '0')}-01`)

  const cells: { dateKey: string; day: number; inMonth: boolean; isToday: boolean; hasSlots: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ dateKey: `pad-${i}`, day: 0, inMonth: false, isToday: false, hasSlots: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      dateKey,
      day,
      inMonth: true,
      isToday: dateKey === todayKey,
      hasSlots: slotsByDay.value.has(dateKey),
    })
  }
  return cells
})

const canGoPrevMonth = computed(() => monthIndex.value > 0)
const canGoNextMonth = computed(() => monthIndex.value < monthsWithData.value.length - 1)

type BookingStep = 'calendar' | 'form' | 'pending'
const bookingStep = ref<BookingStep>('calendar')

const selectedDayKey = ref<string | null>(null)
const selectedSlot = ref<AvailableSlotResponse | null>(null)

const bookingForm = reactive({ clientName: '', clientEmail: '', clientPhone: '', clientNote: '' })
const formError = ref<string | null>(null)
const submitting = ref(false)
const confirmedEmail = ref('')
// Wird angezeigt, wenn ein 409-Konflikt zurück zur Kalenderansicht springt – formError
// gehört zum Formular und wäre dort nicht mehr sichtbar, sobald bookingStep wechselt.
const calendarNotice = ref<string | null>(null)

// Angebotswechsel über "Andere Sitzungsarten" (gleiche Routen-Komponente, kein Neu-Mount):
// Kalender-/Zeitauswahl gehört zum vorherigen Angebot und muss zurückgesetzt werden.
watch(() => props.id, () => {
  monthIndex.value = 0
  selectedDayKey.value = null
  selectedSlot.value = null
  bookingStep.value = 'calendar'
})

function selectDay(dateKey: string) {
  if (!slotsByDay.value.has(dateKey)) return
  selectedDayKey.value = dateKey
  selectedSlot.value = null
  calendarNotice.value = null
}

function selectSlot(slot: AvailableSlotResponse) {
  selectedSlot.value = slot
  Object.assign(bookingForm, { clientName: '', clientEmail: '', clientPhone: '', clientNote: '' })
  formError.value = null
  bookingStep.value = 'form'
}

function backToCalendar() {
  bookingStep.value = 'calendar'
  formError.value = null
}

function prevMonth() {
  if (!canGoPrevMonth.value) return
  monthIndex.value--
  selectedDayKey.value = null
  selectedSlot.value = null
}

function nextMonth() {
  if (!canGoNextMonth.value) return
  monthIndex.value++
  selectedDayKey.value = null
  selectedSlot.value = null
}

const selectedDaySlots = computed(() => selectedDayKey.value ? slotsByDay.value.get(selectedDayKey.value) ?? [] : [])

const selectedDayLabel = computed(() => {
  if (!selectedDayKey.value) return ''
  const date = dateKeyToUtcNoon(selectedDayKey.value)
  return `${dayFormatter.format(date)}, ${dateFormatter.format(date)}`
})

const selectedSlotTimeLabel = computed(() => {
  if (!selectedSlot.value) return ''
  return `${timeFormatter.format(new Date(selectedSlot.value.start))} – ${timeFormatter.format(new Date(selectedSlot.value.end))} Uhr`
})

const noSlotsAvailable = computed(() => !slotsLoading.value && availableSlots.value.length === 0)

async function submitBooking() {
  if (!selectedSlot.value) return
  formError.value = null

  const parsed = createBookingSchema.safeParse({
    start: selectedSlot.value.start,
    clientName: bookingForm.clientName.trim(),
    clientEmail: bookingForm.clientEmail.trim(),
    clientPhone: bookingForm.clientPhone.trim() || undefined,
    clientNote: bookingForm.clientNote.trim() || undefined,
  })
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? 'Bitte überprüfe deine Angaben.'
    return
  }

  submitting.value = true
  try {
    const slug = window.location.hostname.split('.')[0]
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost'
    const res = await fetch(`${apiUrl}/api/v1/organizations/${slug}/offers/${props.id}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })

    if (!res.ok) {
      if (res.status === 409) {
        bookingStep.value = 'calendar'
        selectedDayKey.value = null
        selectedSlot.value = null
        calendarNotice.value = 'Dieser Termin ist leider nicht mehr verfügbar. Bitte wähle einen anderen Zeitpunkt.'
        refreshSlots()
        return
      }
      const body = await res.json().catch(() => null)
      formError.value = body?.message ?? 'Die Buchung konnte nicht angelegt werden.'
      return
    }

    confirmedEmail.value = parsed.data.clientEmail
    bookingStep.value = 'pending'
  } catch {
    formError.value = 'Die Buchung konnte nicht angelegt werden. Bitte versuche es erneut.'
  } finally {
    submitting.value = false
  }
}

const credentials = [
  { icon: 'i-lucide-graduation-cap', text: 'ICF-zertifiziert (ACC) · International Coaching Federation' },
  { icon: 'i-lucide-clock', text: '8 Jahre Coaching-Erfahrung · 340+ begleitete Klienten' },
  { icon: 'i-lucide-users', text: 'Ausgebildet in systemischem Coaching & NLP' },
];
</script>

<template>
  <!-- Ambient Effects -->
  <div class="glow-top" />
  <div class="glow-bottom" />

  <!-- Header -->
  <UHeader
    :title="coachName"
    :ui="{
      root: 'bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)',
      container: 'max-w-[900px] px-6 lg:px-10',
    }"
  >
    <template #left>
      <RouterLink to="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-[34px] rounded-[9px] overflow-hidden bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[17px] text-white/92 font-semibold shrink-0">
          <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
          <template v-else>{{ coachName.charAt(0) }}</template>
        </div>
        <span class="font-serif text-xl font-semibold text-gold-700 dark:text-gold-200 tracking-wide">{{ coachName }}</span>
      </RouterLink>
    </template>
    <template #default>
      <div class="hidden sm:flex items-center gap-6">
        <RouterLink to="/#about" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Über mich</RouterLink>
        <RouterLink to="/#offers" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Sitzungsarten</RouterLink>
      </div>
    </template>
    <template #right>
      <UButton v-if="offer" href="#slots" color="primary" icon="i-lucide-calendar" size="lg" class="px-5">Termin buchen</UButton>
    </template>
  </UHeader>

  <template v-if="loading">
    <div class="max-w-[720px] mx-auto px-6 pt-40 pb-20 flex justify-center">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-(--ui-text-dimmed)" />
    </div>
  </template>

  <template v-else-if="notFound">
    <div class="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6 text-center pt-24">
      <div class="size-16 rounded-2xl bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center">
        <UIcon name="i-lucide-search-x" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <div class="flex flex-col gap-2 max-w-sm">
        <h1 class="font-serif text-2xl font-light text-sage-950 dark:text-cream">Angebot nicht gefunden</h1>
        <p class="text-sm text-(--ui-text-muted) leading-relaxed">
          Dieses Angebot existiert nicht mehr oder ist aktuell nicht buchbar.
        </p>
      </div>
      <RouterLink to="/#offers" class="text-xs text-sage-400 hover:text-sage-500 transition-colors no-underline">
        Alle Sitzungsarten ansehen
      </RouterLink>
    </div>
  </template>

  <template v-else-if="offer">
    <!-- Angebot + Termine -->
    <section class="relative z-1 max-w-[720px] mx-auto px-6 pb-20" style="padding-top: 120px;">
      <RouterLink to="/#offers" class="inline-flex items-center gap-1.5 text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors no-underline mb-5">
        <UIcon name="i-lucide-chevron-left" class="size-3.5" />
        Alle Sitzungsarten
      </RouterLink>

      <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl p-8 flex flex-col gap-6">
        <div class="inline-flex items-center gap-2 bg-sage-400/10 border border-sage-400/20 rounded-full px-3.5 py-1.5 w-fit">
          <div class="size-1.5 rounded-full bg-sage-400" />
          <span class="text-[11px] text-sage-700 dark:text-sage-200 tracking-[0.08em] uppercase">Buchung · {{ coachName }}</span>
        </div>

        <h1 class="font-serif text-4xl font-light text-sage-950 dark:text-cream leading-[1.1] -mt-1">{{ offer.name }}</h1>

        <div class="flex gap-2.5">
          <UBadge color="neutral" variant="subtle" size="md">{{ offer.durationMinutes }} Minuten</UBadge>
          <UBadge v-if="offer.priceCents === null" color="primary" variant="subtle" size="md">Kostenlos</UBadge>
          <UBadge v-else color="neutral" variant="subtle" size="md">{{ formatOfferPrice(offer.priceCents) }}</UBadge>
        </div>

        <div v-if="descriptionHtml" :class="descriptionProseClasses" v-html="descriptionHtml" />

        <div class="flex items-center gap-3">
          <div class="size-11 rounded-full overflow-hidden bg-(--ui-bg-accented) border border-(--ui-border) shrink-0">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="coachName" class="size-full object-cover" />
          </div>
          <div>
            <div class="text-[13px] text-(--ui-text) font-medium">{{ coachName }}</div>
            <div class="text-xs text-(--ui-text-dimmed) mt-0.5">Life & Business Coach</div>
          </div>
        </div>

        <USeparator />

        <template v-if="bookingStep === 'pending'">
          <!-- Termin vorgemerkt -->
          <div class="flex flex-col items-center text-center gap-4 py-4">
            <div class="size-[52px] rounded-full bg-sage-400/10 border border-sage-400/25 flex items-center justify-center">
              <UIcon name="i-lucide-mail" class="size-6 text-sage-500" />
            </div>
            <div>
              <h2 class="font-serif text-2xl font-light text-sage-950 dark:text-cream mb-1.5">Termin vorgemerkt</h2>
              <p class="text-sm text-(--ui-text-muted)">Wir haben eine E-Mail an <strong class="text-(--ui-text)">{{ confirmedEmail }}</strong> geschickt.</p>
            </div>

            <div class="flex items-start gap-3 bg-gold-400/10 border border-gold-400/25 rounded-xl px-4.5 py-4 text-left">
              <UIcon name="i-lucide-triangle-alert" class="size-4.5 text-gold-600 dark:text-gold-300 shrink-0 mt-0.5" />
              <p class="text-[13px] text-(--ui-text-muted) leading-relaxed">
                <strong class="text-(--ui-text)">Noch nicht verbindlich:</strong> Bitte bestätige den Termin über den Link in dieser E-Mail – erst dann ist er für dich reserviert. Ohne Bestätigung wird der Termin automatisch wieder freigegeben.
              </p>
            </div>

            <div class="w-full bg-(--ui-bg-accented)/50 border border-(--ui-border) rounded-xl p-5 flex flex-col gap-2 text-left">
              <div class="flex items-center justify-between text-[13px]">
                <span class="text-(--ui-text-dimmed)">Angebot</span>
                <span class="text-(--ui-text)">{{ offer?.name }} · {{ offer?.durationMinutes }} Minuten</span>
              </div>
              <div class="flex items-center justify-between text-[13px]">
                <span class="text-(--ui-text-dimmed)">Termin</span>
                <span class="text-(--ui-text)">{{ selectedDayLabel }}, {{ selectedSlotTimeLabel }}</span>
              </div>
              <div class="flex items-center justify-between text-[13px]">
                <span class="text-(--ui-text-dimmed)">Coach</span>
                <span class="text-(--ui-text)">{{ coachName }}</span>
              </div>
            </div>

            <p class="text-xs text-(--ui-text-dimmed)">Keine E-Mail erhalten? Prüfe deinen Spam-Ordner.</p>

            <RouterLink to="/" class="text-xs bg-(--ui-bg-accented) border border-(--ui-border) rounded-lg px-4 py-2 text-(--ui-text) hover:bg-(--ui-bg-elevated) transition-colors no-underline">
              Zur Übersicht
            </RouterLink>
          </div>
        </template>

        <template v-else-if="bookingStep === 'form'">
          <!-- Klientenformular -->
          <div class="flex flex-col gap-5">
            <div class="flex items-baseline gap-4" id="slots">
              <h2 class="font-serif text-xl font-light text-sage-950 dark:text-cream">Deine Daten</h2>
              <span class="text-xs text-(--ui-text-dimmed) tracking-wide">{{ selectedDayLabel }}, {{ selectedSlotTimeLabel }}</span>
            </div>

            <form class="flex flex-col gap-3.5" novalidate @submit.prevent="submitBooking">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div class="flex flex-col gap-1.5">
                  <label for="bf-name" class="text-xs text-(--ui-text-muted)">Name</label>
                  <input
                    id="bf-name" v-model="bookingForm.clientName" type="text" autocomplete="name" placeholder="Vor- und Nachname"
                    class="w-full rounded-[10px] border border-(--ui-border) bg-(--ui-bg) px-3.5 py-2.5 text-[13px] text-(--ui-text) placeholder:text-(--ui-text-dimmed) focus:outline-none focus:border-sage-400/40 transition-colors"
                  >
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="bf-email" class="text-xs text-(--ui-text-muted)">E-Mail</label>
                  <input
                    id="bf-email" v-model="bookingForm.clientEmail" type="email" autocomplete="email" placeholder="name@beispiel.de"
                    class="w-full rounded-[10px] border border-(--ui-border) bg-(--ui-bg) px-3.5 py-2.5 text-[13px] text-(--ui-text) placeholder:text-(--ui-text-dimmed) focus:outline-none focus:border-sage-400/40 transition-colors"
                  >
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="bf-phone" class="text-xs text-(--ui-text-muted)">Telefon <span class="text-(--ui-text-dimmed)">(optional)</span></label>
                <input
                  id="bf-phone" v-model="bookingForm.clientPhone" type="tel" autocomplete="tel" placeholder="+49 …"
                  class="w-full rounded-[10px] border border-(--ui-border) bg-(--ui-bg) px-3.5 py-2.5 text-[13px] text-(--ui-text) placeholder:text-(--ui-text-dimmed) focus:outline-none focus:border-sage-400/40 transition-colors"
                >
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="bf-note" class="text-xs text-(--ui-text-muted)">Notiz <span class="text-(--ui-text-dimmed)">(optional)</span></label>
                <textarea
                  id="bf-note" v-model="bookingForm.clientNote" rows="3" placeholder="Was möchtest du mir vorab mitteilen?"
                  class="w-full rounded-[10px] border border-(--ui-border) bg-(--ui-bg) px-3.5 py-2.5 text-[13px] text-(--ui-text) placeholder:text-(--ui-text-dimmed) focus:outline-none focus:border-sage-400/40 transition-colors resize-y"
                />
              </div>

              <p v-if="formError" class="text-[13px] text-gold-600 dark:text-gold-300">{{ formError }}</p>

              <div class="flex items-center gap-3">
                <UButton type="submit" color="primary" size="sm" :loading="submitting">Termin anfragen</UButton>
                <button type="button" class="inline-flex items-center gap-1.5 text-[13px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors" @click="backToCalendar">
                  <UIcon name="i-lucide-chevron-left" class="size-3.5" /> Anderen Termin wählen
                </button>
              </div>
            </form>
          </div>
        </template>

        <template v-else>
          <div class="flex items-baseline gap-4" id="slots">
            <h2 class="font-serif text-xl font-light text-sage-950 dark:text-cream">Freie Termine</h2>
            <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Alle Zeiten in MEZ</span>
          </div>

          <p v-if="calendarNotice" class="flex items-center gap-1.5 text-sm text-gold-600 dark:text-gold-300">
            <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0" />
            {{ calendarNotice }}
          </p>

          <p v-if="noSlotsAvailable" class="text-sm text-(--ui-text-muted)">
            Aktuell keine freien Termine – schau bald wieder vorbei.
          </p>

          <div v-else-if="slotsLoading" class="flex justify-center py-10">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-(--ui-text-dimmed)" />
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Kalender-Panel -->
            <div class="bg-(--ui-bg) border border-(--ui-border) rounded-[14px] p-4">
              <div class="flex items-center justify-between mb-3">
                <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" :disabled="!canGoPrevMonth" @click="prevMonth" />
                <div class="font-serif text-sm text-sage-950 dark:text-cream">{{ monthLabel }}</div>
                <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" :disabled="!canGoNextMonth" @click="nextMonth" />
              </div>
              <div class="grid grid-cols-7 gap-1 text-center text-[10px] text-(--ui-text-dimmed) uppercase tracking-wide mb-1">
                <span v-for="d in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="d">{{ d }}</span>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <button
                  v-for="cell in calendarDays"
                  :key="cell.dateKey"
                  type="button"
                  :disabled="!cell.hasSlots"
                  :class="[
                    'aspect-square rounded-full text-[12px] flex items-center justify-center transition-colors',
                    !cell.inMonth && 'invisible',
                    cell.hasSlots ? 'cursor-pointer bg-sage-400/15 text-sage-950 dark:text-cream hover:bg-sage-400/25' : 'text-(--ui-text-dimmed) cursor-default',
                    cell.dateKey === selectedDayKey && 'bg-gradient-to-br from-sage-600 to-sage-400 text-white hover:bg-none',
                    cell.isToday && cell.dateKey !== selectedDayKey && 'ring-1 ring-sage-400',
                  ]"
                  @click="selectDay(cell.dateKey)"
                >{{ cell.day }}</button>
              </div>
              <div class="flex items-center gap-1.5 mt-3 text-[11px] text-(--ui-text-dimmed)">
                <span class="size-1.5 rounded-full bg-sage-400" /> Freie Termine verfügbar
              </div>
            </div>

            <!-- Zeiten-Panel -->
            <div class="bg-(--ui-bg) border border-(--ui-border) rounded-[14px] p-4 min-h-[260px] flex flex-col">
              <div v-if="!selectedDayKey" class="m-auto text-center flex flex-col items-center gap-2 max-w-[200px]">
                <UIcon name="i-lucide-calendar" class="size-6 text-(--ui-text-dimmed)" />
                <p class="text-xs text-(--ui-text-dimmed)">Wähle einen markierten Tag im Kalender, um verfügbare Uhrzeiten zu sehen.</p>
              </div>
              <template v-else>
                <div class="mb-3">
                  <div class="font-serif text-lg text-sage-950 dark:text-cream">{{ selectedDayLabel }}</div>
                  <div class="text-xs text-(--ui-text-dimmed)">Alle Zeiten in MEZ</div>
                </div>
                <div class="flex flex-col gap-2 overflow-y-auto max-h-[260px]">
                  <button
                    v-for="slot in selectedDaySlots"
                    :key="slot.start"
                    type="button"
                    class="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border transition-colors"
                    :class="selectedSlot?.start === slot.start ? 'border-sage-400/40 bg-sage-400/10' : 'border-(--ui-border) hover:border-sage-400/30 hover:bg-sage-400/5'"
                    @click="selectSlot(slot)"
                  >
                    <span class="text-[13px] text-(--ui-text)">{{ timeFormatter.format(new Date(slot.start)) }} – {{ timeFormatter.format(new Date(slot.end)) }} Uhr</span>
                    <span class="text-[11px] text-sage-600 dark:text-sage-200">Auswählen</span>
                  </button>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Andere Sitzungsarten -->
    <template v-if="otherOffers.length">
      <div class="section-divider" />
      <section class="relative z-1 max-w-[720px] mx-auto px-6 py-10">
        <div class="flex items-baseline gap-4 mb-7">
          <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream">Andere Sitzungsarten</h2>
          <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Passt doch nicht ganz?</span>
        </div>

        <div class="flex flex-col gap-2">
          <RouterLink
            v-for="other in otherOffers"
            :key="other.id"
            :to="`/offers/${other.id}`"
            class="flex items-center justify-between px-3.5 py-3 rounded-[10px] border bg-black/[0.025] dark:bg-white/[0.025] border-black/[0.04] dark:border-white/[0.04] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors no-underline"
          >
            <div class="flex items-center gap-2.5">
              <div class="size-2 rounded-full bg-sage-600" />
              <div>
                <div class="text-[15px] text-(--ui-text)">{{ other.name }}</div>
                <div class="text-xs text-(--ui-text-dimmed)">{{ other.durationMinutes }} Minuten</div>
              </div>
            </div>
            <div class="flex items-center gap-2.5">
              <span
                :class="other.priceCents === null
                  ? 'text-sage-400 text-sm'
                  : 'font-serif text-lg text-sage-950 dark:text-cream'"
              >{{ formatOfferPrice(other.priceCents) }}</span>
              <div class="size-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <UIcon name="i-lucide-chevron-right" class="size-2.5 text-(--ui-text-dimmed)" />
              </div>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>

    <!-- About -->
    <div class="section-divider" />
    <section class="relative z-1 max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-12" id="about">
      <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream mb-5">Über mich</h2>

      <blockquote class="border-l-2 border-sage-600 pl-5 py-3 -mt-6 mb-0">
        <p class="font-serif text-xl italic text-sage-950 dark:text-cream font-light leading-relaxed">
          „Klarheit entsteht nicht durch mehr Nachdenken – sondern durch andere Gespräche."
        </p>
      </blockquote>

      <div>
        <p class="text-[15px] text-(--ui-text-muted) leading-loose mb-4">
          Ich bin Anna, zertifizierte Life & Business Coach aus Berlin. Nach zehn Jahren in der Unternehmensberatung habe ich gemerkt: Die wichtigsten Veränderungen in meinem Leben kamen nicht aus Strategiepapieren, sondern aus echten Gesprächen, die mich herausgefordert haben.
        </p>
        <p class="text-[15px] text-(--ui-text-muted) leading-loose">
          Heute begleite ich Menschen, die an einem Wendepunkt stehen – die spüren, dass etwas nicht mehr stimmt, aber noch nicht wissen, wohin es gehen soll.
        </p>

        <div class="mt-7 flex flex-col gap-2.5">
          <div v-for="cred in credentials" :key="cred.text" class="flex items-center gap-2.5 p-3 px-3.5 bg-black/[0.025] dark:bg-white/[0.025] border border-black/[0.04] dark:border-white/[0.04] rounded-[10px]">
            <div class="size-7 rounded-[7px] bg-sage-400/10 border border-sage-400/15 flex items-center justify-center shrink-0">
              <UIcon :name="cred.icon" class="size-3.5 text-sage-400" />
            </div>
            <span class="text-[13px] text-(--ui-text-muted)">{{ cred.text }}</span>
          </div>
        </div>
      </div>
    </section>
  </template>

  <!-- Footer -->
  <UFooter>
    <template #left>
      <span class="text-xs text-(--ui-text-dimmed)">
        Gebrandeter HxRoom von
        <a href="https://hxroom.io" target="_blank" class="text-sage-400/70 hover:text-sage-400 transition-colors no-underline">hxroom.io</a>
        &nbsp;·&nbsp;DSGVO-konform&nbsp;·&nbsp;Server Deutschland
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-5">
        <UColorModeButton size="xs" />
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Datenschutz</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Impressum</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">AGB</a>
      </div>
    </template>
  </UFooter>
</template>

<style scoped>
.glow-top {
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(92, 110, 91, 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.glow-bottom {
  position: fixed;
  bottom: -300px;
  right: -200px;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(181, 147, 90, 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
  max-width: 720px;
  margin: 0 auto;
}
</style>
