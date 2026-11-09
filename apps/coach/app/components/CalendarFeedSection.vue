<script setup lang="ts">
import type { CalendarFeedResponse } from '@hxroom/shared'

/**
 * Kalender-Abo des Coachs (doc/produkt/funktionen/kalenderabgleich.md §4): eine private Adresse,
 * die alle Termine aus HxRoom als Kalender liefert. Sie entsteht erst auf Knopfdruck; „Abo
 * beenden“ und „Adresse erneuern“ machen die bisherige Adresse sofort unbrauchbar.
 */
const { $api } = useApi()
const { public: { apiUrl } } = useRuntimeConfig()
const toast = useToast()

const feed = ref<CalendarFeedResponse | null>(null)
const busy = ref(false)
const confirming = ref<'regenerate' | 'disable' | null>(null)

try {
  feed.value = await $api<CalendarFeedResponse>('/calendar-feed')
} catch {
  feed.value = null
}

// Die Adresse entsteht aus der API-Adresse der App – so stimmt sie lokal wie in Produktion.
const feedUrl = computed(() => {
  if (!feed.value?.token) return null
  const base = new URL(apiUrl, import.meta.client ? window.location.origin : 'http://localhost')
  return `${base.toString().replace(/\/$/, '')}/calendar-feed.ics?token=${feed.value.token}`
})
const webcalUrl = computed(() => feedUrl.value?.replace(/^https?:/, 'webcal:') ?? null)
const googleSubscribeUrl = computed(() =>
  webcalUrl.value ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl.value)}` : null,
)

async function run(action: () => Promise<CalendarFeedResponse>, errorTitle: string) {
  busy.value = true
  try {
    feed.value = await action()
  } catch {
    toast.add({ title: errorTitle, description: 'Bitte versuche es gleich noch einmal.', color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    busy.value = false
    confirming.value = null
  }
}

const enable = () => run(() => $api('/calendar-feed', { method: 'POST' }), 'Das Abo konnte nicht eingerichtet werden')
const regenerate = () => run(() => $api('/calendar-feed/regenerate', { method: 'POST' }), 'Die Adresse konnte nicht erneuert werden')
const disable = () => run(() => $api('/calendar-feed', { method: 'DELETE' }), 'Das Abo konnte nicht beendet werden')
const setHideNames = (hideClientNames: boolean) =>
  run(() => $api('/calendar-feed', { method: 'PATCH', body: { hideClientNames } }), 'Die Einstellung konnte nicht gespeichert werden')

async function copy() {
  if (!feedUrl.value) return
  try {
    await navigator.clipboard.writeText(feedUrl.value)
    toast.add({ title: 'Adresse kopiert', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: 'Markiere die Adresse und kopiere sie von Hand.', color: 'error', icon: 'i-lucide-circle-x' })
  }
}
</script>

<template>
  <SettingsSection
    title="Termine in deinem Kalender"
    description="Abonniere deine HxRoom-Termine in Google, Apple oder Outlook. Neue Termine erscheinen dort von selbst, abgesagte verschwinden wieder."
  >
    <p v-if="!feed" class="text-sm text-error">Die Einstellungen konnten nicht geladen werden.</p>

    <div v-else-if="!feed.token" class="flex flex-col items-start gap-3">
      <p class="text-sm text-muted">
        Du bekommst eine private Adresse, die nur du kennst. Im Kalender stehen Zeit, Angebot und – wenn du willst – der Name des Klienten, dazu ein Link auf den Termin in HxRoom. Kontaktdaten und Nachrichten deiner Klienten bleiben in HxRoom.
      </p>
      <UButton label="Kalender-Abo einrichten" icon="i-lucide-calendar-plus" color="primary" :loading="busy" @click="enable()" />
    </div>

    <template v-else>
      <UFormField label="Deine Abo-Adresse" description="Privat – wer sie kennt, sieht deine Termine.">
        <div class="flex gap-2">
          <UInput :model-value="feedUrl ?? ''" readonly class="flex-1 font-mono" :ui="{ base: 'text-xs' }" @focus="($event.target as HTMLInputElement).select()" />
          <UButton icon="i-lucide-copy" color="neutral" variant="outline" aria-label="Adresse kopieren" @click="copy()" />
        </div>
      </UFormField>

      <div class="flex flex-wrap gap-2">
        <UButton :href="webcalUrl ?? undefined" label="In Apple Kalender abonnieren" icon="i-lucide-calendar" color="neutral" variant="outline" size="sm" />
        <UButton :href="googleSubscribeUrl ?? undefined" target="_blank" label="In Google Kalender abonnieren" icon="i-lucide-calendar" color="neutral" variant="outline" size="sm" />
      </div>

      <div class="text-sm text-muted flex flex-col gap-2">
        <p><span class="font-medium text-highlighted">Outlook:</span> Im Kalender „Kalender hinzufügen“ → „Aus dem Internet abonnieren“ und die Adresse einfügen.</p>
        <p>
          Wie schnell neue Termine erscheinen, bestimmt dein Kalender: In Apple Kalender wählst du beim Abonnieren „Alle 5 Minuten“. Outlook im Web lädt etwa alle drei bis vier Stunden neu, Google teils nur einmal am Tag. Von neuen Buchungen erfährst du deshalb weiterhin sofort per Mail – mit einem Link, um den Termin gleich einzutragen.
        </p>
      </div>

      <USwitch
        :model-value="feed.hideClientNames"
        :disabled="busy"
        label="Ohne Klientennamen"
        description="Im Kalender steht nur das Angebot. Gilt auch für die Kalenderdatei in der Buchungs-Mail und auf der Terminseite."
        @update:model-value="setHideNames($event)"
      />

      <div v-if="confirming" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default p-3">
        <span class="text-sm text-muted">
          {{ confirming === 'regenerate'
            ? 'Die bisherige Adresse funktioniert danach nicht mehr. Du musst das Abo mit der neuen Adresse neu einrichten.'
            : 'Die Adresse funktioniert danach nicht mehr, und die Termine verschwinden aus deinem Kalender.' }}
        </span>
        <div class="flex items-center gap-2">
          <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirming = null" />
          <UButton
            :label="confirming === 'regenerate' ? 'Adresse erneuern' : 'Abo beenden'"
            color="error"
            size="sm"
            :loading="busy"
            @click="confirming === 'regenerate' ? regenerate() : disable()"
          />
        </div>
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <UButton label="Adresse erneuern" icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" @click="confirming = 'regenerate'" />
        <UButton label="Abo beenden" icon="i-lucide-calendar-x" color="error" variant="ghost" size="sm" @click="confirming = 'disable'" />
      </div>
    </template>
  </SettingsSection>
</template>
