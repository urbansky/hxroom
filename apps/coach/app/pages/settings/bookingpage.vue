<script setup lang="ts">
import type { BookingPageProfile, OfferResponse } from '@hxroom/shared'
import { BOOKING_PAGE_MAX_TOPICS, bookingPageCtaLabel, bookingPageSchema, hasBookingPageAbout } from '@hxroom/shared'
import { BookingPageAbout, BookingPageCoachCard, BookingPageHero, BookingPageOfferItem } from '@hxroom/ui'

definePageMeta({ middleware: 'auth' })

const { public: { rootDomain, rootDomainHttps, apiUrl } } = useRuntimeConfig()
const { $api } = useApi()

// API-Shape: DB-Spalten sind nullable
interface BookingPageResponse {
  organizationId:  string
  subdomain:       string | null
  profileName:     string | null
  tagline:         string | null
  bio:             string | null
  ctaButton:       string | null
  ctaIntro:        string | null
  jobTitle:        string | null
  topics:          string[]
  quote:           string | null
  qualifications:  string[]
  avatarUpdatedAt: string | null
  imprintComplete: boolean
}

// Formular-Shape: UInput/UTextarea erwarten `string | undefined`, kein `null`.
// Qualifikationen pflegt der Coach als Textfeld mit einer Zeile pro Eintrag.
interface BookingPageForm {
  subdomain:      string | undefined
  profileName:    string | undefined
  tagline:        string | undefined
  bio:            string | undefined
  ctaButton:      string | undefined
  ctaIntro:       string | undefined
  jobTitle:       string | undefined
  topics:         string[]
  quote:          string | undefined
  qualifications: string | undefined
}

function emptyForm(): BookingPageForm {
  return {
    subdomain:      undefined,
    profileName:    undefined,
    tagline:        undefined,
    bio:            undefined,
    ctaButton:      undefined,
    ctaIntro:       undefined,
    jobTitle:       undefined,
    topics:         [],
    quote:          undefined,
    qualifications: undefined,
  }
}

function toForm(data: BookingPageResponse): BookingPageForm {
  return {
    subdomain:      data.subdomain   ?? undefined,
    profileName:    data.profileName ?? undefined,
    tagline:        data.tagline     ?? undefined,
    bio:            data.bio         ?? undefined,
    ctaButton:      data.ctaButton   ?? undefined,
    ctaIntro:       data.ctaIntro    ?? undefined,
    jobTitle:       data.jobTitle    ?? undefined,
    topics:         [...data.topics],
    quote:          data.quote       ?? undefined,
    qualifications: data.qualifications.join('\n') || undefined,
  }
}

function qualificationList(text: string | undefined): string[] {
  return (text ?? '').split('\n').map(line => line.trim()).filter(Boolean)
}

const form = reactive<BookingPageForm>(emptyForm())

const previewUrl = computed(() => `${rootDomainHttps ? 'https' : 'http'}://${form.subdomain}.${rootDomain}`)
const nameInitial = computed(() => form.profileName?.charAt(0).toUpperCase() || 'A')

// Snapshot der zuletzt gespeicherten Werte, um unveränderte Felder beim Blur zu erkennen
const lastSaved = reactive<BookingPageForm>(emptyForm())

const organizationId = ref<string | null>(null)
const avatarUpdatedAt = ref<string | null>(null)
const avatarUrl = computed(() =>
  avatarUpdatedAt.value && organizationId.value
    ? `${apiUrl}/booking-page/avatar/${organizationId.value}?v=${new Date(avatarUpdatedAt.value).getTime()}`
    : null,
)

// Für Hinweis und Vorschau: Ohne Impressum ist die Buchungsseite nicht buchbar (doc/legal.md
// §3.2). Gepflegt wird es unter Einstellungen → Rechtliches, hier nur der Status. Vor dem
// Fetch deklariert, weil onResponse schon während des await läuft.
const imprintComplete = ref(true)

await useFetch<BookingPageResponse>('/booking-page', {
  $fetch: $api,
  onResponse({ response }) {
    Object.assign(form, toForm(response._data as BookingPageResponse))
    Object.assign(lastSaved, toForm(response._data as BookingPageResponse))
    organizationId.value = response._data?.organizationId ?? null
    avatarUpdatedAt.value = response._data?.avatarUpdatedAt ?? null
    imprintComplete.value = response._data?.imprintComplete ?? false
  },
})

const { data: legal } = await useFetch<{ termsUrl: string | null }>('/booking-page/legal', { $fetch: $api })
const termsUrl = computed(() => legal.value?.termsUrl ?? null)

