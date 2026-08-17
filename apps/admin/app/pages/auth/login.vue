<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { ADMIN_ROLE } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()
const route = useRoute()

// Setzt die globale Middleware, wenn sie eine Session ohne Betreiber-Rolle abgewiesen hat.
const forbidden = computed(() => route.query.forbidden === '1')
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const NOT_AN_OPERATOR = 'Dieser Zugang ist dem Betreiber vorbehalten. Coachs melden sich unter app.hxroom.de an.'

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
      return
    }

    // signIn liefert die Rolle nicht zuverlässig mit – deshalb die Session frisch ziehen.
    // Ein Coach mit korrekten Zugangsdaten wird hier abgewiesen und wieder abgemeldet,
    // statt in eine Redirect-Schleife der Middleware zu laufen. Das signOut betrifft nur
    // die Session auf dem Admin-API-Host; eine laufende Coach-Session bleibt bestehen.
    const { data: current } = await $authClient.getSession({ query: { disableCookieCache: true } })
    if (current?.user?.role !== ADMIN_ROLE) {
      await $authClient.signOut()
      errorMessage.value = NOT_AN_OPERATOR
      return
    }

    await navigateTo('/')
  } finally {
    pending.value = false
  }
}

function mapAuthError(msg?: string): string {
  if (!msg) return 'Anmeldung fehlgeschlagen.'
  const lower = msg.toLowerCase()
  if (lower.includes('banned')) return 'Dieser Account ist gesperrt.'
  if (lower.includes('invalid') || lower.includes('credentials')) return 'E-Mail oder Passwort ist falsch.'
  return 'Anmeldung fehlgeschlagen.'
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <UAlert
      v-if="forbidden && !errorMessage"
      icon="i-lucide-shield-alert"
      color="error"
      variant="soft"
      :description="NOT_AN_OPERATOR"
    />
    <UAlert
      v-if="errorMessage"
      icon="i-lucide-circle-x"
      color="error"
      variant="soft"
      :description="errorMessage"
    />
    <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7">
      <UAuthForm
        title="Betreiber-Login"
        description="Zugang zum HxRoom-Backoffice"
        icon="i-lucide-lock"
        :fields="[
          { name: 'email', type: 'email', label: 'E-Mail-Adresse', placeholder: 'betreiber@example.com',
            required: true, autocomplete: 'email' },
          { name: 'password', type: 'password', label: 'Passwort', placeholder: '••••••••',
            required: true, autocomplete: 'current-password' },
        ]"
        :schema="schema"
        :submit="{ label: 'Anmelden', loading: pending }"
        @submit="onSubmit"
      />
    </div>
  </div>
</template>
