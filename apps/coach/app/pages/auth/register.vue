<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const landingUrl = `${rootDomainHttps ? 'https' : 'http'}://${rootDomain}`

const registered = ref(false)
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  // AGB §1: HxRoom ist nur für Unternehmer. Die API prüft dasselbe noch einmal
  // (hooks.before in auth.module.ts).
  acceptTerms: z.boolean().optional().refine(v => v === true, 'Bitte stimme den AGB und dem AVV zu.'),
})

type Schema = z.infer<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = null
  pending.value = true
  try {
    // `acceptTerms` kennt der better-auth-Client nicht; geprüft wird es von hooks.before in
    // apps/api/src/auth/auth.module.ts. Als Variable übergeben, damit TypeScript das
    // zusätzliche Feld durchlässt.
    const body = {
      name: event.data.name,
      email: event.data.email,
      password: event.data.password,
      acceptTerms: true,
      callbackURL: `${window.location.origin}/auth/login?verified=true`,
    }
    const { error } = await $authClient.signUp.email(body)
    if (error) {
      errorMessage.value = mapAuthError(error, 'Registrierung fehlgeschlagen.')
    } else {
      registered.value = true
    }
  } finally {
    pending.value = false
  }
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
        <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7">
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
              {
                name: 'acceptTerms',
                type: 'checkbox',
                required: true,
              },
            ]"
            :schema="schema"
            :submit="{ label: 'Konto erstellen', loading: pending }"
            @submit="onSubmit"
          >
            <template #acceptTerms-field="{ state }">
              <UCheckbox v-model="state.acceptTerms" :ui="{ label: 'font-normal text-muted' }">
                <template #label>
                  Ich nutze HxRoom für meine selbständige berufliche Tätigkeit und stimme den
                  <ULink :to="`${landingUrl}/agb`" target="_blank" class="text-primary underline underline-offset-2">AGB</ULink>
                  und dem
                  <ULink :to="`${landingUrl}/avv`" target="_blank" class="text-primary underline underline-offset-2">Auftragsverarbeitungsvertrag</ULink>
                  zu.
                </template>
              </UCheckbox>
            </template>
            <template #footer>
              <p class="text-center text-sm text-(--ui-text-muted)">
                Bereits registriert?
                <NuxtLink to="/auth/login" class="text-primary font-medium hover:underline">
                  Anmelden
                </NuxtLink>
              </p>
            </template>
          </UAuthForm>
        </div>
      </template>

      <div v-else class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7">
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
      </div>
  </div>
</template>
