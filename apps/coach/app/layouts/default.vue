<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { Logo } from '@hxroom/ui'
import type { AccountDeletionStatus, TermsStatus } from '@hxroom/shared'

type NavItem = NavigationMenuItem & { description?: string }

const { session, signOut } = useAuth()
const route = useRoute()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const { $api } = useApi()

// Beta: Rückmeldung von jeder Seite aus (phase5-umsetzungsplan.md, 7a). Ein eigenes Menü am
// unteren Rand, damit der Punkt wie ein Menüeintrag aussieht und nicht zum Konto gehört.
const feedbackOpen = ref(false)
const feedbackNavItems: NavigationMenuItem[] = [
  {
    // Kurz, damit das Abzeichen auch bei schmaler Seitenleiste daneben passt.
    label: 'Feedback',
    icon: 'i-lucide-message-square-heart',
    badge: { label: 'Beta', color: 'primary', variant: 'subtle', size: 'sm' },
    onSelect: () => { feedbackOpen.value = true },
  },
]

const landingUrl = computed(() => `${rootDomainHttps ? 'https' : 'http'}://${rootDomain}`)

const baseNavItems: NavItem[][] = [
  [
    { type: 'label', label: 'Übersicht' },
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/', description: 'Nächste Termine und Kennzahlen' },
  ],
  [
    { type: 'label', label: 'Buchungen' },
    { label: 'Kalender', icon: 'i-lucide-calendar', to: '/bookings', description: 'Alle gebuchten Termine im Überblick' },
    { label: 'Sitzungsangebote', icon: 'i-lucide-layers', to: '/bookings/offers', description: 'Buchbare Angebote mit Name, Dauer und Preis' },
    { label: 'Verfügbarkeit', icon: 'i-lucide-clock', to: '/bookings/availability', description: 'Buchbare Zeiten für deine Angebote' },
    { label: 'Buchungsseite', icon: 'i-lucide-layout-template', to: '/settings/bookingpage', description: 'Logo, Farbe und Profilseite' },
  ],
  [
    { type: 'label', label: 'Klienten' },
    { label: 'Klientenliste', icon: 'i-lucide-users', to: '/clients', description: 'Alle Klienten und deren Coaching-Verläufe' },
  ],
  [
    { type: 'label', label: 'Finanzen' },
    { label: 'Umsatz', icon: 'i-lucide-circle-dollar-sign', to: '/finance/revenue', description: 'Monatliche Einnahmenübersicht' },
    { label: 'Rechnungen', icon: 'i-lucide-file', to: '/finance/invoices', description: 'Rechnungen verwalten und exportieren' },
  ],
  [
    { type: 'label', label: 'Einstellungen' },
    { label: 'Warteraum', icon: 'i-lucide-door-open', to: '/settings/waiting-room', description: 'Digitalen Empfang für Klienten gestalten' },
    { label: 'Benachrichtigungen', icon: 'i-lucide-bell', to: '/settings/notifications', description: 'E-Mail-Einstellungen für Buchungen' },
    { label: 'Plan & Abrechnung', icon: 'i-lucide-credit-card', to: '/settings/billing', description: 'Abo und Zahlungsmethode verwalten' },
    { label: 'Rechtliches', icon: 'i-lucide-scale', to: '/settings/legal', description: 'Impressum und Datenschutz deiner Buchungsseite' },
  ],
]

// Beta (utils/beta.ts): Menüpunkte ohne Funktion fallen heraus; eine Gruppe, in der nur noch
// ihre Überschrift stünde, verschwindet ganz.
const visibleNavItems: NavItem[][] = baseNavItems
  .map(group => group.filter(item => typeof item.to !== 'string' || !isBetaHidden(item.to)))
  .filter(group => group.some(item => item.type !== 'label'))