type AvatarStatus = 'idle' | 'uploading' | 'saved' | 'error'
const avatarStatus = ref<AvatarStatus>('idle')
const avatarError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
let avatarSavedTimer: ReturnType<typeof setTimeout> | null = null

function triggerFileSelect() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (avatarSavedTimer) clearTimeout(avatarSavedTimer)
  avatarStatus.value = 'uploading'
  avatarError.value = null

  const body = new FormData()
  body.append('file', file)

  try {
    const res = await $api<{ avatarUpdatedAt: string }>('/booking-page/avatar', {
      method: 'POST',
      body,
    })
    avatarUpdatedAt.value = res.avatarUpdatedAt
    avatarStatus.value = 'saved'
    avatarSavedTimer = setTimeout(() => { avatarStatus.value = 'idle' }, 3000)
  } catch (err: any) {
    avatarStatus.value = 'error'
    avatarError.value = err?.data?.message ?? 'Upload fehlgeschlagen'
  } finally {
    input.value = ''
  }
}

async function deleteAvatar() {
  await $api('/booking-page/avatar', { method: 'DELETE' })
  avatarUpdatedAt.value = null
}

// Validierung: Fehler nur für Felder anzeigen, die bereits verlassen wurden
const errors = computed(() => {
  const r = bookingPageSchema.safeParse({ ...form, qualifications: qualificationList(form.qualifications) })
  if (r.success) return {} as Record<string, string>
  return Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))
})

const touched = reactive<Record<string, boolean>>({})

const visibleErrors = computed(() =>
  Object.fromEntries(Object.entries(errors.value).filter(([k]) => touched[k]))
)

// Autosave-Status
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
const saveStatus = ref<SaveStatus>('idle')
const activeField = ref<string | null>(null)
let savedTimer: ReturnType<typeof setTimeout> | null = null

function fieldStatus(field: string): Exclude<SaveStatus, 'idle'> | null {
  if (activeField.value !== field || saveStatus.value === 'idle') return null
  return saveStatus.value
}

async function save() {
  if (Object.keys(errors.value).length) {
    saveStatus.value = 'idle'
    return
  }
  if (savedTimer) clearTimeout(savedTimer)
  saveStatus.value = 'saving'
  // Schnappschuss beim Absenden, nicht bei der Antwort: Was währenddessen schon ins nächste
  // Feld getippt wurde, gälte sonst als gespeichert und ginge beim Verlassen verloren.
  const sent = { ...form, topics: [...form.topics] }
  try {
    await $api('/booking-page', {
      method: 'PATCH',
      body: {
        subdomain:   form.subdomain   || undefined,
        profileName: form.profileName || undefined,
        tagline:     form.tagline     || null,
        bio:         form.bio         || null,
        ctaButton:   form.ctaButton   || null,
        ctaIntro:    form.ctaIntro    || null,
        jobTitle:    form.jobTitle    || null,
        topics:      form.topics,
        quote:       form.quote       || null,
        qualifications: qualificationList(form.qualifications),
      },
    })
    saveStatus.value = 'saved'
    Object.assign(lastSaved, sent)
    savedTimer = setTimeout(() => { saveStatus.value = 'idle' }, 3000)
  } catch (err: any) {
    saveStatus.value = 'error'
  }
}

function onBlur(field: keyof BookingPageForm) {
  touched[field] = true
  // JSON-Vergleich, weil die Schwerpunkte ein Array sind
  if (JSON.stringify(form[field]) === JSON.stringify(lastSaved[field])) return
  activeField.value = field
  save()
}

// Schwerpunkte speichern sofort beim Hinzufügen oder Entfernen eines Schlagworts: Der
// Wechsel geschieht per Enter oder Klick aufs Kreuz, ohne dass das Feld verlassen wird.
function onTopicsChange() {
  onBlur('topics')
}

const offers = ref<OfferResponse[]>([])
const activeOffers = computed(() => offers.value.filter(o => o.isActive))

await useFetch<OfferResponse[]>('/offers', {
  $fetch: $api,
  onResponse({ response }) {
    offers.value = response._data as OfferResponse[]
  },
})

