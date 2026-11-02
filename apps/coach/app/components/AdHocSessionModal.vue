<script setup lang="ts">
import type { AdHocBookingResponse, ClientListItem, OfferResponse } from '@hxroom/shared'

/**
 * Spontan-Termin: eine Sitzung, die jetzt beginnt (backoffice-coach.md 2.04).
 *
 * Zwei Einstiege, eine Komponente: Im Klientenprofil steht der Klient fest, im Dashboard
 * wird er hier gewählt – oder statt seiner eine E-Mail-Adresse eingeladen (UX-04). Deshalb
 * `client` **oder** `clients` – nicht beides.
 *
 * Bei der E-Mail-Adresse ordnet die API den Termin still einem Klienten zu, dem die Adresse
 * schon gehört. Der Ergebnis-Schritt nennt dann dessen Namen.
 *
 * Bewusst kein ClientPicker: Der ist ein Slideover, und ein Slideover aus einem Modal
 * heraus legt zwei überlagernde Ebenen übereinander. Für eine Auswahl aus einer bereits
 * geladenen Liste genügt ein USelectMenu.
 */
// Eingabeflächen stehen weiß auf dem Modal-Grund. Nuxt UI gibt ihnen sonst bg-default –
// denselben Token, aus dem auch die Modal-Fläche kommt, das Feld verschwindet dann darin.
// Zentral in app.config.ts geht das nicht: Dort gewinnt die Varianten-Klasse bg-default
// über slots.base. Dasselbe Muster steht in ClientFormSlideover und sechs weiteren Stellen.
const inputUi = { base: 'bg-white dark:bg-neutral-800', content: 'bg-white dark:bg-neutral-900' }

const props = defineProps<{
  /** Vorgegebener Klient (Klientenprofil). */
  client?: { id: string, name: string } | null
  /** Auswahlliste, wenn kein Klient feststeht (Dashboard). */
  clients?: ClientListItem[]
  offers: OfferResponse[]
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()
const toast = useToast()

type InviteMode = 'client' | 'email'
const MODE_ITEMS = [
  { label: 'Klient', value: 'client', icon: 'i-lucide-user' },
  { label: 'E-Mail-Adresse', value: 'email', icon: 'i-lucide-mail' },
]

const mode = ref<InviteMode>('client')
const selectedClientId = ref<string | undefined>(undefined)
const email = ref('')
const name = ref('')
const createClient = ref(false)
const selectedOfferId = ref<string | null>(null)
/** Angebotsauswahl aufgeklappt – zu Beginn steht nur eine Zeile mit dem, was gilt. */
const offerOpen = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)
/** Gesetzt nach dem Anlegen – ab da zeigt das Modal den Link statt des Formulars. */
const created = ref<AdHocBookingResponse | null>(null)

// Nur aktive Angebote: Ein deaktiviertes Angebot ist eines, das der Coach gerade nicht
// anbietet – auch nicht spontan.
const offerItems = computed(() =>
  props.offers
    .filter(offer => offer.isActive)
    .map(offer => ({ label: `${offer.name} · ${offer.durationMinutes} Min.`, value: offer.id })),
)

// Zusammengeklappt steht dort, was ohne weiteres Zutun gilt: das vorausgewählte Angebot
// oder der Spontan-Standard der API (AD_HOC_OFFER_NAME, AD_HOC_DURATION_MINUTES).
const offerSummary = computed(() =>
  offerItems.value.find(item => item.value === selectedOfferId.value)?.label
  ?? 'keins',
)

// Ohne gewähltes Angebot gibt es im Auswahlfeld nichts zu sehen – dann zurück zur Zeile,
// nach dem Leeren ebenso wie nach dem Schließen der Liste ohne Auswahl.
function clearOffer() {
  selectedOfferId.value = null
  offerOpen.value = false
}

function onOfferMenuToggle(isOpen: boolean) {
  if (!isOpen && !selectedOfferId.value) offerOpen.value = false
}

// Die E-Mail steht als `description` unter dem Namen: Zwei Klienten mit gleichem oder
// ähnlichem Namen sind sonst nicht auseinanderzuhalten, und die Adresse ist das, was
// gleich den Zugangslink bekommt.
const clientItems = computed(() =>
  (props.clients ?? []).map(client => ({
    label: client.name,
    description: client.email,
    value: client.id,
  })),
)

