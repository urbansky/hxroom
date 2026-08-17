<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AccountDeletionStatus } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $authClient } = useNuxtApp()
const { session } = useAuth()
const { $api } = useApi()

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

// ─── E-Mail-Adresse ────────────────────────────────────────────────────────────────────
// Der Wechsel braucht zwei Bestätigungen: erst gibt die bisherige Adresse ihn frei, dann
// bestätigt die neue. Ein übernommenes Session-Cookie kann das Konto so nicht stillschweigend
// entwenden. Wirksam wird der Wechsel erst nach dem zweiten Klick – der Hinweistext unten sagt
// das ausdrücklich, sonst wartet der Coach auf eine Änderung, die noch aussteht.
const currentEmail = computed(() => session.value.data?.user?.email ?? '')
const emailVerified = computed(() => session.value.data?.user?.emailVerified === true)

const emailSchema = z.object({
  newEmail: z.string().email('Ungültige E-Mail-Adresse'),
})
type EmailSchema = z.infer<typeof emailSchema>

const emailForm = reactive<EmailSchema>({ newEmail: '' })
const emailPending = ref(false)
const emailError = ref<string | null>(null)
const emailRequestedFor = ref<string | null>(null)

async function onSubmitEmail(event: FormSubmitEvent<EmailSchema>) {
  emailError.value = null
  emailRequestedFor.value = null
  emailPending.value = true
  try {
    const { error } = await $authClient.changeEmail({
      newEmail: event.data.newEmail,
      callbackURL: `${window.location.origin}/settings/account?email-changed=true`,
    })
    if (error) {
      emailError.value = mapAuthError(error, 'Die E-Mail-Adresse konnte nicht geändert werden.')
    } else {
      emailRequestedFor.value = event.data.newEmail
      emailForm.newEmail = ''
    }
  } finally {
    emailPending.value = false
  }
}

// Rückkehr vom Bestätigungslink: die Session trägt dann schon die neue Adresse.
const route = useRoute()
const emailChanged = computed(() => route.query['email-changed'] === 'true')

// ─── Passwort ──────────────────────────────────────────────────────────────────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword:     z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  repeatPassword:  z.string().min(1, 'Bitte wiederhole das neue Passwort'),
}).refine(data => data.newPassword === data.repeatPassword, {
  message: 'Die Passwörter stimmen nicht überein',
  path: ['repeatPassword'],
})
type PasswordSchema = z.infer<typeof passwordSchema>

const passwordForm = reactive<PasswordSchema>({ currentPassword: '', newPassword: '', repeatPassword: '' })
const passwordPending = ref(false)
const passwordError = ref<string | null>(null)
const passwordChanged = ref(false)

async function onSubmitPassword(event: FormSubmitEvent<PasswordSchema>) {
  passwordError.value = null
  passwordChanged.value = false
  passwordPending.value = true
  try {
    const { error } = await $authClient.changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
      // Ein Passwortwechsel ist oft eine Reaktion auf einen Verdacht: andere Geräte fliegen raus.
      revokeOtherSessions: true,
    })
    if (error) {
      passwordError.value = mapAuthError(error, 'Das Passwort konnte nicht geändert werden.')
    } else {
      passwordChanged.value = true
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.repeatPassword = ''
    }
  } finally {
    passwordPending.value = false
  }
}

// ─── Konto löschen ─────────────────────────────────────────────────────────────────────
const { data: deletion, refresh: refreshDeletion } = await useFetch<AccountDeletionStatus>('/account/deletion', {
  $fetch: $api,
})

