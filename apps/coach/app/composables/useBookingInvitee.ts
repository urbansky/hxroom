import type { ClientListItem } from '@hxroom/shared'

/**
 * Wer zu einem Termin eingeladen wird – Spontan-Termin und manuell angelegter Termin teilen
 * sich die Regel (UX-04): ein vorgegebener Klient, einer aus der Auswahlliste oder eine
 * E-Mail-Adresse, aus der auf Wunsch ein Klient wird. Die Felder dazu zeigt
 * BookingInviteeFields.vue.
 *
 * `client` **oder** `clients` – nicht beides: Im Klientenprofil steht der Klient fest, im
 * Dashboard und unter Termine wird er gewählt.
 */
export function useBookingInvitee(source: () => { client?: { id: string, name: string } | null, clients?: ClientListItem[] }) {
  const mode = ref<'client' | 'email'>('client')
  const selectedClientId = ref<string | undefined>(undefined)
  const email = ref('')
  const name = ref('')
  const createClient = ref(false)

  // Ohne Klienten gibt es nichts zu wählen – dann nur die E-Mail-Adresse, ohne Umschalter.
  const hasClients = computed(() => Boolean(source().clients?.length))
  const byEmail = computed(() => !source().client && (mode.value === 'email' || !hasClients.value))

  const clientId = computed(() => source().client?.id ?? selectedClientId.value)
  const selectedClient = computed(() => source().clients?.find(c => c.id === selectedClientId.value))
  // Das Namensfeld gibt es nur mit dem Haken. Ein Name, der vor dem Abwählen getippt wurde,
  // soll danach nicht unsichtbar mitgeschickt werden.
  const trimmedName = computed(() => createClient.value ? name.value.trim() : '')
  const displayName = computed(() => byEmail.value
    ? trimmedName.value
    : source().client?.name ?? selectedClient.value?.name ?? '',
  )

  // Nur eine grobe Vorprüfung für den Knopf – die eigentliche Prüfung macht die API.
  const emailLooksValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

  /** Reicht die Angabe, um jemanden einzuladen? Der Name zählt erst, wenn ein Klient entstehen soll. */
  const isComplete = computed(() => {
    if (!byEmail.value) return Boolean(clientId.value)
    return emailLooksValid.value && (!createClient.value || trimmedName.value !== '')
  })

  // Weglassen statt null: Der Name ist im Schema optional, nicht nullable.
  function payload() {
    return byEmail.value
      ? {
          email: email.value.trim(),
          ...(trimmedName.value ? { name: trimmedName.value } : {}),
          createClient: createClient.value,
        }
      : { clientId: clientId.value! }
  }

  function reset() {
    mode.value = 'client'
    selectedClientId.value = undefined
    email.value = ''
    name.value = ''
    createClient.value = false
  }

  return {
    mode,
    selectedClientId,
    email,
    name,
    createClient,
    hasClients,
    byEmail,
    clientId,
    selectedClient,
    displayName,
    isComplete,
    payload,
    reset,
  }
}

export type BookingInvitee = ReturnType<typeof useBookingInvitee>
