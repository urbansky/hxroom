<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const subdomain = ref('anna-bergmann')
const previewUrl = computed(() => `${rootDomainHttps ? 'https' : 'http'}://${subdomain.value}.${rootDomain}`)
const profileName = ref('Anna Bergmann')
const tagline = ref('Business- & Life-Coach · Ich begleite dich auf dem Weg zu mehr Klarheit, Fokus und innerer Stärke.')
const bio = ref('Mit über 10 Jahren Erfahrung in der Begleitung von Führungskräften und Privatpersonen helfe ich dir, Blockaden zu lösen und nachhaltige Veränderungen anzustoßen. Zertifizierter ICF-Coach (ACC).')
const ctaButton = ref('Jetzt Termin buchen')
const ctaIntro = ref('Bereit für den ersten Schritt?')

const formats = ref([
  { id: 'erstgespraech', label: 'Erstgespräch (30 min · kostenlos)', previewName: 'Erstgespräch', previewMeta: '30 min · Video', previewPrice: 'Kostenlos', selected: true },
  { id: 'coaching', label: 'Coaching-Sitzung (60 min · 120 €)', previewName: 'Coaching-Sitzung', previewMeta: '60 min · Video', previewPrice: '120 €', selected: true },
  { id: 'intensiv', label: 'Intensiv-Session (90 min · 150 €)', previewName: 'Intensiv-Session', previewMeta: '90 min · Video', previewPrice: '150 €', selected: true },
  { id: 'paket', label: '5er-Paket (5 × 60 min · 550 €)', previewName: '5er-Paket', previewMeta: '5 × 60 min · Video', previewPrice: '550 €', selected: false },
])