// Ohne Klienten gibt es nichts zu wählen – dann nur die E-Mail-Adresse, ohne Umschalter.
const hasClients = computed(() => Boolean(props.clients?.length))
const byEmail = computed(() => !props.client && (mode.value === 'email' || !hasClients.value))

const clientId = computed(() => props.client?.id ?? selectedClientId.value)
const selectedClientEmail = computed(() => props.clients?.find(c => c.id === selectedClientId.value)?.email)
// Das Namensfeld gibt es nur mit dem Haken. Ein Name, der vor dem Abwählen getippt wurde,
// soll danach nicht unsichtbar mitgeschickt werden.
const trimmedName = computed(() => createClient.value ? name.value.trim() : '')
const displayName = computed(() => byEmail.value
  ? trimmedName.value
  : props.client?.name ?? props.clients?.find(c => c.id === selectedClientId.value)?.name ?? '',
)

// Nur eine grobe Vorprüfung für den Knopf – die eigentliche Prüfung macht die API.
const emailLooksValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

// Pflicht ist nur, wen die Einladung erreicht: Ohne Angebot entsteht ein Spontan-Termin
// mit dem Standard aus der API (60 Minuten) – ein Gespräch, das jetzt stattfindet, passt
// oft in keines der veröffentlichten Angebote. Der Name zählt erst, wenn daraus ein
// Klient werden soll.
const canSubmit = computed(() => {
  if (pending.value) return false
  if (!byEmail.value) return Boolean(clientId.value)
  return emailLooksValid.value && (!createClient.value || trimmedName.value !== '')
})

// Beim Öffnen zurücksetzen: Das Modal überlebt den Seitenwechsel nicht, wohl aber den
// zweiten Klick auf denselben Knopf – dort soll kein alter Link mehr stehen.
watch(open, (isOpen) => {
  if (!isOpen) return
  mode.value = 'client'
  selectedClientId.value = undefined
  email.value = ''
  name.value = ''
  createClient.value = false
  offerOpen.value = false
  selectedOfferId.value = offerItems.value.length === 1 ? offerItems.value[0]!.value : null
  errorMessage.value = null
  created.value = null
})

async function start() {
  if (!canSubmit.value) return
  pending.value = true
  errorMessage.value = null

  try {
    // Weglassen statt null: Angebot und Name sind im Schema optional, nicht nullable.
    const invitee = byEmail.value
      ? {
          email: email.value.trim(),
          ...(trimmedName.value ? { name: trimmedName.value } : {}),
          createClient: createClient.value,
        }
      : { clientId: clientId.value }

    created.value = await $api<AdHocBookingResponse>('/bookings/ad-hoc', {
      method: 'POST',
      body: {
        ...invitee,
        ...(selectedOfferId.value ? { offerId: selectedOfferId.value } : {}),
      },
    })
  } catch {
    errorMessage.value = 'Die Sitzung konnte nicht angelegt werden.'
  } finally {
    pending.value = false
  }
}

