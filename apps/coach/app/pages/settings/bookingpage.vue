<script setup lang="ts">
import type { OfferResponse } from '@hxroom/shared'
import { bookingPageSchema } from '@hxroom/shared'

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
  avatarUpdatedAt: string | null
}

// Formular-Shape: UInput/UTextarea erwarten `string | undefined`, kein `null`
interface BookingPageForm {
  subdomain:   string | undefined
  profileName: string | undefined
  tagline:     string | undefined
  bio:         string | undefined
  ctaButton:   string | undefined
  ctaIntro:    string | undefined
}

function emptyForm(): BookingPageForm {
  return {
    subdomain:   undefined,
    profileName: undefined,
    tagline:     undefined,
    bio:         undefined,
    ctaButton:   undefined,
    ctaIntro:    undefined,
  }
}

function toForm(data: BookingPageResponse): BookingPageForm {
  return {
    subdomain:   data.subdomain   ?? undefined,
    profileName: data.profileName ?? undefined,
    tagline:     data.tagline     ?? undefined,
    bio:         data.bio         ?? undefined,
    ctaButton:   data.ctaButton   ?? undefined,
    ctaIntro:    data.ctaIntro    ?? undefined,
  }
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

await useFetch<BookingPageResponse>('/booking-page', {
  $fetch: $api,
  onResponse({ response }) {
    Object.assign(form, toForm(response._data as BookingPageResponse))
    Object.assign(lastSaved, toForm(response._data as BookingPageResponse))
    organizationId.value = response._data?.organizationId ?? null
    avatarUpdatedAt.value = response._data?.avatarUpdatedAt ?? null
  },
})

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
  const r = bookingPageSchema.safeParse(form)
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
      },
    })
    saveStatus.value = 'saved'
    Object.assign(lastSaved, form)
    savedTimer = setTimeout(() => { saveStatus.value = 'idle' }, 3000)
  } catch (err: any) {
    saveStatus.value = 'error'
  }
}

function onBlur(field: keyof BookingPageForm) {
  touched[field] = true
  if (form[field] === lastSaved[field]) return
  activeField.value = field
  save()
}

const offers = ref<OfferResponse[]>([])
const activeOffers = computed(() => offers.value.filter(o => o.isActive))

await useFetch<OfferResponse[]>('/offers', {
  $fetch: $api,
  onResponse({ response }) {
    offers.value = response._data as OfferResponse[]
  },
})

// Cookie statt ref, damit die Einstellung Reloads und Seitenwechsel übersteht.
const showOfferDescriptions = useCookie<boolean>('landingpage-show-offer-descriptions', { default: () => true })

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const features = [
  {
    icon: 'i-lucide-link',
    title: 'Subdomain & Buchungslink',
    description: 'Deine persönliche Subdomain (z. B. anna.hxroom.de) – sichtbar für Klienten beim Buchungslink.',
  },
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
    icon: 'i-lucide-user-circle',
    title: 'Profilseite: Coaching-Schwerpunkte',
    description: 'Deine Coaching-Schwerpunkte als Tags – Grundlage für deine öffentliche Buchungsseite.',
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

            <UFormField label="Tagline" :error="visibleErrors.tagline">
              <template v-if="fieldStatus('tagline')" #hint>
                <SaveStatusHint :status="fieldStatus('tagline')" />
              </template>
              <UInput v-model="form.tagline" class="w-full" :ui="inputUi" @blur="onBlur('tagline')" />
            </UFormField>

            <UFormField label="Über mich" :error="visibleErrors.bio">
              <template v-if="fieldStatus('bio')" #hint>
                <SaveStatusHint :status="fieldStatus('bio')" />
              </template>
              <UTextarea v-model="form.bio" :rows="4" resize class="w-full" :ui="inputUi" @blur="onBlur('bio')" />
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
          <!-- Seiten-Inhalt -->
          <div class="bg-neutral-50 p-4 flex flex-col gap-3">
            <!-- Hero -->
            <div class="text-center px-4 py-6 rounded-xl bg-white border border-neutral-200">
              <div class="w-16 h-16 rounded-full overflow-hidden bg-primary-500 flex items-center justify-center font-serif text-3xl text-white mx-auto mb-3 ring-2 ring-primary-500/25">
                <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover" alt="">
                <template v-else>{{ nameInitial }}</template>
              </div>
              <p class="font-serif text-xl text-neutral-900 mb-1">{{ form.profileName }}</p>
              <p class="text-xs text-neutral-500 leading-relaxed max-w-[220px] mx-auto mb-4">{{ form.tagline }}</p>
              <span class="inline-block bg-primary-600 text-white text-xs font-medium px-4 py-2 rounded-lg">
                {{ form.ctaButton }}
              </span>
            </div>
            <!-- Format-Liste -->
            <div class="flex flex-col gap-2">
              <div class="flex justify-end -mb-1">
                <button
                  type="button"
                  class="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                  @click="showOfferDescriptions = !showOfferDescriptions"
                >
                  <UIcon :name="showOfferDescriptions ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-3 h-3" />
                  {{ showOfferDescriptions ? 'Beschreibungen ausblenden' : 'Beschreibungen anzeigen' }}
                </button>
              </div>
              <div
                v-for="offer in activeOffers"
                :key="offer.id"
                class="flex items-center justify-between gap-3 px-3 py-2.5 bg-white border border-neutral-200 rounded-lg"
              >
                <div class="min-w-0">
                  <p class="text-sm font-bold text-neutral-900">{{ offer.name }}</p>
                  <p class="text-xs text-neutral-400">{{ offer.durationMinutes }} min · Video</p>
                  <div
                    v-if="showOfferDescriptions && descriptionPreview(offer.description)"
                    class="mt-1 text-neutral-500 [&_h2]:text-neutral-900 [&_h3]:text-neutral-900 [&_strong]:text-neutral-900"
                    :class="descriptionProseClasses"
                    v-html="renderDescription(offer.description)"
                  />
                </div>
                <span class="font-serif text-base text-primary-600 shrink-0">{{ formatPrice(offer.priceCents) }}</span>
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
