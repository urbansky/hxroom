<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()

const registered = ref(false)
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
})

type Schema = z.infer<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = null
  pending.value = true
  try {
    const { error } = await $authClient.signUp.email({
      name: event.data.name,
      email: event.data.email,
      password: event.data.password,
      callbackURL: `${window.location.origin}/auth/login?verified=true`,
    })
    if (error) {
      errorMessage.value = mapAuthError(error.message)
    } else {
      registered.value = true
    }
  } finally {
    pending.value = false
  }
}

function mapAuthError(msg?: string): string {
  if (!msg) return 'Registrierung fehlgeschlagen.'
  if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('email')) {
    return 'Diese E-Mail-Adresse ist bereits registriert.'
  }
  return 'Registrierung fehlgeschlagen.'
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
      <template v-if="!registered">
        <UAlert
          v-if="errorMessage"
          icon="i-lucide-circle-x"
          color="error"
          variant="soft"
          :description="errorMessage"
        />
        <UAuthForm
          title="Konto erstellen"
          description="Starte dein kostenloses HxRoom-Konto"
          icon="i-lucide-user-round-plus"
          :fields="[
            {
              name: 'name',
              type: 'text',
              label: 'Name',
              placeholder: 'Max Mustermann',
              required: true,
              autocomplete: 'name',
            },
            {
              name: 'email',
              type: 'email',
              label: 'E-Mail-Adresse',
              placeholder: 'coach@example.de',
              required: true,
              autocomplete: 'email',
            },
            {
              name: 'password',
              type: 'password',
              label: 'Passwort',
              placeholder: 'Mindestens 8 Zeichen',
              required: true,
              autocomplete: 'new-password',
            },
          ]"
          :schema="schema"
          :submit="{ label: 'Konto erstellen', loading: pending }"
          @submit="onSubmit"
        >
          <template #footer>
            <p class="text-center text-sm text-(--ui-text-muted)">
              Bereits registriert?
              <NuxtLink to="/auth/login" class="text-primary font-medium hover:underline">
                Anmelden
              </NuxtLink>
            </p>
          </template>
        </UAuthForm>
      </template>

      <UCard v-else>
        <div class="flex flex-col items-center gap-4 py-4 text-center">
          <UIcon name="i-lucide-mail-check" class="size-12 text-primary" />
          <div>
            <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
              E-Mail bestätigen
            </h2>
            <p class="mt-1 text-sm text-(--ui-text-muted)">
              Wir haben dir eine Bestätigungsmail gesendet.<br>
              Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
            </p>
          </div>
          <NuxtLink to="/auth/login" class="text-sm text-primary font-medium hover:underline">
            Zurück zur Anmeldung
          </NuxtLink>
        </div>
      </UCard>
  </div>
</template>
