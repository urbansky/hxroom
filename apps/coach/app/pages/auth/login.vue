<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()
const route = useRoute()

const verified = computed(() => route.query.verified === 'true')
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
})

type Schema = z.infer<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = null
  pending.value = true
  try {
    const { error } = await $authClient.signIn.email({
      email: event.data.email,
      password: event.data.password,
    })
    if (error) {
      errorMessage.value = mapAuthError(error.message)
    } else {
      await navigateTo('/')
    }
  } finally {
    pending.value = false
  }
}

function mapAuthError(msg?: string): string {
  if (!msg) return 'Anmeldung fehlgeschlagen.'
  if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('verif')) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  }
  if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
    return 'E-Mail oder Passwort ist falsch.'
  }
  return 'Anmeldung fehlgeschlagen.'
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
      <UAlert
        v-if="verified"
        icon="i-lucide-check-circle"
        color="success"
        variant="soft"
        title="E-Mail bestätigt"
        description="Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst dich jetzt anmelden."
      />
      <UAlert
        v-if="errorMessage"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="errorMessage"
      />
      <UAuthForm
        title="Anmelden"
        description="Melde dich bei deinem HxRoom-Konto an"
        icon="i-lucide-lock"
        :fields="[
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
            placeholder: '••••••••',
            required: true,
            autocomplete: 'current-password',
          },
        ]"
        :schema="schema"
        :submit="{ label: 'Anmelden', loading: pending }"
        @submit="onSubmit"
      >
        <template #footer>
          <p class="text-center text-sm text-(--ui-text-muted)">
            Noch kein Konto?
            <NuxtLink to="/auth/register" class="text-primary font-medium hover:underline">
              Registrieren
            </NuxtLink>
          </p>
        </template>
      </UAuthForm>
  </div>
</template>