// Der Link ist der eigentliche Ertrag: Eine Mail ist für ein Gespräch in fünf Minuten oft
// zu langsam, der Coach schickt ihn nebenher per WhatsApp oder liest ihn am Telefon vor.
async function copyLink() {
  if (!created.value) return
  try {
    await navigator.clipboard.writeText(created.value.callUrl)
    toast.add({ title: 'Link kopiert', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: 'Markiere den Link und kopiere ihn von Hand.', color: 'warning' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Spontan-Termin"
    :description="created
      ? 'Die Sitzung läuft. Der Zugangslink ist per E-Mail unterwegs.'
      : 'Die Sitzung beginnt sofort. Der Zugangslink geht per E-Mail hinaus.'"
  >
    <template #body>
      <div v-if="created" class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          Der Raum für {{ created.clientName }} ist offen – {{ created.durationMinutes }} Min.,
          {{ created.offerName }}.
        </p>

        <UFormField label="Zugangslink" help="Falls es schneller gehen muss als die E-Mail.">
          <div class="flex gap-2">
            <UInput :model-value="created.callUrl" readonly class="flex-1" :ui="inputUi" />
            <UButton icon="i-lucide-copy" color="neutral" variant="outline" aria-label="Link kopieren" @click="copyLink" />
          </div>
        </UFormField>
      </div>

      <div v-else class="flex flex-col gap-4">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />

        <UFormField v-if="props.client" label="Klient">
          <p class="text-highlighted">{{ props.client.name }}</p>
        </UFormField>

        <template v-else>
          <!-- basis-0: Ohne gemeinsame Ausgangsbreite verteilt `grow` nur den Rest, und
               der längere Text bekommt den breiteren Reiter. -->
          <UTabs v-if="hasClients" v-model="mode" :items="MODE_ITEMS" :content="false" size="sm" class="w-full" :ui="{ trigger: 'basis-0' }" />

          <!-- Beide Varianten liegen übereinander in derselben Rasterzelle, die inaktive
               unsichtbar: So nimmt der Bereich immer die Höhe der größeren ein, und das
               zentrierte Modal springt beim Umschalten nicht. -->
          <div class="grid">
            <div class="[grid-area:1/1] flex flex-col gap-4" :class="{ invisible: !byEmail }">
              <UFormField label="E-Mail-Adresse" required>
                <UInput v-model="email" type="email" autocomplete="off" placeholder="name@beispiel.de" class="w-full" :ui="inputUi" />
              </UFormField>

              <!-- Der Name steht in derselben Zeile wie der Haken und erscheint erst mit
                   ihm – ein schneller Termin braucht nur die Adresse, und die Zeile hat
                   mit und ohne Feld dieselbe Höhe. -->
              <div class="flex items-center gap-3 h-8">
                <UCheckbox v-model="createClient" label="Als Klient anlegen" class="shrink-0" />
                <UInput
                  v-if="createClient"
                  v-model="name"
                  autocomplete="off"
                  autofocus
                  placeholder="Name (Pflicht)"
                  aria-label="Name"
                  required
                  class="flex-1 min-w-0"
                  :ui="inputUi"
                />
              </div>
            </div>

            <UFormField
              v-if="hasClients"
              label="Klient"
              :help="selectedClientEmail
                ? `Die Einladung geht an ${selectedClientEmail}.`
                : 'Die Einladung geht an die hinterlegte E-Mail-Adresse.'"
              class="[grid-area:1/1]"
              :class="{ invisible: byEmail }"
            >
              <USelectMenu
                v-model="selectedClientId"
                :items="clientItems"
                value-key="value"
                :filter-fields="['label', 'description']"
                placeholder="Klient wählen"
                class="w-full"
                :ui="inputUi"
              />
            </UFormField>
          </div>
        </template>

        <!-- Das Angebot ist optional und deshalb zugeklappt: eine Zeile mit dem, was gilt,
             und ein Link zum Ändern. Die Auswahl ersetzt die Zeile an derselben Stelle und
             in derselben Höhe, damit das Modal auch hier nicht springt. -->
        <div class="flex items-center gap-3 h-8">
          <USelectMenu
            v-if="offerOpen"
            v-model="selectedOfferId"
            :items="offerItems"
            value-key="value"
            placeholder="Angebot wählen"
            default-open
            clear
            class="flex-1 min-w-0"
            :ui="inputUi"
            @clear="clearOffer"
            @update:open="onOfferMenuToggle"
          />
          <template v-else>
            <p class="flex-1 min-w-0 truncate text-sm">
              <span class="text-muted">Angebot:</span> {{ offerSummary }}
            </p>
            <UButton
              v-if="offerItems.length"
              :label="selectedOfferId ? 'Ändern' : 'Angebot wählen'"
              color="neutral"
              variant="link"
              size="sm"
              class="shrink-0"
              @click="offerOpen = true"
            />
          </template>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <template v-if="created">
          <UButton color="neutral" variant="outline" label="Schließen" @click="open = false" />
          <UButton :to="`/call/${created.id}`" icon="i-lucide-video" label="Zur Sitzung" />
        </template>
        <template v-else>
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
          <UButton
            icon="i-lucide-video"
            :loading="pending"
            :disabled="!canSubmit"
            :label="displayName ? `Sitzung mit ${displayName} starten` : 'Sitzung starten'"
            @click="start"
          />
        </template>
      </div>
    </template>
  </UModal>
</template>
