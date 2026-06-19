<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { session, signOut } = useAuth()
const route = useRoute()

const navItems: NavigationMenuItem[][] = [
  [
    { type: 'label', label: 'Übersicht' },
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Kalender', icon: 'i-lucide-calendar', to: '/buchungen' },
  ],
  [
    { type: 'label', label: 'Klienten' },
    { label: 'Klientenliste', icon: 'i-lucide-users', to: '/klienten' },
    { label: 'Notizen', icon: 'i-lucide-file-text', to: '/notizen' },
  ],
  [
    { type: 'label', label: 'Finanzen' },
    { label: 'Umsatz', icon: 'i-lucide-circle-dollar-sign', to: '/finanzen/umsatz' },
    { label: 'Rechnungen', icon: 'i-lucide-file', to: '/finanzen/rechnungen' },
  ],
  [
    { type: 'label', label: 'Einstellungen' },
    { label: 'Branding', icon: 'i-lucide-sun', to: '/einstellungen/branding' },
    { label: 'Datenschutz', icon: 'i-lucide-shield', to: '/einstellungen/datenschutz' },
  ],
]

const userMenuItems = computed(() => [
  [
    {
      label: 'Mein Profil',
      icon: 'i-lucide-user-round',
      to: '/einstellungen/branding',
    },
  ],
  [
    {
      label: 'Abmelden',
      icon: 'i-lucide-log-out',
      onSelect: signOut,
    },
  ],
])

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/buchungen': 'Kalender',
    '/klienten': 'Klientenliste',
    '/notizen': 'Notizen',
    '/finanzen/umsatz': 'Umsatz',
    '/finanzen/rechnungen': 'Rechnungen',
    '/einstellungen/branding': 'Branding',
    '/einstellungen/datenschutz': 'Datenschutz',
  }
  return titles[route.path] ?? 'HxRoom'
})
</script>

<template>
  <UDashboardGroup storage-key="coach-sidebar" unit="px">
    <UDashboardSidebar collapsible resizable :default-size="220" :min-size="160" :max-size="360">
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2 py-1 overflow-hidden">
          <UIcon name="i-lucide-video" class="size-6 text-primary shrink-0" />
          <span v-if="!collapsed" class="font-serif text-xl text-(--ui-text-highlighted) truncate">
            Hx<span class="text-primary">Room</span>
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          orientation="vertical"
          :items="navItems"
          class="w-full"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu :items="userMenuItems" class="w-full">
          <UButton
            color="neutral"
            variant="ghost"
            class="w-full"
            :avatar="{ alt: session.data?.user?.name ?? '' }"
            :label="collapsed ? undefined : (session.data?.user?.name ?? '')"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #right>
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