// Ein Menüpunkt bleibt auch auf seinen Unterseiten markiert (Klientenliste auf
// /clients/:id). Von sich aus markiert ULink nur exakte Treffer, weil die Detailseiten
// keine verschachtelten Routen sind. Es gewinnt der längste passende Pfad – sonst stünde
// „Kalender“ (/bookings) auf /bookings/offers neben „Sitzungsangebote“.
const activeNavPath = computed(() => {
  const paths = visibleNavItems.flat().map(item => item.to).filter((to): to is string => typeof to === 'string')
  return paths
    .filter(to => route.path === to || (to !== '/' && route.path.startsWith(`${to}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? null
})

const navItems = computed<NavItem[][]>(() =>
  visibleNavItems.map(group => group.map(item =>
    typeof item.to === 'string' ? { ...item, active: item.to === activeNavPath.value } : item,
  )),
)

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Account',
      icon: 'i-lucide-user-round',
      to: '/settings/account',
    },
  ],
  [
    {
      label: 'Über',
      icon: 'i-lucide-info',
      children: [
        {
          label: 'HxRoom-Website',
          icon: 'i-lucide-globe',
          to: landingUrl.value,
          target: '_blank',
        },
        {
          label: 'Impressum',
          icon: 'i-lucide-file-text',
          to: `${landingUrl.value}/impressum`,
          target: '_blank',
        },
        {
          label: 'Datenschutz',
          icon: 'i-lucide-shield',
          to: `${landingUrl.value}/datenschutz`,
          target: '_blank',
        },
      ],
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

// Läuft eine Kontolöschung, muss der Coach sie in jeder Ansicht sehen und zurücknehmen können.
// Ohne diesen Hinweis wäre die 30-Tage-Frist eine Falle: wer den Antrag stellt und vergisst,
// hätte keinen Anlass mehr, sich vor dem Datenverlust neu zu entscheiden.
const { data: deletion } = await useFetch<AccountDeletionStatus>('/account/deletion', {
  $fetch: $api,
  // Fehler hier dürfen das Backoffice nicht blockieren – ohne Banner ist es nur weniger
  // auskunftsfreudig, die Account-Seite zeigt den Zustand ohnehin.
  default: () => ({ scheduledFor: null }),
})

// AGB und AVV (phase5-umsetzungsplan.md, 5a): Wer noch keiner Fassung zugestimmt hat, holt das
// hier nach, bevor er weiterarbeitet. In einer vom Betreiber übernommenen Sitzung nur ein
// Hinweis – zustimmen kann nur der Coach selbst. Ein Fehler beim Laden sperrt niemanden aus.
const { data: terms, refresh: refreshTerms } = await useFetch<TermsStatus | null>('/account/terms', {
  $fetch: $api,
  key: 'terms-status',
  default: () => null,
})
const termsMissing = computed(() => !!terms.value && terms.value.acceptedVersion === null)

const deletionDateLabel = computed(() => {
  const scheduledFor = deletion.value?.scheduledFor
  if (!scheduledFor) return null
  return new Date(scheduledFor).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/bookings': 'Kalender',
    '/bookings/offers': 'Sitzungsangebote',
    '/bookings/availability': 'Verfügbarkeit',
    '/clients': 'Klientenliste',
    '/finance/revenue': 'Umsatz',
    '/finance/invoices': 'Rechnungen',
    '/settings/bookingpage': 'Buchungsseite',
    '/settings/waiting-room': 'Warteraum',
    '/settings/notifications': 'Benachrichtigungen',
    '/settings/billing': 'Plan & Abrechnung',
    '/settings/legal': 'Rechtliches',
    '/settings/account': 'Account',
  }
  // Die Map trifft nur exakte Pfade – dynamische Routen brauchen einen eigenen Zweig. Sie geht
  // vor, sonst wären /bookings/offers und /bookings/availability eine Terminseite.
  if (titles[route.path]) return titles[route.path]
  if (route.path.startsWith('/clients/')) return 'Klient'
  if (route.path.startsWith('/bookings/')) return 'Termin'
  return 'HxRoom'
})
</script>

<template>
  <UDashboardGroup storage-key="coach-sidebar" unit="px">
    <UDashboardSidebar collapsible resizable :default-size="220" :min-size="160" :max-size="360" class="coach-sidebar" :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }">
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

        <UNavigationMenu
          :collapsed="collapsed"
          orientation="vertical"
          :items="feedbackNavItems"
          :tooltip="true"
          class="w-full sidebar-nav mt-auto"
        />
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
        <FeedbackModal v-model:open="feedbackOpen" />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <!-- Nur auf Handy und Tablet (phase5-umsetzungsplan.md, Schritt 11): Dort ist die
           Seitenleiste ausgeblendet, und erst der Menüknopf der Kopfleiste öffnet sie als
           Slideover. Auf dem Rechner tragen die Seiten ihre Überschrift selbst. -->
      <template #header>
        <UDashboardNavbar :title="pageTitle" class="lg:hidden" />
      </template>

      <template #body>
        <UAlert
          v-if="deletionDateLabel"
          icon="i-lucide-alert-triangle"
          color="warning"
          variant="soft"
          class="mb-4 shrink-0"
          :title="`Dein Konto wird am ${deletionDateLabel} gelöscht`"
          description="Deine Buchungsseite ist offline. Bis zum Stichtag kannst du die Löschung zurücknehmen."
          :actions="[{ label: 'Löschung zurücknehmen', color: 'warning', variant: 'outline', to: '/settings/account' }]"
        />
        <UAlert
          v-if="termsMissing && terms?.impersonated"
          icon="i-lucide-scale"
          color="info"
          variant="soft"
          class="mb-4 shrink-0"
          title="Dieser Coach hat AGB und AVV noch nicht angenommen"
          description="Die Frage erscheint beim nächsten eigenen Anmelden des Coachs."
        />
        <TermsAcceptanceModal :open="termsMissing && !terms?.impersonated" @accepted="refreshTerms()" />
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