// Vorschau: dasselbe Profil, das die Buchungsseite vom öffentlichen Endpunkt bekommt, nur
// aus dem Formular – leere Felder blendet sie genauso aus wie die echte Seite.
const previewProfile = computed<BookingPageProfile>(() => ({
  name:           form.profileName?.trim() || 'Dein Name',
  avatarUrl:      avatarUrl.value,
  tagline:        form.tagline || null,
  bio:            form.bio || null,
  ctaButton:      form.ctaButton || null,
  ctaIntro:       form.ctaIntro || null,
  jobTitle:       form.jobTitle || null,
  topics:         form.topics,
  quote:          form.quote || null,
  qualifications: qualificationList(form.qualifications),
}))
const previewShowAbout = computed(() => hasBookingPageAbout(previewProfile.value))
const previewCtaLabel = computed(() => bookingPageCtaLabel(previewProfile.value.ctaButton))

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const features = [
  {
    icon: 'i-lucide-image-plus',
    title: 'Logo hochladen',
    description: 'Eigenes Logo für Warteraum, Buchungsseite und E-Mails – Klienten sehen deine Marke, nicht HxRoom.',
  },
  {
    icon: 'i-lucide-palette',
    title: 'Primärfarbe',
    description: 'Wähle eine Akzentfarbe, die auf deiner Buchungsseite und im Warteraum verwendet wird.',
  },
  {
    icon: 'i-lucide-globe',
    title: 'Eigene CNAME-Domain',
    description: 'Verknüpfe deine eigene Domain (z. B. buchen.anna-coaching.de) mit deinem HxRoom-Account.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">

    <!-- Seitenheader -->
    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-1">Deine Buchungsseite</h1>
      <p class="text-sm text-muted">So sehen dich potenzielle Klienten – passe Profil, Angebot und Buchungs-CTA an.</p>
    </div>

    <UAlert
      v-if="!imprintComplete"
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="soft"
      title="Ohne Impressum können Klienten noch nicht buchen"
      description="Deine Seite ist zu sehen, statt der Buchungs-Buttons steht dort aber ein Hinweis. Trag dein Impressum unter Rechtliches ein."
      :actions="[{ label: 'Zu Rechtliches', to: '/settings/legal', color: 'warning', variant: 'outline', trailingIcon: 'i-lucide-arrow-right' }]"
    />

    <!-- Zweispaltiges Layout: Editor + Vorschau -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_900px] gap-12 items-start">

      <!-- Editor -->
      <div class="flex flex-col gap-4">

        <!-- Buchungs-URL -->
        <SettingsSection title="Adresse" description="Unter dieser Subdomain erreichen dich deine Klienten.">
          <UFormField label="Subdomain" :error="visibleErrors.subdomain">
            <template v-if="fieldStatus('subdomain')" #hint>
              <SaveStatusHint :status="fieldStatus('subdomain')" />
            </template>
            <div class="flex items-center gap-4 flex-wrap">
              <UFieldGroup class="flex-1 min-w-64">
                <UInput
                  v-model="form.subdomain"
                  :ui="{ base: `${inputUi.base} text-right` }"
                  placeholder="dein-name"
                  @blur="onBlur('subdomain')"
                />
                <UBadge color="neutral" variant="outline" size="lg" :label="'.' + rootDomain" class="text-muted" />
              </UFieldGroup>
              <UButton variant="outline" color="neutral">
                Link kopieren
              </UButton>
            </div>
          </UFormField>
        </SettingsSection>

        <!-- Profil -->
        <SettingsSection title="Profil" description="So stellst du dich auf deiner Buchungsseite vor.">
          <div class="flex flex-col gap-5">
            <div class="flex items-center gap-4">
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onFileSelected"
              >
              <div class="w-14 h-14 rounded-full overflow-hidden bg-primary-500 flex items-center justify-center font-serif text-2xl text-white shrink-0">
                <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover" alt="">
                <template v-else>{{ nameInitial }}</template>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <UButton
                    variant="outline"
                    color="neutral"
                    leading-icon="i-lucide-upload"
                    size="sm"
                    :loading="avatarStatus === 'uploading'"
                    @click="triggerFileSelect"
                  >
                    Foto hochladen
                  </UButton>
                  <UButton
                    v-if="avatarUrl"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    size="sm"
                    @click="deleteAvatar"
                  />
                </div>
                <p class="text-xs text-muted mt-1.5">JPG, PNG oder WebP, max. 8 MB</p>
                <p v-if="avatarStatus === 'error'" class="text-xs text-error mt-1">{{ avatarError }}</p>
              </div>
            </div>

            <UFormField label="Name" :error="visibleErrors.profileName">
              <template v-if="fieldStatus('profileName')" #hint>
                <SaveStatusHint :status="fieldStatus('profileName')" />
              </template>
              <UInput v-model="form.profileName" class="w-1/2" :ui="inputUi" @blur="onBlur('profileName')" />
            </UFormField>

            <UFormField label="Berufsbezeichnung" help="Steht unter deinem Namen, z. B. „Systemischer Coach“." :error="visibleErrors.jobTitle">
              <template v-if="fieldStatus('jobTitle')" #hint>
                <SaveStatusHint :status="fieldStatus('jobTitle')" />
              </template>
              <UInput v-model="form.jobTitle" class="w-1/2" :ui="inputUi" @blur="onBlur('jobTitle')" />
            </UFormField>

            <UFormField label="Tagline" help="Die große Überschrift deiner Seite." :error="visibleErrors.tagline">
              <template v-if="fieldStatus('tagline')" #hint>
                <SaveStatusHint :status="fieldStatus('tagline')" />
              </template>
              <UInput v-model="form.tagline" class="w-full" :ui="inputUi" @blur="onBlur('tagline')" />
            </UFormField>

            <UFormField
              label="Schwerpunkte"
              :help="`Bis zu ${BOOKING_PAGE_MAX_TOPICS} Schlagworte, jeweils mit Enter bestätigen.`"
              :error="visibleErrors.topics"
            >
              <template v-if="fieldStatus('topics')" #hint>
                <SaveStatusHint :status="fieldStatus('topics')" />
              </template>
              <UInputTags
                v-model="form.topics"
                :max="BOOKING_PAGE_MAX_TOPICS"
                :max-length="40"
                add-on-blur
                add-on-paste
                placeholder="z. B. Beruflicher Neustart"
                class="w-full"
                :ui="inputUi"
                @update:model-value="onTopicsChange"
              />
            </UFormField>
          </div>
        </SettingsSection>

        <!-- Über mich -->
        <SettingsSection title="Über mich" description="Der Abschnitt „Über mich“ auf deiner Seite. Leere Felder werden dort nicht angezeigt.">
          <div class="flex flex-col gap-5">
            <UFormField label="Text" :error="visibleErrors.bio">
              <template v-if="fieldStatus('bio')" #hint>
                <SaveStatusHint :status="fieldStatus('bio')" />
              </template>
              <UTextarea v-model="form.bio" :rows="4" resize class="w-full" :ui="inputUi" @blur="onBlur('bio')" />
            </UFormField>

            <UFormField label="Zitat" help="Optional: ein Satz, der deine Haltung beschreibt." :error="visibleErrors.quote">
              <template v-if="fieldStatus('quote')" #hint>
                <SaveStatusHint :status="fieldStatus('quote')" />
              </template>
              <UInput v-model="form.quote" class="w-full" :ui="inputUi" @blur="onBlur('quote')" />
            </UFormField>

            <UFormField label="Qualifikationen" help="Optional: Ausbildungen, Zertifikate, Erfahrung – eine pro Zeile." :error="visibleErrors.qualifications">
              <template v-if="fieldStatus('qualifications')" #hint>
                <SaveStatusHint :status="fieldStatus('qualifications')" />
              </template>
              <UTextarea v-model="form.qualifications" :rows="3" autoresize class="w-full" :ui="inputUi" @blur="onBlur('qualifications')" />
            </UFormField>
          </div>
        </SettingsSection>

        <!-- Call-to-Action -->
        <SettingsSection title="Call-to-Action" description="Text und Beschriftung des Buchungs-Buttons auf deiner Seite.">
          <div class="flex flex-col gap-4">
            <UFormField label="Button-Text" :error="visibleErrors.ctaButton">
              <template v-if="fieldStatus('ctaButton')" #hint>
                <SaveStatusHint :status="fieldStatus('ctaButton')" />
              </template>
              <UInput v-model="form.ctaButton" class="w-1/2" :ui="inputUi" @blur="onBlur('ctaButton')" />
            </UFormField>
            <UFormField label="Einleitungstext über dem Buchungs-Button" :error="visibleErrors.ctaIntro">
              <template v-if="fieldStatus('ctaIntro')" #hint>
                <SaveStatusHint :status="fieldStatus('ctaIntro')" />
              </template>
              <UInput v-model="form.ctaIntro" class="w-full" :ui="inputUi" @blur="onBlur('ctaIntro')" />
            </UFormField>
          </div>
        </SettingsSection>

      </div>

      <!-- Vorschau-Panel -->
      <div class="sticky top-20">
        <!-- Browser-Mockup -->
        <div class="rounded-xl border border-neutral-200 overflow-hidden shadow-xl">
          <!-- Browser-Chrome -->
          <div class="bg-neutral-100 border-b border-neutral-200 px-3 py-2.5 flex items-center gap-3">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-3 h-3 rounded-full bg-neutral-300" />
              <span class="w-3 h-3 rounded-full bg-neutral-300" />
              <span class="w-3 h-3 rounded-full bg-neutral-300" />
            </div>
            <div class="flex-1 bg-white border border-neutral-200 rounded-md px-2.5 py-1 flex items-center gap-1.5">
              <UIcon name="i-lucide-lock" class="w-3 h-3 text-neutral-400 shrink-0" />
              <span class="text-xs text-neutral-500 truncate">{{ form.subdomain }}.{{ rootDomain }}</span>
            </div>
          </div>
          <!-- Seiten-Inhalt: dieselben Bausteine wie die Buchungsseite (@hxroom/ui), gespeist
               aus dem Formular statt aus dem Gespeicherten – Änderungen erscheinen beim Tippen.
               Eigener Scrollbereich, damit die ganze Seite in den Rahmen passt. inert nur am
               Inhalt: Links und Buttons sind zu sehen, aber nicht zu benutzen. Am Scrollbereich
               selbst schluckte es auch Mausrad und Wischen. -->
          <div class="bg-default max-h-[calc(100vh-11rem)] overflow-y-auto overscroll-contain" data-preview-scroller>
            <div inert>
              <!-- Kopfzeile der Buchungsseite, nachgebaut ohne UHeader (der ist für den
                   Seitenkopf der App gedacht, nicht für eine Fläche in der Seite) -->
              <div class="h-16 border-b border-default px-6 lg:px-10 flex items-center justify-between gap-4">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="size-9 rounded-full overflow-hidden bg-primary flex items-center justify-center font-serif text-lg text-inverted shrink-0">
                    <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
                    <template v-else>{{ previewProfile.name.charAt(0) }}</template>
                  </div>
                  <span class="font-serif text-xl text-highlighted tracking-wide truncate">{{ previewProfile.name }}</span>
                </div>
                <div class="hidden sm:flex items-center gap-6">
                  <span v-if="previewShowAbout" class="text-base text-muted tracking-wide">Über mich</span>
                  <span class="text-base text-muted tracking-wide">Sitzungsarten</span>
                </div>
                <UButton v-if="imprintComplete" color="primary" icon="i-lucide-calendar" size="lg" class="px-5 max-w-56" :ui="{ label: 'truncate' }" :label="previewCtaLabel" />
              </div>

              <section class="max-w-[720px] mx-auto px-6 flex flex-col items-stretch gap-14 pt-24 pb-10">
                <BookingPageHero :profile="previewProfile" cta-to="#offers" :bookable="imprintComplete" />
                <BookingPageCoachCard :profile="previewProfile" />
              </section>

              <USeparator class="max-w-[720px] mx-auto" />
              <section class="max-w-[720px] mx-auto px-6 py-10">
                <div class="flex items-baseline gap-4 mb-7">
                  <h2 class="font-serif text-3xl text-highlighted">Sitzungsarten</h2>
                  <span class="text-xs text-dimmed tracking-wide">Schritt 1 · Angebot wählen</span>
                </div>
                <div class="flex flex-col gap-3">
                  <BookingPageOfferItem v-for="offer in activeOffers" :key="offer.id" :offer="offer" to="#offers" />
                  <p v-if="!activeOffers.length" class="text-sm text-muted">
                    Noch keine aktiven Sitzungsangebote – Klienten sehen hier deine Angebote.
                  </p>
                </div>
              </section>

              <template v-if="previewShowAbout">
                <USeparator class="max-w-[720px] mx-auto" />
                <BookingPageAbout :profile="previewProfile" />
              </template>

              <div class="border-t border-default px-6 lg:px-10 py-8 text-xs text-dimmed flex items-center justify-between gap-4">
                <span>Gebrandeter HxRoom von <span class="text-muted">hxroom.de</span>&nbsp;·&nbsp;Server in Deutschland</span>
                <span class="flex items-center gap-5">
                  <span>Impressum</span>
                  <span v-if="termsUrl">AGB</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <UButton variant="link" color="primary" size="xs" trailing-icon="i-lucide-external-link" :to="previewUrl" target="_blank">
            In neuem Tab öffnen
          </UButton>
        </div>
      </div>

    </div>

    <!-- Geplante Features -->
    <SettingsSection title="Geplante Features" description="Das kommt als Nächstes für deine Landingpage." class="mt-94">
      <div class="flex flex-col gap-2">
        <UpcomingFeature
          v-for="item in features"
          :key="item.title"
          v-bind="item"
        />
      </div>
    </SettingsSection>

  </div>
</template>
