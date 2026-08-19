<script setup lang="ts">
import { inject, computed, reactive, ref, watch, type Ref } from 'vue';
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach';
import { OFFERS_KEY, type UseOffersReturn } from '../composables/useOffers';
import { useAvailableSlots } from '../composables/useAvailableSlots';
import { formatOfferPrice, renderDescription, descriptionProseClasses } from '../utils/offers';
import { apiUrl, orgSlug } from '../utils/api';
import { dateKey, dateKeyToUtcNoon, formatDayDate, formatMonthYear, formatTimeRange, weekdayOfDateKey } from '../utils/datetime';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ContentCard from '../components/ContentCard.vue';
import SectionHeading from '../components/SectionHeading.vue';
import OfferListItem from '../components/OfferListItem.vue';
import AboutSection from '../components/AboutSection.vue';
import StatusPanel from '../components/StatusPanel.vue';
import AppointmentSummary from '../components/AppointmentSummary.vue';
import LoadingState from '../components/LoadingState.vue';
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

const todayKey = dateKey(new Date());

const slotsByDay = computed(() => {
  const map = new Map<string, AvailableSlotResponse[]>()
  for (const slot of availableSlots.value) {
    const key = dateKey(slot.start)
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

const monthLabel = computed(() =>
  currentMonthKey.value ? formatMonthYear(dateKeyToUtcNoon(`${currentMonthKey.value}-01`)) : ''
)

const calendarDays = computed(() => {
  if (!currentMonthKey.value) return []
  const [year, month] = currentMonthKey.value.split('-').map(Number)
  const daysInMonth = new Date(year!, month!, 0).getDate()
  const firstWeekday = weekdayOfDateKey(`${year}-${String(month).padStart(2, '0')}-01`)

  const cells: { dateKey: string; day: number; inMonth: boolean; isToday: boolean; hasSlots: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ dateKey: `pad-${i}`, day: 0, inMonth: false, isToday: false, hasSlots: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      dateKey: key,
      day,
      inMonth: true,
      isToday: key === todayKey,
      hasSlots: slotsByDay.value.has(key),
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

const selectedDayLabel = computed(() =>
  selectedDayKey.value ? formatDayDate(dateKeyToUtcNoon(selectedDayKey.value)) : ''
)

const selectedSlotTimeLabel = computed(() =>
  selectedSlot.value ? `${formatTimeRange(selectedSlot.value.start, selectedSlot.value.end)} Uhr` : ''
)

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
    const res = await fetch(`${apiUrl}/api/v1/organizations/${orgSlug()}/offers/${props.id}/bookings`, {
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
</script>

<template>
  <SiteHeader nav>
    <template #cta>
      <UButton v-if="offer" href="#slots" color="primary" icon="i-lucide-calendar" size="lg" class="px-5">Termin buchen</UButton>
    </template>
  </SiteHeader>

  <template v-if="loading">
    <div class="max-w-[720px] mx-auto px-6 pt-24 pb-20">
      <LoadingState />
    </div>
  </template>

  <template v-else-if="notFound">
    <div class="max-w-[720px] mx-auto px-6 pt-24 pb-20">
      <div class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center gap-4 text-center">
        <StatusPanel
          icon="i-lucide-search-x"
          title="Angebot nicht gefunden"
          description="Dieses Angebot existiert nicht mehr oder ist aktuell nicht buchbar."
          tone="neutral"
        />
        <UButton to="/#offers" color="neutral" variant="subtle" size="sm" label="Alle Sitzungsarten ansehen" />
      </div>
    </div>
  </template>

  <template v-else-if="offer">
    <!-- Angebot + Termine -->
    <section class="max-w-[720px] mx-auto px-6 pt-16 pb-20">
      <UButton to="/#offers" color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-left" label="Alle Sitzungsarten" class="mb-4 -ml-2" />

      <ContentCard>
        <div class="flex flex-col gap-6">
          <div class="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3.5 py-1.5 w-fit">
            <div class="size-1.5 rounded-full bg-primary" />
            <span class="text-xs text-primary tracking-[0.08em] uppercase">Buchung · {{ coachName }}</span>
          </div>

          <h1 class="font-serif text-4xl text-highlighted leading-[1.1] -mt-1">{{ offer.name }}</h1>

          <div class="flex gap-2.5">
            <UBadge color="neutral" variant="subtle" size="md">{{ offer.durationMinutes }} Minuten</UBadge>
            <UBadge v-if="offer.priceCents === null" color="primary" variant="subtle" size="md">Kostenlos</UBadge>
            <UBadge v-else color="neutral" variant="subtle" size="md">{{ formatOfferPrice(offer.priceCents) }}</UBadge>
          </div>

          <div v-if="descriptionHtml" :class="descriptionProseClasses" v-html="descriptionHtml" />

          <div class="flex items-center gap-3">
            <UAvatar :src="avatarUrl ?? undefined" :alt="coachName" size="lg" />
            <div>
              <div class="text-sm font-medium text-highlighted">{{ coachName }}</div>
              <div class="text-xs text-dimmed mt-0.5">Life & Business Coach</div>
            </div>
          </div>

          <USeparator />

          <!-- Termin vorgemerkt -->
          <template v-if="bookingStep === 'pending'">
            <StatusPanel icon="i-lucide-mail" title="Termin vorgemerkt">
              <template #description>
                <p class="text-sm text-muted">Wir haben eine E-Mail an <strong class="text-highlighted">{{ confirmedEmail }}</strong> geschickt.</p>
              </template>

              <UAlert
                color="warning"
                variant="soft"
                icon="i-lucide-triangle-alert"
                class="text-left"
                title="Noch nicht verbindlich"
                description="Bitte bestätige den Termin über den Link in dieser E-Mail – erst dann ist er für dich reserviert. Ohne Bestätigung wird der Termin automatisch wieder freigegeben."
              />

              <AppointmentSummary
                :offer="`${offer.name} · ${offer.durationMinutes} Minuten`"
                :appointment="`${selectedDayLabel}, ${selectedSlotTimeLabel}`"
                :coach="coachName"
              />

              <p class="text-xs text-dimmed">Keine E-Mail erhalten? Prüfe deinen Spam-Ordner.</p>

              <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Übersicht" />
            </StatusPanel>
          </template>

          <!-- Klientenformular -->
          <template v-else-if="bookingStep === 'form'">
            <div class="flex flex-col gap-5">
              <SectionHeading id="slots" title="Deine Daten" :hint="`${selectedDayLabel}, ${selectedSlotTimeLabel}`" size="card" class="scroll-mt-20" />

              <form class="flex flex-col gap-4" novalidate @submit.prevent="submitBooking">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UFormField label="Name">
                    <UInput v-model="bookingForm.clientName" type="text" autocomplete="name" placeholder="Vor- und Nachname" class="w-full" />
                  </UFormField>
                  <UFormField label="E-Mail">
                    <UInput v-model="bookingForm.clientEmail" type="email" autocomplete="email" placeholder="name@beispiel.de" class="w-full" />
                  </UFormField>
                </div>

                <UFormField label="Telefon" hint="optional">
                  <UInput v-model="bookingForm.clientPhone" type="tel" autocomplete="tel" placeholder="+49 …" class="w-full" />
                </UFormField>

                <UFormField label="Notiz" hint="optional">
                  <UTextarea v-model="bookingForm.clientNote" :rows="3" placeholder="Was möchtest du mir vorab mitteilen?" class="w-full" />
                </UFormField>

                <p v-if="formError" class="text-sm text-error">{{ formError }}</p>

                <div class="flex items-center gap-3">
                  <UButton type="submit" color="primary" :loading="submitting">Termin anfragen</UButton>
                  <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-left" label="Anderen Termin wählen" @click="backToCalendar" />
                </div>
              </form>
            </div>
          </template>

          <!-- Kalender -->
          <template v-else>
            <SectionHeading id="slots" title="Freie Termine" hint="Alle Zeiten in MEZ" size="card" class="scroll-mt-20" />

            <UAlert
              v-if="calendarNotice"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :description="calendarNotice"
            />

            <p v-if="noSlotsAvailable" class="text-sm text-muted">
              Aktuell keine freien Termine – schau bald wieder vorbei.
            </p>

            <LoadingState v-else-if="slotsLoading" />

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Kalender-Panel -->
              <div class="rounded-lg border border-default bg-muted dark:bg-neutral-800/50 p-4">
                <div class="flex items-center justify-between mb-3">
                  <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" :disabled="!canGoPrevMonth" @click="prevMonth" />
                  <div class="font-serif text-base text-highlighted">{{ monthLabel }}</div>
                  <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" :disabled="!canGoNextMonth" @click="nextMonth" />
                </div>
                <div class="grid grid-cols-7 gap-1 text-center text-xs text-dimmed uppercase tracking-wide mb-1">
                  <span v-for="d in ['Mo','Di','Mi','Do','Fr','Sa','So']" :key="d">{{ d }}</span>
                </div>
                <div class="grid grid-cols-7 gap-1">
                  <button
                    v-for="cell in calendarDays"
                    :key="cell.dateKey"
                    type="button"
                    :disabled="!cell.hasSlots"
                    :class="[
                      'aspect-square rounded-full text-sm flex items-center justify-center transition-colors outline-primary/25 focus-visible:outline-3',
                      !cell.inMonth && 'invisible',
                      cell.hasSlots ? 'cursor-pointer bg-primary/15 font-medium text-primary hover:bg-primary/25' : 'text-dimmed cursor-default',
                      cell.dateKey === selectedDayKey && 'bg-primary text-inverted hover:bg-primary',
                      cell.isToday && cell.dateKey !== selectedDayKey && 'ring-1 ring-inset ring-primary',
                    ]"
                    @click="selectDay(cell.dateKey)"
                  >{{ cell.day }}</button>
                </div>
                <div class="flex items-center gap-1.5 mt-3 text-xs text-dimmed">
                  <span class="size-1.5 rounded-full bg-primary" /> Freie Termine verfügbar
                </div>
              </div>

              <!-- Zeiten-Panel -->
              <div class="rounded-lg border border-default bg-muted dark:bg-neutral-800/50 p-4 min-h-[260px] flex flex-col">
                <div v-if="!selectedDayKey" class="m-auto text-center flex flex-col items-center gap-2 max-w-[200px]">
                  <UIcon name="i-lucide-calendar" class="size-6 text-dimmed" />
                  <p class="text-xs text-dimmed">Wähle einen markierten Tag im Kalender, um verfügbare Uhrzeiten zu sehen.</p>
                </div>
                <template v-else>
                  <div class="mb-3">
                    <div class="font-serif text-lg text-highlighted">{{ selectedDayLabel }}</div>
                    <div class="text-xs text-dimmed">Alle Zeiten in MEZ</div>
                  </div>
                  <div class="flex flex-col gap-2 overflow-y-auto max-h-[260px]">
                    <button
                      v-for="slot in selectedDaySlots"
                      :key="slot.start"
                      type="button"
                      class="flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-colors outline-primary/25 focus-visible:outline-3"
                      :class="selectedSlot?.start === slot.start
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-default bg-white dark:bg-neutral-900 hover:border-accented'"
                      @click="selectSlot(slot)"
                    >
                      <span class="text-sm text-highlighted">{{ formatTimeRange(slot.start, slot.end) }} Uhr</span>
                      <span class="text-xs text-muted">Auswählen</span>
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </ContentCard>
    </section>

    <!-- Andere Sitzungsarten -->
    <template v-if="otherOffers.length">
      <USeparator class="max-w-[720px] mx-auto" />
      <section class="max-w-[720px] mx-auto px-6 py-10">
        <SectionHeading title="Andere Sitzungsarten" hint="Passt doch nicht ganz?" class="mb-7" />

        <div class="flex flex-col gap-3">
          <OfferListItem v-for="other in otherOffers" :key="other.id" :offer="other" />
        </div>
      </section>
    </template>

    <USeparator class="max-w-[720px] mx-auto" />
    <AboutSection />
  </template>

  <SiteFooter />
</template>
