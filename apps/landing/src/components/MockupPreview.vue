<template>
  <div class="relative z-1 w-full max-w-[1100px] mx-auto animate-fade-up" style="animation-delay: 0.5s;">
    <!-- Glow beneath -->
    <div class="absolute -bottom-15 left-1/2 -translate-x-1/2 w-4/5 h-30 bg-[radial-gradient(ellipse,rgba(92,110,91,0.18)_0%,transparent_70%)] blur-xl" />

    <!-- Frame -->
    <div class="mockup-frame bg-[#0D110D] rounded-2xl border border-white/10 overflow-hidden relative">
      <!-- Browser Bar -->
      <div class="h-10 bg-white/3 border-b border-white/6 flex items-center px-4 gap-2.5">
        <div class="flex gap-1.5">
          <div class="size-2.5 rounded-full bg-red-400/50" />
          <div class="size-2.5 rounded-full bg-amber-400/40" />
          <div class="size-2.5 rounded-full bg-green-400/35" />
        </div>
        <div class="flex-1 bg-white/4 border border-white/6 rounded-md h-[22px] flex items-center px-2.5 text-[10px] text-(--ui-text-dimmed) tracking-wide max-w-80 mx-auto">
          anna.hxroom.io/backoffice
        </div>
      </div>

      <!-- Body -->
      <div class="hidden md:grid grid-cols-[200px_1fr] h-[480px]">
        <!-- Sidebar -->
        <div class="bg-[#111511] border-r border-white/5 p-3 flex flex-col gap-0.5">
          <div class="flex items-center gap-2 px-2 py-2 pb-4 border-b border-white/5 mb-2">
            <div class="size-6 rounded-md bg-gradient-to-br from-sage-400 to-sage-700 flex items-center justify-center font-serif text-xs font-semibold text-white">H</div>
            <span class="font-serif text-sm font-semibold text-gold-200">HxRoom</span>
          </div>
          <div
            v-for="(item, i) in sidebarItems"
            :key="item"
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px]"
            :class="i === 0 ? 'bg-sage-400/10 text-sage-200' : 'text-white/30'"
          >
            <div class="size-1.5 rounded-full bg-current" />
            {{ item }}
          </div>
        </div>

        <!-- Main -->
        <div class="bg-(--ui-bg) p-5 flex flex-col gap-3.5 overflow-hidden">
          <!-- Topbar -->
          <div class="flex items-center justify-between">
            <span class="font-serif text-lg text-cream">Guten Morgen, Anna</span>
            <span class="text-[9px] tracking-[0.08em] uppercase text-gold-300 bg-gold-500/10 border border-gold-500/20 rounded-full px-2.5 py-0.5">Trial · 9 Tage</span>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-4 gap-2.5">
            <div v-for="stat in stats" :key="stat.label" class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[10px] p-3">
              <div class="text-[9px] uppercase tracking-[0.08em] text-(--ui-text-dimmed) mb-1.5">{{ stat.label }}</div>
              <div class="font-serif text-[26px] font-light text-cream leading-none">{{ stat.value }}</div>
              <div class="text-[9px] text-sage-500 mt-1">{{ stat.sub }}</div>
            </div>
          </div>

          <!-- Grid: Sessions + Clients -->
          <div class="grid grid-cols-[1fr_200px] gap-2.5 flex-1 min-h-0">
            <!-- Sessions Card -->
            <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[10px] overflow-hidden">
              <div class="px-3.5 py-2.5 border-b border-(--ui-border) flex items-center justify-between">
                <span class="font-serif text-[13px] text-cream">Heute – Freitag, 6. März</span>
                <span class="text-[9px] text-sage-500 font-sans">Woche &rarr;</span>
              </div>
              <div
                v-for="session in sessions"
                :key="session.name"
                class="flex items-center gap-2.5 px-3.5 py-2 border-b border-white/3"
                :class="session.next ? 'bg-sage-400/4' : ''"
              >
                <div class="size-[26px] rounded-full bg-gradient-to-br from-sage-700 to-sage-900 flex items-center justify-center font-serif text-[10px] font-semibold text-white/80 shrink-0">
                  {{ session.initials }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] text-(--ui-text)">{{ session.name }}</div>
                  <div class="text-[9px] text-(--ui-text-dimmed)">{{ session.type }}</div>
                </div>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded border shrink-0"
                  :class="session.next
                    ? 'bg-sage-400/10 border-sage-400/20 text-sage-200'
                    : 'border-white/7 text-(--ui-text-dimmed)'"
                >{{ session.chip }}</span>
                <span v-if="session.next" class="text-[9px] bg-sage-400/12 border border-sage-400/20 rounded px-2 py-0.5 text-sage-200">Raum öffnen</span>
              </div>
            </div>

            <!-- Clients Card -->
            <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[10px] overflow-hidden">
              <div class="px-3.5 py-2.5 border-b border-(--ui-border) flex items-center justify-between">
                <span class="font-serif text-[13px] text-cream">Klienten</span>
                <span class="text-[9px] text-sage-500 font-sans">Alle &rarr;</span>
              </div>
              <div v-for="client in clients" :key="client.name" class="flex items-center gap-2 px-3.5 py-2 border-b border-white/3">
                <div class="size-[26px] rounded-full bg-gradient-to-br from-sage-700 to-sage-900 flex items-center justify-center font-serif text-[10px] font-semibold text-white/80 shrink-0">
                  {{ client.initials }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] text-(--ui-text)">{{ client.name }}</div>
                  <div class="text-[9px] text-(--ui-text-dimmed)">{{ client.sub }}</div>
                </div>
                <span class="font-serif text-base text-(--ui-text-muted)">{{ client.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile placeholder -->
      <div class="md:hidden h-60 bg-(--ui-bg) flex items-center justify-center">
        <span class="text-sm text-(--ui-text-dimmed)">Dashboard-Vorschau</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarItems = ['Dashboard', 'Kalender', 'Klienten', 'Notizen', 'Umsatz', 'Branding'];

const stats = [
  { label: 'Sitzungen gesamt', value: '24', sub: '+3 diesen Monat' },
  { label: 'Aktive Klienten', value: '7', sub: '2 neue Woche' },
  { label: 'Diese Woche', value: '5', sub: 'Termine Mo–Fr' },
  { label: 'Umsatz / Monat', value: '1.350 €', sub: '+450 € Vormonat' },
];

const sessions = [
  { initials: 'SL', name: 'Sarah Lindner', type: 'Coaching-Sitzung · 09:00', chip: 'Abgeschlossen', next: false },
  { initials: 'MK', name: 'Markus Kellner', type: 'Sitzung 4 · 11:00', chip: 'In 47 min', next: true },
  { initials: 'TF', name: 'Thomas Fischer', type: 'Erstgespräch · 14:30', chip: 'Kostenlos', next: false },
  { initials: 'JM', name: 'Julia Meier', type: 'Intensiv-Session · 17:00', chip: '150 €', next: false },
];

const clients = [
  { initials: 'MK', name: 'Markus K.', sub: 'Heute 11:00', count: 4 },
  { initials: 'SL', name: 'Sarah L.', sub: 'Mo 10:00', count: 6 },
  { initials: 'JM', name: 'Julia M.', sub: 'Heute 17:00', count: 2 },
];
</script>

<style scoped>
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-up {
  animation: fadeUp 0.9s ease both;
}

.mockup-frame {
  box-shadow:
    0 60px 120px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
</style>
