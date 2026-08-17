<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const { $authClient } = useNuxtApp()
const route = useRoute()

// better-auth leitet hierher weiter und hängt entweder ?token= oder ?error=INVALID_TOKEN an.
const token = computed(() => (route.query.token as string | undefined) ?? null)
const linkError = computed(() => (route.query.error as string | undefined) ?? null)

const done = ref(false)
const errorMessage = ref<string | null>(null)
const pending = ref(false)

const schema = z.object({
  newPassword:    z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  repeatPassword: z.string().min(1, 'Bitte wiederhole das neue Passwort'),
}).refine(data => data.newPassword === data.repeatPassword, {
  message: 'Die Passwörter stimmen nicht überein',
  path: ['repeatPassword'],
})

type Schema = z.infer<typeof schema>

const form = reactive<Schema>({ newPassword: '', repeatPassword: '' })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!token.value) return
  errorMessage.value = null
  pending.value = true
  try {
    const { error } = await $authClient.resetPassword({
      newPassword: event.data.newPassword,
      token: token.value,
    })
    if (error) {
      errorMessage.value = mapAuthError(error, 'Das Passwort konnte nicht gesetzt werden.')
    } else {
      done.value = true
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <!-- Kein oder verbrauchter Token: der Link ist einmal verwendbar, ein zweiter Klick
         landet hier. Sackgasse vermeiden und direkt einen neuen anbieten. -->
    <div
      v-if="!token || linkError"
      class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7"
    >
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <UIcon name="i-lucide-link-2-off" class="size-12 text-warning" />
        <div>
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Link ungültig oder abgelaufen
          </h2>
          <p class="mt-1 text-sm text-(--ui-text-muted)">
            Der Link ist eine Stunde gültig und lässt sich nur einmal verwenden.
            Fordere einen neuen an.
          </p>
        </div>
        <NuxtLink to="/auth/forgot-password" class="text-sm text-primary font-medium hover:underline">
          Neuen Link anfordern
        </NuxtLink>
      </div>
    </div>

    <div
      v-else-if="done"
      class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7"
    >
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <UIcon name="i-lucide-check-circle" class="size-12 text-primary" />
        <div>
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Passwort gesetzt
          </h2>
          <p class="mt-1 text-sm text-(--ui-text-muted)">
            Du kannst dich jetzt mit deinem neuen Passwort anmelden.
          </p>
        </div>
        <NuxtLink to="/auth/login" class="text-sm text-primary font-medium hover:underline">
          Zur Anmeldung
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <UAlert
        v-if="errorMessage"
        icon="i-lucide-circle-x"
        color="error"
        variant="soft"
        :description="errorMessage"
      />
      <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-6 sm:p-7">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col items-center gap-2 text-center">
            <UIcon name="i-lucide-key-round" class="size-8 text-primary" />
            <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Neues Passwort setzen</h2>
            <p class="text-sm text-(--ui-text-muted)">Wähle ein Passwort mit mindestens 8 Zeichen.</p>
          </div>

          <UForm :schema="schema" :state="form" class="flex flex-col gap-4" @submit="onSubmit">
            <UFormField label="Neues Passwort" name="newPassword">
              <UInput
                v-model="form.newPassword"
                type="password"
                autocomplete="new-password"
                class="w-full"
                :ui="{ base: 'bg-white dark:bg-neutral-800' }"
              />
            </UFormField>
            <UFormField label="Passwort wiederholen" name="repeatPassword">
              <UInput
                v-model="form.repeatPassword"
                type="password"
                autocomplete="new-password"
                class="w-full"
                :ui="{ base: 'bg-white dark:bg-neutral-800' }"
              />
            </UFormField>
            <UButton type="submit" block :loading="pending" label="Passwort setzen" />
          </UForm>

          <p class="text-center text-sm text-(--ui-text-muted)">
            <NuxtLink to="/auth/login" class="text-primary font-medium hover:underline">
              Zurück zur Anmeldung
            </NuxtLink>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
