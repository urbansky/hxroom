<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()

const sent = ref(false)
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

type Schema = z.infer<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = null
  pending.value = true
  try {
    const { error } = await $authClient.requestPasswordReset({
      email: event.data.email,
      // Die API leitet den Link auf diese Seite um und hängt ?token= bzw. ?error= an.
      // Der Origin muss serverseitig in CORS_ORIGINS stehen, sonst lehnt better-auth ihn ab.
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      errorMessage.value = mapAuthError(error, 'Die E-Mail konnte nicht gesendet werden.')
    } else {
      // Bewusst dieselbe Bestätigung, ob die Adresse existiert oder nicht: die Seite ist
      // öffentlich und darf nicht verraten, wer bei HxRoom ein Konto hat.
      sent.value = true
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <template v-if="!sent">
      <UAlert
        v-if="errorMessage"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="errorMessage"
      />
      <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7">
        <UAuthForm
          title="Passwort vergessen"
          description="Wir senden dir einen Link, mit dem du ein neues Passwort setzen kannst."
          icon="i-lucide-key-round"
          :fields="[
            {
              name: 'email',
              type: 'email',
              label: 'E-Mail-Adresse',
              placeholder: 'coach@example.de',
              required: true,
              autocomplete: 'email',
            },
          ]"
          :schema="schema"
          :submit="{ label: 'Link senden', loading: pending }"
          @submit="onSubmit"
        >
          <template #footer>
            <p class="text-center text-sm text-(--ui-text-muted)">
              <NuxtLink to="/auth/login" class="text-primary font-medium hover:underline">
                Zurück zur Anmeldung
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
            E-Mail unterwegs
          </h2>
          <p class="mt-1 text-sm text-(--ui-text-muted)">
            Falls ein Konto mit dieser Adresse existiert, haben wir dir einen Link geschickt.<br>
            Er ist eine Stunde gültig.
          </p>
        </div>
        <NuxtLink to="/auth/login" class="text-sm text-primary font-medium hover:underline">
          Zurück zur Anmeldung
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
