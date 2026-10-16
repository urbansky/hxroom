<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import {
  LEGAL_FORMS,
  bookingPageLegalSchema,
  isCompanyLegalForm,
  requiresRegister,
  type Imprint,
  type LegalForm,
} from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

// Impressum und Links der Buchungsseite (doc/legal.md §3.2). Ausdrückliches Speichern statt
// Autosave: Die Bestätigung „korrekt und vollständig“ gilt immer für genau den gespeicherten
// Stand. Ohne vollständiges Impressum nimmt die Buchungsseite keine Buchungen an.
//
// Die Seite zeigt zunächst nur, was fast jeder Coach braucht: Name, Anschrift, E-Mail,
// Telefon. Angaben für Unternehmen erscheinen erst nach der Frage „Wie bist du tätig?“,
// Seltenes (USt-IdNr., Land, Zusatz) und die eigenen Links liegen eingeklappt darunter.

const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const { $api } = useApi()
const { session } = useAuth()

interface LegalResponse {
  imprintMode: 'form' | 'link' | null
  imprint: Imprint | null
  imprintUrl: string | null
  imprintConfirmedAt: string | null
  privacyUrl: string | null
  termsUrl: string | null
  imprintComplete: boolean
}

type Entity = 'person' | 'company'

// Formular-Shape: alle Felder als Strings, leere optionale Felder gehen als null hinaus.
// Die Rechtsform steckt in zwei Feldern: `entity` beantwortet die Frage oben, `legalForm`
// ist nur bei Unternehmen gefüllt (bei Einzelpersonen speichert die API 'sole').
interface ImprintFields {
  entity: Entity
  legalForm: LegalForm | ''
  name: string
  street: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
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

const { data: bookingPage } = await useFetch<{ subdomain: string | null, profileName: string | null }>('/booking-page', { $fetch: $api })

function toFields(imprint: Imprint | null): ImprintFields {
  const company = isCompanyLegalForm(imprint?.legalForm)
  return {
    entity:         company ? 'company' : 'person',
    legalForm:      company ? imprint!.legalForm! : '',
    // Ohne gespeichertes Impressum vorbelegt mit dem, was HxRoom schon weiß.
    name:           imprint?.name ?? bookingPage.value?.profileName ?? '',
    street:         imprint?.street ?? '',
    postalCode:     imprint?.postalCode ?? '',
    city:           imprint?.city ?? '',
    country:        imprint?.country ?? 'Deutschland',
    email:          imprint?.email ?? session.value.data?.user?.email ?? '',
    phone:          imprint?.phone ?? '',
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

// Eingeklappte Bereiche öffnen sich von selbst, wenn darin schon etwas steht.
const moreOpen = ref(false)
const linksOpen = ref(false)

function applyResponse(data: LegalResponse) {
  state.imprintMode = data.imprintMode ?? 'form'
  state.imprint = toFields(data.imprint)
  state.imprintUrl = data.imprintUrl ?? ''
  state.privacyUrl = data.privacyUrl ?? ''
  state.termsUrl = data.termsUrl ?? ''
  status.value = { complete: data.imprintComplete, confirmedAt: data.imprintConfirmedAt }
  moreOpen.value ||= !!(state.imprint.vatId || state.imprint.addition || state.imprint.country !== 'Deutschland')
  linksOpen.value ||= !!(state.privacyUrl || state.termsUrl)
}

await useFetch<LegalResponse>('/booking-page/legal', {
  $fetch: $api,
  onResponse({ response }) {
    if (response._data) applyResponse(response._data as LegalResponse)
  },
})

const bookingPageOrigin = computed(() =>
  bookingPage.value?.subdomain
    ? `${rootDomainHttps ? 'https' : 'http'}://${bookingPage.value.subdomain}.${rootDomain}`
    : null,
)
const imprintPreviewUrl = computed(() => bookingPageOrigin.value && `${bookingPageOrigin.value}/impressum`)
const privacyPreviewUrl = computed(() => bookingPageOrigin.value && `${bookingPageOrigin.value}/datenschutz`)

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

const isCompany = computed(() => state.imprint.entity === 'company')
const registerRequired = computed(() => isCompany.value && requiresRegister(state.imprint.legalForm || null))

const entityItems = [
  { value: 'person', label: 'Als Einzelperson', description: 'Selbstständig oder freiberuflich' },
  { value: 'company', label: 'Als Unternehmen', description: 'GbR, UG, GmbH …' },
]
const companyFormItems = Object.entries(LEGAL_FORMS)
  .filter(([value]) => value !== 'sole')
  .map(([value, label]) => ({ value, label }))

function optional(value: string): string | null {
  return value.trim() ? value.trim() : null
}

function toPayload(form: LegalFormState) {
  const f = form.imprint
  const company = f.entity === 'company'
  return {
    imprintMode: form.imprintMode,
    // Die jeweils andere Form schickt das Formular nicht mit; die API behält sie gespeichert.
    imprint: form.imprintMode === 'form'
      ? {
          name: f.name, street: f.street, postalCode: f.postalCode, city: f.city, country: f.country,
          email: f.email, phone: f.phone,
          legalForm: company ? (f.legalForm || null) : 'sole',
          representative: company ? optional(f.representative) : null,
          register: company ? optional(f.register) : null,
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
  'imprint.name':           'Bitte deinen Namen bzw. die Firma angeben.',
  'imprint.street':         'Bitte Straße und Hausnummer angeben.',
  'imprint.postalCode':     'Bitte eine Postleitzahl angeben.',
  'imprint.city':           'Bitte den Ort angeben.',
  'imprint.country':        'Bitte das Land angeben.',
  'imprint.email':          'Bitte eine gültige E-Mail-Adresse angeben.',
  'imprint.phone':          'Bitte eine Telefonnummer angeben, z. B. +49 351 123456.',
  'imprint.legalForm':      'Bitte die Rechtsform wählen.',
  'imprint.representative': 'Bitte angeben, wer das Unternehmen vertritt.',
  'imprint.register':       'Für diese Rechtsform ist der Registereintrag Pflicht.',
  'imprint.vatId':          'Höchstens 30 Zeichen.',
  'imprint.addition':       'Höchstens 1000 Zeichen.',
  'imprintUrl':             'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'privacyUrl':             'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'termsUrl':               'Bitte einen vollständigen Link angeben, der mit https:// beginnt.',
  'confirmed':              'Bitte bestätige, dass die Angaben korrekt und vollständig sind.',
}

const foldedImprintFields = ['imprint.vatId', 'imprint.addition', 'imprint.country']
const foldedLinkFields = ['privacyUrl', 'termsUrl']

function validate(form: LegalFormState): FormError[] {
  const errors: FormError[] = []
  const result = bookingPageLegalSchema.safeParse(toPayload(form))
  if (!result.success) {
    for (const issue of result.error.issues) {
      const name = issue.path.join('.')
      errors.push({ name, message: messages[name] ?? 'Bitte prüfe diese Angabe.' })
    }
  }
  // Das Schema lässt eine fehlende Rechtsform zu (Einzelpersonen haben keine Auswahl) –
  // wer „Unternehmen“ gewählt hat, muss sie aber angeben. Vertretung und Register prüft das
  // Schema erst, wenn alles andere stimmt; hier vorab, damit alle Fehler auf einmal erscheinen.
  if (form.imprintMode === 'form' && form.imprint.entity === 'company') {
    const f = form.imprint
    const add = (name: string, missing: boolean) => {
      if (missing && !errors.some(e => e.name === name)) errors.push({ name, message: messages[name]! })
    }
    add('imprint.legalForm', !f.legalForm)
    add('imprint.representative', !f.representative.trim())
    add('imprint.register', requiresRegister(f.legalForm || null) && !f.register.trim())
  }
  // Ein Fehler in einem eingeklappten Bereich soll nicht unsichtbar bleiben.
  if (errors.some(e => foldedImprintFields.includes(e.name!))) moreOpen.value = true
  if (errors.some(e => foldedLinkFields.includes(e.name!))) linksOpen.value = true
  return errors
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
  <div class="p-4 sm:p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">
    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-1">Rechtliches</h1>
      <p class="text-sm text-muted">Damit Klienten buchen können, brauchst du ein Impressum. Das dauert etwa zwei Minuten.</p>
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
        description="Auf deiner Buchungsseite trittst du als Anbieter auf. Darunter steht HxRoom als technischer Betreiber."
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

        <!-- Angaben im Formular -->
        <template v-if="state.imprintMode === 'form'">
          <UFormField label="Wie bist du tätig?" name="imprint.entity">
            <URadioGroup
              v-model="state.imprint.entity"
              :items="entityItems"
              orientation="horizontal"
              variant="card"
              :ui="{ fieldset: 'grid grid-cols-1 sm:grid-cols-2 gap-3', item: 'w-full' }"
            />
          </UFormField>

          <div class="flex flex-col gap-4">
            <UFormField :label="isCompany ? 'Firma' : 'Vor- und Nachname'" name="imprint.name" required :help="isCompany ? 'So, wie sie im Register oder Gesellschaftsvertrag steht.' : undefined">
              <UInput v-model="state.imprint.name" :autocomplete="isCompany ? 'organization' : 'name'" class="w-full" :ui="inputUi" />
            </UFormField>

            <div v-if="isCompany" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Rechtsform" name="imprint.legalForm" required>
                <USelect v-model="state.imprint.legalForm" :items="companyFormItems" placeholder="Bitte wählen" class="w-full" :ui="inputUi" />
              </UFormField>
              <UFormField label="Vertretungsberechtigt" name="imprint.representative" required help="Zum Beispiel die Geschäftsführung oder alle Gesellschafter.">
                <UInput v-model="state.imprint.representative" class="w-full" :ui="inputUi" />
              </UFormField>
            </div>

            <UFormField
              v-if="isCompany"
              label="Registereintrag"
              name="imprint.register"
              :required="registerRequired"
              :hint="registerRequired ? undefined : 'falls vorhanden'"
              help="Registergericht und Nummer, z. B. Amtsgericht Dresden, HRB 12345."
            >
              <UInput v-model="state.imprint.register" class="w-full" :ui="inputUi" />
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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="E-Mail" name="imprint.email" required>
                <UInput v-model="state.imprint.email" type="email" autocomplete="email" class="w-full" :ui="inputUi" />
              </UFormField>
              <UFormField label="Telefon" name="imprint.phone" required help="Das Gesetz verlangt neben der E-Mail einen zweiten schnellen Kontaktweg.">
                <UInput v-model="state.imprint.phone" type="tel" autocomplete="tel" placeholder="+49 …" class="w-full" :ui="inputUi" />
              </UFormField>
            </div>

            <!-- Seltenes eingeklappt -->
            <div>
              <UButton
                variant="link"
                color="neutral"
                size="sm"
                class="px-0"
                :icon="moreOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                :label="moreOpen ? 'Weitere Angaben' : 'Weitere Angaben: USt-IdNr., Land, Zusatz'"
                @click="moreOpen = !moreOpen"
              />
              <div v-if="moreOpen" class="flex flex-col gap-4 mt-3">
                <UFormField
                  label="USt-IdNr. oder Wirtschafts-ID"
                  name="imprint.vatId"
                  hint="Pflicht, falls vorhanden"
                  help="Hast du eine der beiden Nummern, musst du sie angeben. Eine genügt. Die Steuernummer gehört nicht hierher."
                >
                  <UInput v-model="state.imprint.vatId" placeholder="DE…" class="w-full sm:w-1/2" :ui="inputUi" />
                </UFormField>
                <UFormField label="Land" name="imprint.country" required>
                  <UInput v-model="state.imprint.country" autocomplete="country-name" class="w-full sm:w-1/2" :ui="inputUi" />
                </UFormField>
                <UFormField label="Zusatz" name="imprint.addition" hint="optional" help="Zum Beispiel eine Verbandsmitgliedschaft oder Berufshaftpflicht.">
                  <UTextarea v-model="state.imprint.addition" :rows="2" autoresize class="w-full" :ui="inputUi" />
                </UFormField>
              </div>
            </div>
          </div>

          <p class="text-sm text-muted">
            Schon ein Impressum auf deiner Website?
            <UButton variant="link" color="primary" size="sm" class="px-0" label="Stattdessen verlinken" @click="state.imprintMode = 'link'" />
          </p>
        </template>

        <!-- Link auf ein vorhandenes Impressum -->
        <template v-else>
          <UFormField label="Link auf dein Impressum" name="imprintUrl" required>
            <UInput v-model="state.imprintUrl" type="url" placeholder="https://deine-website.de/impressum" class="w-full" :ui="inputUi" />
          </UFormField>
          <p class="text-sm text-muted">
            Kein eigenes Impressum?
            <UButton variant="link" color="primary" size="sm" class="px-0" label="Angaben hier eintragen" @click="state.imprintMode = 'form'" />
          </p>
        </template>
      </SettingsSection>

      <!-- Eigene Links, eingeklappt -->
      <SettingsSection>
        <template #header>
          <button type="button" class="flex items-center gap-2 font-bold cursor-pointer" @click="linksOpen = !linksOpen">
            <UIcon :name="linksOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
            Eigene Links
            <span class="text-sm font-normal text-muted">optional</span>
          </button>
        </template>

        <template v-if="linksOpen">
          <p class="text-sm text-muted -mt-2">
            Die Datenschutzerklärung deiner Buchungsseite stellt HxRoom bereit, du bist darin als Verantwortlicher für die Daten deiner Klienten eingetragen.
            <ULink v-if="privacyPreviewUrl" :to="privacyPreviewUrl" target="_blank" class="text-primary underline underline-offset-2">So sieht sie aus</ULink>.
            Eigene Texte kannst du hier zusätzlich verlinken.
          </p>
          <UFormField label="Eigene Datenschutzerklärung" name="privacyUrl" help="Die Buchungsseite verweist dann zusätzlich darauf.">
            <UInput v-model="state.privacyUrl" type="url" placeholder="https://deine-website.de/datenschutz" class="w-full" :ui="inputUi" />
          </UFormField>
          <UFormField label="Deine AGB" name="termsUrl" help="Erscheinen in der Fußzeile deiner Buchungsseite. Eine Vorlage stellt HxRoom nicht bereit.">
            <UInput v-model="state.termsUrl" type="url" placeholder="https://deine-website.de/agb" class="w-full" :ui="inputUi" />
          </UFormField>
        </template>
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

    <SettingsSection v-if="SHOW_UPCOMING_FEATURES" title="Geplante Features" description="Das kommt als Nächstes.">
      <div class="flex flex-col gap-2">
        <UpcomingFeature v-for="item in features" :key="item.title" v-bind="item" />
      </div>
    </SettingsSection>
  </div>
</template>
