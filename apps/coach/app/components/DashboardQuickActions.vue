<script setup lang="ts">
defineProps<{ bookingPageUrl: string | null }>()
const emit = defineEmits<{ createClient: [] }>()

const { copyBookingLink } = useBookingLink()

const linkClasses = 'w-full text-left flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg transition-colors hover:bg-muted cursor-pointer'
</script>

<template>
  <SettingsSection title="Schnellzugriff">
    <div class="flex flex-col gap-1 -my-2">
      <button v-if="bookingPageUrl" type="button" :class="linkClasses" @click="copyBookingLink(bookingPageUrl)">
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
