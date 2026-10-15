<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import { LEGAL_FORMS, bookingPageLegalSchema, isCompanyLegalForm, type Imprint, type LegalForm } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

// Impressum und Links der Buchungsseite (doc/legal.md §3.2). Ausdrückliches Speichern statt
// Autosave: Die Bestätigung „korrekt und vollständig“ gilt immer für genau den gespeicherten
// Stand. Ohne vollständiges Impressum nimmt die Buchungsseite keine Buchungen an.

const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const { $api } = useApi()

interface LegalResponse {
  imprintMode: 'form' | 'link' | null
  imprint: Imprint | null
  imprintUrl: string | null
  imprintConfirmedAt: string | null
  privacyUrl: string | null
  termsUrl: string | null
  imprintComplete: boolean
}

// Formular-Shape: alle Felder als Strings, leere optionale Felder gehen als null hinaus.
interface ImprintFields {
  name: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
  legalForm: LegalForm
  representative: string
  register: string
  vatId: string
  addition: string
}

interface LegalFormState {
  imprintMode: 'form' | 'link'
  imprint: ImprintFields
  imprintUrl: string
  privacyUrl: string
  termsUrl: string
  confirmed: boolean
}

function toFields(imprint: Imprint | null): ImprintFields {
  return {
    name:           imprint?.name ?? '',
    street:         imprint?.street ?? '',
    postalCode:     imprint?.postalCode ?? '',
    city:           imprint?.city ?? '',
    country:        imprint?.country ?? 'Deutschland',
    email:          imprint?.email ?? '',
    phone:          imprint?.phone ?? '',
    legalForm:      imprint?.legalForm ?? 'sole',
    representative: imprint?.representative ?? '',
    register:       imprint?.register ?? '',
    vatId:          imprint?.vatId ?? '',
    addition:       imprint?.addition ?? '',
  }
}

const state = reactive<LegalFormState>({
  imprintMode: 'form',
  imprint: toFields(null),
  imprintUrl: '',
  privacyUrl: '',
  termsUrl: '',
  confirmed: false,
})

const status = ref<{ complete: boolean, confirmedAt: string | null }>({ complete: false, confirmedAt: null })

function applyResponse(data: LegalResponse) {
  state.imprintMode = data.imprintMode ?? 'form'
  state.imprint = toFields(data.imprint)
  state.imprintUrl = data.imprintUrl ?? ''
  state.privacyUrl = data.privacyUrl ?? ''
  state.termsUrl = data.termsUrl ?? ''
  status.value = { complete: data.imprintComplete, confirmedAt: data.imprintConfirmedAt }
}

await useFetch<LegalResponse>('/booking-page/legal', {
  $fetch: $api,
  onResponse({ response }) {
    if (response._data) applyResponse(response._data as LegalResponse)
  },
})

const { data: bookingPage } = await useFetch<{ subdomain: string | null }>('/booking-page', { $fetch: $api })
const imprintPreviewUrl = computed(() =>
  bookingPage.value?.subdomain
    ? `${rootDomainHttps ? 'https' : 'http'}://${bookingPage.value.subdomain}.${rootDomain}/impressum`
    : null,
)

const saving = ref(false)
const saveError = ref<string | null>(null)
const justSaved = ref(false)

// Jede Änderung nach dem Speichern hebt die Bestätigung auf – sie gilt nur für den Stand,
// den der Coach gerade gesehen hat.
watch(
  () => JSON.stringify({ ...state, confirmed: undefined }),
  () => {
    state.confirmed = false
    justSaved.value = false
  },
)

const showRepresentative = computed(() => isCompanyLegalForm(state.imprint.legalForm))
const legalFormItems = Object.entries(LEGAL_FORMS).map(([value, label]) => ({ value, label }))
const modeItems = [
  { value: 'form', label: 'Angaben hier eintragen', description: 'HxRoom setzt daraus dein Impressum zusammen.' },
  { value: 'link', label: 'Auf mein Impressum verlinken', description: 'Zum Beispiel auf deiner eigenen Website.' },
]