const scheduledFor = computed(() => deletion.value?.scheduledFor ?? null)
const deletionDateLabel = computed(() => {
  if (!scheduledFor.value) return ''
  return new Date(scheduledFor.value).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

const confirmOpen = ref(false)
const deletePassword = ref('')
const deletePending = ref(false)
const deleteError = ref<string | null>(null)

function openConfirm() {
  deleteError.value = null
  deletePassword.value = ''
  confirmOpen.value = true
}

async function requestDeletion() {
  deleteError.value = null
  deletePending.value = true
  try {
    await $api('/account/deletion', { method: 'POST', body: { password: deletePassword.value } })
    confirmOpen.value = false
    deletePassword.value = ''
    await refreshDeletion()
  } catch (err: any) {
    // Die API antwortet englisch (Konvention aus CLAUDE.md), angezeigt wird deutsch.
    deleteError.value = err?.data?.statusCode === 400
      ? 'Das eingegebene Passwort ist falsch.'
      : 'Die Löschung konnte nicht beantragt werden.'
  } finally {
    deletePending.value = false
  }
}

const revokePending = ref(false)
const revokeError = ref<string | null>(null)

async function revokeDeletion() {
  revokeError.value = null
  revokePending.value = true
  try {
    await $api('/account/deletion', { method: 'DELETE' })
    await refreshDeletion()
  } catch {
    revokeError.value = 'Die Löschung konnte nicht zurückgenommen werden. Bitte versuche es erneut.'
  } finally {
    revokePending.value = false
  }
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-1">Account</h1>
      <p class="text-sm text-muted">Verwaltung deines Kontos und deiner Sicherheitseinstellungen.</p>
    </div>

    <UAlert
      v-if="emailChanged"
      icon="i-lucide-check-circle"
      color="success"
      variant="soft"
      title="E-Mail-Adresse geändert"
      description="Du meldest dich ab jetzt mit deiner neuen Adresse an."
    />

    <!-- E-Mail-Adresse -->
    <SettingsSection
      title="E-Mail-Adresse"
      description="Deine Anmelde-Adresse. Eine Änderung muss von beiden Adressen bestätigt werden."
    >
      <div class="flex items-center gap-2 text-sm">
        <span class="text-highlighted">{{ currentEmail }}</span>
        <UBadge
          :color="emailVerified ? 'success' : 'warning'"
          variant="subtle"
          size="sm"
          :label="emailVerified ? 'Bestätigt' : 'Nicht bestätigt'"
        />
      </div>

      <UAlert
        v-if="emailRequestedFor"
        icon="i-lucide-mail-check"
        color="info"
        variant="soft"
        title="Freigabe angefordert"
        :description="`Wenn ${emailRequestedFor} verwendet werden kann, liegt jetzt eine Freigabe-Mail in ${currentEmail}. Nach deiner Freigabe schicken wir eine Bestätigung an die neue Adresse – erst danach ist der Wechsel wirksam.`"
      />
      <UAlert
        v-if="emailError"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="emailError"
      />

      <UForm :schema="emailSchema" :state="emailForm" class="flex flex-col gap-4" @submit="onSubmitEmail">
        <UFormField label="Neue E-Mail-Adresse" name="newEmail">
          <UInput
            v-model="emailForm.newEmail"
            type="email"
            autocomplete="email"
            placeholder="neu@example.de"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <div>
          <UButton type="submit" :loading="emailPending" label="E-Mail-Adresse ändern" />
        </div>
      </UForm>
    </SettingsSection>

    <!-- Passwort -->
    <SettingsSection
      title="Passwort"
      description="Beim Wechsel werden alle anderen angemeldeten Geräte abgemeldet."
    >
      <UAlert
        v-if="passwordChanged"
        icon="i-lucide-check-circle"
        color="success"
        variant="soft"
        title="Passwort geändert"
        description="Andere Geräte wurden abgemeldet."
      />
      <UAlert
        v-if="passwordError"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="passwordError"
      />

      <UForm :schema="passwordSchema" :state="passwordForm" class="flex flex-col gap-4" @submit="onSubmitPassword">
        <UFormField label="Aktuelles Passwort" name="currentPassword">
          <UInput
            v-model="passwordForm.currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <UFormField label="Neues Passwort" name="newPassword">
          <UInput
            v-model="passwordForm.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <UFormField label="Neues Passwort wiederholen" name="repeatPassword">
          <UInput
            v-model="passwordForm.repeatPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <div class="flex items-center gap-4">
          <UButton type="submit" :loading="passwordPending" label="Passwort ändern" />
          <NuxtLink to="/auth/forgot-password" class="text-sm text-muted hover:text-highlighted hover:underline">
            Passwort vergessen?
          </NuxtLink>
        </div>
      </UForm>
    </SettingsSection>

    <!-- Zwei-Faktor-Authentifizierung: noch nicht umgesetzt -->
    <UpcomingFeature
      icon="i-lucide-shield-check"
      title="Zwei-Faktor-Authentifizierung"
      description="Konto mit einem zweiten Faktor absichern."
    />

    <!-- Konto löschen -->
    <SettingsSection
      v-if="scheduledFor"
      title="Löschung läuft"
      description="Deine Buchungsseite ist offline. Du kannst die Löschung bis zum Stichtag zurücknehmen."
    >
      <UAlert
        icon="i-lucide-alert-triangle"
        color="warning"
        variant="soft"
        :title="`Endgültige Löschung am ${deletionDateLabel}`"
        description="Danach sind dein Konto, deine Klienten, alle Termine und deine Buchungsseite unwiderruflich gelöscht. Noch offene Termine werden dann abgesagt und deine Klienten benachrichtigt."
      />
      <UAlert
        v-if="revokeError"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="revokeError"
      />
      <div>
        <UButton
          icon="i-lucide-rotate-ccw"
          :loading="revokePending"
          label="Löschung zurücknehmen"
          @click="revokeDeletion"
        />
      </div>
    </SettingsSection>

    <SettingsSection
      v-else
      title="Konto löschen"
      description="Dauerhaft und mit allen Daten – nach einer Frist von 30 Tagen."
    >
      <div class="text-sm text-muted flex flex-col gap-2">
        <p>Gelöscht werden dein Konto und alles, was daran hängt:</p>
        <ul class="list-disc pl-5 flex flex-col gap-1">
          <li>alle Klientenprofile und Notizen</li>
          <li>alle Termine, auch vergangene</li>
          <li>Sitzungsangebote und Verfügbarkeiten</li>
          <li>Buchungsseite, Logo und deine Subdomain</li>
        </ul>
        <p>
          Deine Buchungsseite geht sofort offline, gelöscht wird aber erst 30 Tage später.
          Bis dahin kannst du dich normal anmelden und die Löschung zurücknehmen.
        </p>
      </div>
      <div>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          label="Konto löschen"
          @click="openConfirm"
        />
      </div>
    </SettingsSection>

    <UModal
      v-model:open="confirmOpen"
      title="Konto löschen"
      description="Bestätige mit deinem Passwort. Den genauen Stichtag nennen wir dir danach hier und per E-Mail."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="deleteError"
            icon="i-lucide-circle-x"
            color="error"
            variant="soft"
            :description="deleteError"
          />
          <UFormField label="Aktuelles Passwort">
            <UInput
              v-model="deletePassword"
              type="password"
              autocomplete="current-password"
              class="w-full"
              :ui="inputUi"
              @keydown.enter="requestDeletion"
            />
          </UFormField>
          <p class="text-sm text-muted">
            Wir schicken dir eine Bestätigung per E-Mail, dazu eine Erinnerung eine Woche vor
            dem Stichtag.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-3 justify-end w-full">
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="confirmOpen = false" />
          <UButton
            color="error"
            :loading="deletePending"
            :disabled="!deletePassword"
            label="Löschung beantragen"
            @click="requestDeletion"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
