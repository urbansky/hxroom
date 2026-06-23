<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

type NavItem = NavigationMenuItem & { description?: string }

const { session, signOut } = useAuth()
const route = useRoute()

const navItems: NavItem[][] = [
  [
    { type: 'label', label: 'Übersicht' },
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/', description: 'Nächste Termine und Systemstatus' },
  ],
  [
    { type: 'label', label: 'Buchungen' },
    { label: 'Kalender', icon: 'i-lucide-calendar', to: '/bookings', description: 'Alle gebuchten Termine im Überblick' },
    { label: 'Verfügbarkeit', icon: 'i-lucide-clock', to: '/bookings/availability', description: 'Buchbare Zeiten und Sitzungstypen' },
  ],
  [
    { type: 'label', label: 'Klienten' },
    { label: 'Klientenliste', icon: 'i-lucide-users', to: '/clients', description: 'Alle Klienten und deren Coaching-Verläufe' },
    { label: 'Notizen', icon: 'i-lucide-file-text', to: '/notes', description: 'Sitzungsnotizen und KI-Zusammenfassungen' },
  ],
  [
    { type: 'label', label: 'Finanzen' },
    { label: 'Umsatz', icon: 'i-lucide-circle-dollar-sign', to: '/finance/revenue', description: 'Monatliche Einnahmenübersicht' },
    { label: 'Rechnungen', icon: 'i-lucide-file', to: '/finance/invoices', description: 'Rechnungen verwalten und exportieren' },
  ],
  [
    { type: 'label', label: 'Einstellungen' },
    { label: 'Landingpage', icon: 'i-lucide-layout-template', to: '/settings/landingpage', description: 'Logo, Farbe und Profilseite' },
    { label: 'Warteraum', icon: 'i-lucide-door-open', to: '/settings/waiting-room', description: 'Digitalen Empfang für Klienten gestalten' },
    { label: 'Benachrichtigungen', icon: 'i-lucide-bell', to: '/settings/notifications', description: 'E-Mail-Einstellungen für Buchungen' },
    { label: 'Plan & Abrechnung', icon: 'i-lucide-credit-card', to: '/settings/billing', description: 'Abo und Zahlungsmethode verwalten' },
    { label: 'Datenschutz', icon: 'i-lucide-shield', to: '/settings/privacy', description: 'DSGVO und Datenverwaltung' },
  ],
]

const userMenuItems = computed(() => [
  [
    {
      label: 'Account',
      icon: 'i-lucide-user-round',
      to: '/settings/account',
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
    '/bookings': 'Kalender',
    '/bookings/availability': 'Verfügbarkeit',
    '/clients': 'Klientenliste',
    '/notes': 'Notizen',
    '/finance/revenue': 'Umsatz',
    '/finance/invoices': 'Rechnungen',
    '/settings/landingpage': 'Landingpage',
    '/settings/waiting-room': 'Warteraum',
    '/settings/notifications': 'Benachrichtigungen',
    '/settings/billing': 'Plan & Abrechnung',
    '/settings/privacy': 'Datenschutz',
    '/settings/account': 'Account',
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
          :tooltip="true"
          class="w-full"
        >
          <template #item-label="{ item }">
            <UTooltip
              v-if="(item as NavItem).description && !collapsed"
              :text="(item as NavItem).description"
              :content="{ side: 'right' }"
              :delay-duration="400"
            >
              <span>{{ item.label }}</span>
            </UTooltip>
            <span v-else>{{ item.label }}</span>
          </template>
        </UNavigationMenu>
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            :avatar="{ alt: session.data?.user?.name ?? '' }"
            :label="collapsed ? undefined : (session.data?.user?.name ?? '')"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            class="data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'text-dimmed' }"
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
