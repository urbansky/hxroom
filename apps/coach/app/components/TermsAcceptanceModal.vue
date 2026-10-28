<script setup lang="ts">
import { TERMS_VERSION } from '@hxroom/shared'

/**
 * Zustimmung zu AGB und AVV für Konten, die sie bei der Registrierung nicht gegeben haben –
 * ältere Konten und vom Betreiber angelegte (phase5-umsetzungsplan.md, 5a). Lässt sich nicht
 * schließen: Ohne Vertrag arbeitet niemand mit echten Klienten. Abmelden bleibt möglich.
 * Hier bleibt die Checkbox, weil es keinen Knopf „Konto erstellen“ gibt, der die Zustimmung
 * trägt. Die Bestätigung als Unternehmer (§ 14 BGB) gehört wie bei der Registrierung nicht
 * hierher, sondern zum Abo-Abschluss.
 */
const { open } = defineProps<{ open: boolean }>()
const emit = defineEmits<{ accepted: [] }>()

const { $api } = useApi()
const { signOut } = useAuth()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const landingUrl = `${rootDomainHttps ? 'https' : 'http'}://${rootDomain}`

const accepted = ref(false)
const pending = ref(false)
const errorMessage = ref<string | null>(null)

async function onAccept() {
  if (!accepted.value) return
  pending.value = true
  errorMessage.value = null
  try {
    await $api('/account/terms', { method: 'POST', body: { version: TERMS_VERSION } })
    emit('accepted')
  } catch {
    errorMessage.value = 'Die Zustimmung konnte nicht gespeichert werden. Bitte versuch es noch einmal.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :close="false"
    title="AGB und Auftragsverarbeitungsvertrag"
    description="HxRoom richtet sich an Selbständige. Bevor du weiterarbeitest, brauchen wir deine Zustimmung zu beiden Verträgen."
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />
        <UCheckbox v-model="accepted" :ui="{ label: 'font-normal text-muted' }">
          <template #label>
            Ich stimme den
            <ULink :to="`${landingUrl}/agb`" target="_blank" class="text-primary underline underline-offset-2">AGB</ULink>
            und dem
            <ULink :to="`${landingUrl}/avv`" target="_blank" class="text-primary underline underline-offset-2">Auftragsverarbeitungsvertrag</ULink>
            zu.
          </template>
        </UCheckbox>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <UButton color="neutral" variant="ghost" label="Abmelden" @click="signOut" />
        <UButton label="Annehmen" :disabled="!accepted" :loading="pending" @click="onAccept" />
      </div>
    </template>
  </UModal>
</template>