function optional(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function toPayload(form: LegalFormState) {
  const f = form.imprint
  return {
    imprintMode: form.imprintMode,
    // Die jeweils andere Form schickt das Formular nicht mit; die API behält sie gespeichert.
    imprint: form.imprintMode === 'form'
      ? {
          name: f.name, street: f.street, postalCode: f.postalCode, city: f.city, country: f.country,
          email: f.email, phone: f.phone, legalForm: f.legalForm,
          representative: isCompanyLegalForm(f.legalForm) ? optional(f.representative) : null,
          register: optional(f.register),
          vatId: optional(f.vatId),
          addition: optional(f.addition),
        }
      : undefined,
    imprintUrl: form.imprintMode === 'link' ? optional(form.imprintUrl) : undefined,
    privacyUrl: optional(form.privacyUrl),
    termsUrl: optional(form.termsUrl),
    confirmed: form.confirmed,
  }
}

// Geprüft wird mit dem Schema der API – nur die Fehlertexte sind hier deutsch.
const messages: Record<string, string> = {
  'imprint.name':           'Bitte Name oder Firma angeben.',
  'imprint.street':         'Bitte Straße und Hausnummer angeben.',
  'imprint.postalCode':     'Bitte eine Postleitzahl angeben.',
  'imprint.city':           'Bitte den Ort angeben.',
  'imprint.country':        'Bitte das Land angeben.',
  'imprint.email':          'Bitte eine gültige E-Mail-Adresse angeben.',
  'imprint.phone':          'Bitte eine Telefonnummer angeben, z. B. +49 351 123456.',
  'imprint.representative': 'Höchstens 200 Zeichen.',
  'imprint.register':       'Höchstens 200 Zeichen.',
  'imprint.vatId':          'Höchstens 20 Zeichen.',
  'imprint.addition':       'Höchstens 1000 Zeichen.',
  'imprintUrl':             'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'privacyUrl':             'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'termsUrl':               'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'confirmed':              'Bitte bestätige, dass die Angaben korrekt und vollständig sind.',
}

function validate(form: LegalFormState): FormError[] {
  const result = bookingPageLegalSchema.safeParse(toPayload(form))
  if (result.success) return []
  return result.error.issues.map((issue) => {
    const name = issue.path.join('.')
    return { name, message: messages[name] ?? 'Bitte prüfe diese Angabe.' }
  })
}

async function onSubmit() {
  saving.value = true
  saveError.value = null
  justSaved.value = false
  try {
    const data = await $api<LegalResponse>('/booking-page/legal', { method: 'PUT', body: toPayload(state) })
    applyResponse(data)
    // Gibt die API einen anderen Stand zurück als gesendet (etwa ohne führende Leerzeichen),
    // hebt der Watcher das Häkchen auf. Bestätigt ist der gespeicherte Stand trotzdem; erst
    // danach den Hinweis setzen, sonst nähme der Watcher ihn gleich wieder weg.
    await nextTick()
    justSaved.value = true
  } catch (err: any) {
    saveError.value = err?.data?.message === 'Validierung fehlgeschlagen'
      ? 'Bitte prüfe die markierten Angaben.'
      : 'Speichern fehlgeschlagen. Bitte versuche es noch einmal.'
  } finally {
    saving.value = false
  }
}

const confirmedAtLabel = computed(() =>
  status.value.confirmedAt
    ? new Date(status.value.confirmedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
    : null,
)

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const features = [
  {
    icon: 'i-lucide-file-check',
    title: 'Auftragsverarbeitungsvertrag (AVV)',
    description: 'Automatisch erzeugter AVV zwischen dir als Coach und HxRoom – direkt abrufbar und downloadbar.',
  },
  {
    icon: 'i-lucide-trash-2',
    title: 'Datenlöschung auf Anfrage',
    description: 'Klienten können die Löschung ihrer Daten beantragen – du siehst und bearbeitest Anfragen hier.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 flex flex-col gap-6 max-w-3xl">
    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-1">Rechtliches</h1>
      <p class="text-sm text-muted">Was auf deiner Buchungsseite unter Impressum und Datenschutz steht.</p>
    </div>

    <UAlert
      v-if="status.complete"
      icon="i-lucide-circle-check"
      color="success"
      variant="soft"
      title="Dein Impressum ist hinterlegt"
      :description="`Klienten können über deine Buchungsseite buchen.${confirmedAtLabel ? ` Zuletzt bestätigt am ${confirmedAtLabel}.` : ''}`"
    />
    <UAlert
      v-else
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="soft"
      title="Noch kein Impressum"
      description="Solange es fehlt, ist deine Buchungsseite zu sehen, aber Klienten können noch nicht buchen."
    />

    <UForm :state="state" :validate="validate" :validate-on="['change']" class="flex flex-col gap-6" @submit="onSubmit">
      <!-- Impressum -->
      <SettingsSection
        title="Impressum"
        description="Auf deiner Buchungsseite trittst du als Anbieter auf – deshalb brauchst du ein eigenes Impressum. Darunter steht HxRoom als technischer Betreiber."
      >
        <template v-if="imprintPreviewUrl" #actions>
          <UButton
            variant="link"
            color="primary"
            size="xs"
            trailing-icon="i-lucide-external-link"
            :to="imprintPreviewUrl"
            target="_blank"
            label="Vorschau ansehen"
          />
        </template>

        <URadioGroup
          v-model="state.imprintMode"
          :items="modeItems"
          orientation="horizontal"
          variant="card"
          :ui="{ fieldset: 'grid grid-cols-1 sm:grid-cols-2 gap-3', item: 'w-full' }"
        />

        <div v-if="state.imprintMode === 'form'" class="flex flex-col gap-4">
          <UFormField label="Name oder Firma" name="imprint.name" required>
            <UInput v-model="state.imprint.name" autocomplete="organization" class="w-full" :ui="inputUi" />
          </UFormField>

          <UFormField label="Straße und Hausnummer" name="imprint.street" required>
            <UInput v-model="state.imprint.street" autocomplete="street-address" class="w-full" :ui="inputUi" />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-4">
            <UFormField label="PLZ" name="imprint.postalCode" required>
              <UInput v-model="state.imprint.postalCode" autocomplete="postal-code" class="w-full" :ui="inputUi" />
            </UFormField>
            <UFormField label="Ort" name="imprint.city" required>
              <UInput v-model="state.imprint.city" autocomplete="address-level2" class="w-full" :ui="inputUi" />
            </UFormField>
          </div>

          <UFormField label="Land" name="imprint.country" required>
            <UInput v-model="state.imprint.country" autocomplete="country-name" class="w-full sm:w-1/2" :ui="inputUi" />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="E-Mail" name="imprint.email" required>
              <UInput v-model="state.imprint.email" type="email" autocomplete="email" class="w-full" :ui="inputUi" />
            </UFormField>
            <UFormField label="Telefon" name="imprint.phone" required help="Neben der E-Mail verlangt das Gesetz einen zweiten schnellen Kontaktweg.">
              <UInput v-model="state.imprint.phone" type="tel" autocomplete="tel" placeholder="+49 …" class="w-full" :ui="inputUi" />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Rechtsform" name="imprint.legalForm">
              <USelect v-model="state.imprint.legalForm" :items="legalFormItems" class="w-full" :ui="inputUi" />
            </UFormField>
            <UFormField v-if="showRepresentative" label="Vertretungsberechtigt" name="imprint.representative" help="Zum Beispiel die Geschäftsführung.">
              <UInput v-model="state.imprint.representative" class="w-full" :ui="inputUi" />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Registereintrag" name="imprint.register" hint="optional" help="Registergericht und Nummer, falls vorhanden.">
              <UInput v-model="state.imprint.register" class="w-full" :ui="inputUi" />
            </UFormField>
            <UFormField label="USt-IdNr." name="imprint.vatId" hint="optional">
              <UInput v-model="state.imprint.vatId" placeholder="DE…" class="w-full" :ui="inputUi" />
            </UFormField>
          </div>

          <UFormField label="Zusatz" name="imprint.addition" hint="optional" help="Zum Beispiel „Kleinunternehmer nach § 19 UStG“ oder eine Verbandsmitgliedschaft.">
            <UTextarea v-model="state.imprint.addition" :rows="2" autoresize class="w-full" :ui="inputUi" />
          </UFormField>
        </div>

        <UFormField v-else label="Link auf dein Impressum" name="imprintUrl" required>
          <UInput v-model="state.imprintUrl" type="url" placeholder="https://deine-website.de/impressum" class="w-full" :ui="inputUi" />
        </UFormField>
      </SettingsSection>

      <!-- Datenschutz -->
      <SettingsSection
        title="Datenschutzerklärung"
        description="Die Datenschutzerklärung deiner Buchungsseite stellt HxRoom bereit – du bist darin als Verantwortlicher für die Daten deiner Klienten eingetragen. Sie folgt in Kürze."
      >
        <UFormField
          label="Eigene Datenschutzerklärung"
          name="privacyUrl"
          hint="optional"
          help="Hast du eine eigene, z. B. auf deiner Website, verweist die Buchungsseite zusätzlich darauf."
        >
          <UInput v-model="state.privacyUrl" type="url" placeholder="https://deine-website.de/datenschutz" class="w-full" :ui="inputUi" />
        </UFormField>
      </SettingsSection>

      <!-- AGB -->
      <SettingsSection
        title="AGB"
        description="Deine Geschäftsbedingungen für Klienten, etwa zu Absagen und Bezahlung. Eine Vorlage stellt HxRoom nicht bereit."
      >
        <UFormField label="Link auf deine AGB" name="termsUrl" hint="optional" help="Erscheint in der Fußzeile deiner Buchungsseite.">
          <UInput v-model="state.termsUrl" type="url" placeholder="https://deine-website.de/agb" class="w-full" :ui="inputUi" />
        </UFormField>
      </SettingsSection>

      <!-- Bestätigen und speichern -->
      <SettingsSection>
        <UFormField name="confirmed">
          <UCheckbox
            v-model="state.confirmed"
            :label="state.imprintMode === 'form' ? 'Diese Angaben sind korrekt und vollständig.' : 'Mein Impressum unter diesem Link ist korrekt und vollständig.'"
            description="Für die Angaben bist du selbst verantwortlich. Jede Änderung musst du neu bestätigen."
          />
        </UFormField>

        <UAlert v-if="saveError" icon="i-lucide-circle-x" color="error" variant="soft" :description="saveError" />

        <div class="flex items-center gap-3">
          <UButton type="submit" :loading="saving" label="Speichern" />
          <span v-if="justSaved" class="text-sm text-success flex items-center gap-1.5">
            <UIcon name="i-lucide-check" class="size-4" /> Gespeichert
          </span>
        </div>
      </SettingsSection>
    </UForm>

    <SettingsSection title="Geplante Features" description="Das kommt als Nächstes.">
      <div class="flex flex-col gap-2">
        <UpcomingFeature v-for="item in features" :key="item.title" v-bind="item" />
      </div>
    </SettingsSection>
  </div>
</template>
