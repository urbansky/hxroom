<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { Logo } from '@hxroom/ui'

type NavItem = NavigationMenuItem & { description?: string }

const { session, signOut } = useAuth()

// Gliederung nach doc/funktionen/backoffice-betreiber.md, vorerst nur die MVP-Bereiche.
// Labels deutsch, Routen englisch (CLAUDE.md).
const navItems: NavItem[][] = [
  [
    { type: 'label', label: 'Übersicht' },
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/', description: 'Plattform-Kennzahlen auf einen Blick' },
  ],
  [
    { type: 'label', label: 'Kunden' },
    { label: 'Coachs', icon: 'i-lucide-users', to: '/coaches', description: 'Alle registrierten Coachs verwalten' },
    { label: 'Subscriptions', icon: 'i-lucide-credit-card', to: '/subscriptions', description: 'Abos, Pläne und Kündigungen' },
  ],
  [
    { type: 'label', label: 'Auswertung' },
    { label: 'Umsatz', icon: 'i-lucide-circle-dollar-sign', to: '/revenue', description: 'MRR, ARR und Zahlungsausfälle' },
    { label: 'Metriken', icon: 'i-lucide-chart-line', to: '/metrics', description: 'Nutzung und Conversion der Plattform' },
  ],
  [
    { type: 'label', label: 'Betrieb' },
    { label: 'Domains', icon: 'i-lucide-globe', to: '/domains', description: 'Subdomains, Slugs und Custom-Domains' },
  ],
]

// Vorerst nur Abmelden: ein Betreiber hat weder Organisation noch Profilseite, alles
// Weitere wäre ein Platzhalter.
const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Abmelden',
      icon: 'i-lucide-log-out',
      onSelect: signOut,
    },
  ],
])
</script>

<template>
  <UDashboardGroup storage-key="admin-sidebar" unit="px">
    <UDashboardSidebar collapsible resizable :default-size="220" :min-size="160" :max-size="360" class="admin-sidebar" :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <Logo :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          orientation="vertical"
          :items="navItems"
          :tooltip="true"
          :ui="{ separator: 'h-0.5 bg-transparent' }"
          class="w-full sidebar-nav"
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
            :avatar="{ alt: session.data?.user?.name ?? '', size: 'md' }"
            :label="collapsed ? undefined : (session.data?.user?.name ?? '')"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            class="data-[state=open]:bg-elevated"
            :ui="{ base: 'text-highlighted', trailingIcon: 'text-dimmed' }"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #body>
        <!-- Breitenbegrenzung zentral statt pro Seite: deutlich breiter als die Coach-App
             (max-w-3xl), weil hier Tabellen mit sechs Spalten stehen, aber begrenzt, damit
             Überschriften auf großen Monitoren nicht auseinanderlaufen. Die Polsterung
             kommt vom Panel-Body des Themes – Seiten setzen deshalb selbst keine. -->
        <div class="mx-auto w-full max-w-7xl">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