const selectedFormats = computed(() => formats.value.filter(f => f.selected))
const nameInitial = computed(() => profileName.value.charAt(0).toUpperCase() || 'A')

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const features = [
  {
    icon: 'i-lucide-link',
    title: 'Subdomain & Buchungslink',
    description: 'Deine persönliche Subdomain (z. B. anna.hxroom.de) – sichtbar für Klienten beim Buchungslink.',
  },
  {
    icon: 'i-lucide-image-plus',
    title: 'Logo hochladen',
    description: 'Eigenes Logo für Warteraum, Buchungsseite und E-Mails – Klienten sehen deine Marke, nicht HxRoom.',
  },
  {
    icon: 'i-lucide-palette',
    title: 'Primärfarbe',
    description: 'Wähle eine Akzentfarbe, die auf deiner Buchungsseite und im Warteraum verwendet wird.',
  },
  {
    icon: 'i-lucide-user-circle',
    title: 'Profilseite: Biografie & Schwerpunkte',
    description: 'Kurzbeschreibung, Profilfoto und Coaching-Schwerpunkte – Grundlage für deine öffentliche Buchungsseite.',
  },
  {
    icon: 'i-lucide-globe',
    title: 'Eigene CNAME-Domain',
    description: 'Verknüpfe deine eigene Domain (z. B. buchen.anna-coaching.de) mit deinem HxRoom-Account.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">

    <!-- Seitenheader -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-highlighted mb-1">Deine Coach-Landingpage</h1>
        <p class="text-sm text-muted">So sehen dich potenzielle Klienten – passe Profil, Angebot und Buchungs-CTA an.</p>
      </div>
    </div>


    <!-- Zweispaltiges Layout: Editor + Vorschau -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_900px] gap-12 items-start">

      <!-- Editor -->
      <div class="flex flex-col gap-4">

        <!-- Buchungs-URL -->
        <SettingsSection title="Adresse">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-muted uppercase tracking-wider">Subdomain</label>
            <div class="flex items-center gap-4 flex-wrap">
              <UFieldGroup class="flex-1 min-w-64">
                <UInput
                  v-model="subdomain"
                  :ui="{ base: 'bg-white dark:bg-neutral-800 text-right' }"
                  placeholder="dein-name"
                />
                <UBadge color="neutral" variant="outline" size="lg" :label="'.' + rootDomain" class="bg-muted " />
              </UFieldGroup>
              <UButton variant="outline" color="neutral">
                Link kopieren
              </UButton>
              <UButton variant="solid" color="primary" leading-icon="i-lucide-eye" :to="previewUrl" target="_blank">
                Vorschau öffnen
              </UButton>
            </div>
          </div>
        </SettingsSection>

        <!-- Profil -->
        <SettingsSection title="Profil">
          <div class="flex flex-col gap-5">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center font-serif text-2xl text-white shrink-0">
                {{ nameInitial }}
              </div>
              <div>
                <UButton variant="outline" color="neutral" leading-icon="i-lucide-upload" size="sm">
                  Foto hochladen
                </UButton>
                <p class="text-xs text-muted mt-1.5">JPG oder PNG, mind. 400×400 px</p>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted uppercase tracking-wider">Name</label>
              <UInput v-model="profileName" :ui="inputUi" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted uppercase tracking-wider">Tagline</label>
              <UInput v-model="tagline" :ui="inputUi" />
              <p class="text-xs text-muted">Wird direkt unter deinem Namen angezeigt. Max. 120 Zeichen.</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted uppercase tracking-wider">Über mich</label>
              <UTextarea v-model="bio" :rows="4" resize :ui="inputUi" />
            </div>
          </div>
        </SettingsSection>

        <!-- Sitzungsformate -->
        <SettingsSection title="Sitzungsformate">
          <div class="flex flex-col gap-3">
            <p class="text-sm text-muted">Wähle, welche Formate auf deiner Seite buchbar sind.</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="format in formats"
                :key="format.id"
                type="button"
                class="flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer"
                :class="format.selected
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                  : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'"
                @click="format.selected = !format.selected"
              >
                <span
                  class="flex items-center justify-center w-4 h-4 rounded shrink-0 border transition-colors"
                  :class="format.selected
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-neutral-300 dark:border-neutral-600'"
                >
                  <UIcon v-if="format.selected" name="i-lucide-check" class="w-2.5 h-2.5 text-white" />
                </span>
                <span
                  class="text-xs leading-snug"
                  :class="format.selected ? 'text-primary-700 dark:text-primary-300' : 'text-muted'"
                >
                  {{ format.label }}
                </span>
              </button>
            </div>
          </div>
        </SettingsSection>

        <!-- Call-to-Action -->
        <SettingsSection title="Call-to-Action">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted uppercase tracking-wider">Button-Text</label>
              <UInput v-model="ctaButton" :ui="inputUi" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-muted uppercase tracking-wider">Einleitungstext über dem Buchungs-Button</label>
              <UInput v-model="ctaIntro" :ui="inputUi" />
            </div>
          </div>
        </SettingsSection>

      </div>

      <!-- Vorschau-Panel -->
      <div class="sticky top-20">
        <SettingsSection title="Vorschau">
          <template #actions>
            <UButton variant="link" color="primary" size="xs" trailing-icon="i-lucide-external-link" :to="previewUrl" target="_blank">
              In neuem Tab öffnen
            </UButton>
          </template>
          <!-- Browser-Mockup -->
          <div class="rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <!-- Browser-Chrome -->
            <div class="bg-neutral-100 border-b border-neutral-200 px-3 py-2.5 flex items-center gap-3">
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="w-3 h-3 rounded-full bg-neutral-300" />
                <span class="w-3 h-3 rounded-full bg-neutral-300" />
                <span class="w-3 h-3 rounded-full bg-neutral-300" />
              </div>
              <div class="flex-1 bg-white border border-neutral-200 rounded-md px-2.5 py-1 flex items-center gap-1.5">
                <UIcon name="i-lucide-lock" class="w-3 h-3 text-neutral-400 shrink-0" />
                <span class="text-xs text-neutral-500 truncate">{{ subdomain }}.{{ rootDomain }}</span>
              </div>
            </div>
            <!-- Seiten-Inhalt -->
            <div class="bg-neutral-50 p-4 flex flex-col gap-3">
              <!-- Hero -->
              <div class="text-center px-4 py-6 rounded-xl bg-white border border-neutral-200">
                <div class="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center font-serif text-3xl text-white mx-auto mb-3 ring-2 ring-primary-500/25">
                  {{ nameInitial }}
                </div>
                <p class="font-serif text-xl text-neutral-900 mb-1">{{ profileName }}</p>
                <p class="text-xs text-neutral-500 leading-relaxed max-w-[220px] mx-auto mb-4">{{ tagline }}</p>
                <span class="inline-block bg-primary-600 text-white text-xs font-medium px-4 py-2 rounded-lg">
                  {{ ctaButton }}
                </span>
              </div>
              <!-- Format-Liste -->
              <div class="flex flex-col gap-2">
                <div
                  v-for="format in selectedFormats"
                  :key="format.id"
                  class="flex items-center justify-between px-3 py-2.5 bg-white border border-neutral-200 rounded-lg"
                >
                  <div>
                    <p class="text-sm text-neutral-900">{{ format.previewName }}</p>
                    <p class="text-xs text-neutral-400">{{ format.previewMeta }}</p>
                  </div>
                  <span class="font-serif text-base text-primary-600">{{ format.previewPrice }}</span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>

    </div>

    <!-- Geplante Features -->
    <SettingsSection title="Geplante Features" class="mt-94">
      <div class="flex flex-col gap-2">
        <UpcomingFeature
          v-for="item in features"
          :key="item.title"
          v-bind="item"
        />
      </div>
    </SettingsSection>

  </div>
</template>
