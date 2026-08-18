<script setup lang="ts">
const props = defineProps<{ bookingPageUrl: string | null }>()
const emit = defineEmits<{ createClient: [] }>()

const toast = useToast()

async function copyBookingLink() {
  if (!props.bookingPageUrl) return
  try {
    // navigator.clipboard gibt es nur in sicheren Kontexten (https oder localhost) –
    // im Fehlerfall bleibt der Link über "Buchungsseite öffnen" erreichbar.
    await navigator.clipboard.writeText(props.bookingPageUrl)
    toast.add({ title: 'Buchungslink kopiert', description: props.bookingPageUrl, color: 'success', icon: 'i-lucide-check' })
  } catch {
    toast.add({ title: 'Kopieren nicht möglich', description: props.bookingPageUrl, color: 'error', icon: 'i-lucide-clipboard-x' })
  }
}

const linkClasses = 'w-full text-left flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg transition-colors hover:bg-muted cursor-pointer'
</script>

<template>
  <SettingsSection title="Schnellzugriff">
    <div class="flex flex-col gap-1 -my-2">
      <button v-if="bookingPageUrl" type="button" :class="linkClasses" @click="copyBookingLink">
        <UIcon name="i-lucide-link" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Buchungslink kopieren</span>
      </button>

      <a v-if="bookingPageUrl" :href="bookingPageUrl" target="_blank" rel="noopener" :class="linkClasses">
        <UIcon name="i-lucide-external-link" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Buchungsseite öffnen</span>
      </a>

      <NuxtLink v-else to="/settings/bookingpage" :class="linkClasses">
        <UIcon name="i-lucide-layout-template" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Buchungsseite einrichten</span>
      </NuxtLink>

      <button type="button" :class="linkClasses" @click="emit('createClient')">
        <UIcon name="i-lucide-user-round-plus" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Klient anlegen</span>
      </button>

      <NuxtLink to="/bookings/offers" :class="linkClasses">
        <UIcon name="i-lucide-layers" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Angebot anlegen</span>
      </NuxtLink>

      <NuxtLink to="/bookings/availability" :class="linkClasses">
        <UIcon name="i-lucide-clock" class="size-4 text-muted shrink-0" />
        <span class="text-sm text-highlighted">Verfügbarkeit bearbeiten</span>
      </NuxtLink>
    </div>
  </SettingsSection>
</template>
