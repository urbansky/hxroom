<script setup lang="ts">
const content = {
  label: 'Ein Eindruck',
  headlineMain: 'So wird der Warteraum',
  headlineEm: 'deiner',
  headlineEnd: 'Klienten aussehen.',
  mockupUrl: 'anna.hxroom.de/raum',
  coach: {
    initial: 'A',
    name: 'Anna Bergmann',
    role: 'Life Coach · Berlin',
    welcome: '„Schön, dass du da bist. Ich komme gleich zu dir."',
    status: 'Anna kommt in wenigen Momenten',
  },
  caption: 'Gestaltungsentwurf · Anna ist eine Beispiel-Coach · Änderungen bis Launch möglich',
  thumbs: {
    booking: {
      label: 'Buchungsseite',
      title: '60-Min-Sitzung · Anna Bergmann',
      initial: 'A',
      slots: [
        { label: 'Di · 09:00', selected: false },
        { label: 'Di · 10:30', selected: true },
        { label: 'Di · 14:00', selected: false },
        { label: 'Mi · 09:00', selected: false },
        { label: 'Mi · 11:00', selected: false },
        { label: 'Do · 15:00', selected: false },
      ],
    },
    call: {
      label: 'Call-Ansicht · bewusst reduziert',
    },
  },
}
</script>

<template>
  <section class="relative z-1 py-[120px] px-12 max-sm:py-20 max-sm:px-6">
    <div class="max-w-[1100px] mx-auto">
      <!-- Header -->
      <div class="text-center mb-14">
        <div class="flex items-center justify-center gap-2.5 mb-[18px] text-[11px] text-sage-200 tracking-[0.14em] uppercase">
          {{ content.label }}
        </div>
        <h2 class="font-serif text-[clamp(36px,4.5vw,54px)] font-light leading-[1.1] text-(--color-cream) tracking-[-0.015em] mx-auto max-w-[760px]">
          {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em> {{ content.headlineEnd }}
        </h2>
      </div>

      <!-- Main mockup -->
      <div class="relative max-w-[1040px] mx-auto">
        <div class="mockup-frame bg-[#0D110D] rounded-2xl border border-white/8 overflow-hidden">
          <!-- Browser bar -->
          <div class="h-9 bg-white/3 border-b border-white/6 flex items-center px-4 gap-2.5">
            <div class="flex gap-1.5">
              <div class="size-[9px] rounded-full bg-red-400/50" />
              <div class="size-[9px] rounded-full bg-amber-400/40" />
              <div class="size-[9px] rounded-full bg-green-400/35" />
            </div>
            <div class="flex-1 bg-white/4 border border-white/6 rounded-md h-5 flex items-center justify-center text-[10px] text-(--ui-text-dimmed) tracking-[0.04em] max-w-[280px] mx-auto">
              {{ content.mockupUrl }}
            </div>
          </div>

          <!-- Waiting room -->
          <div class="waiting-room px-12 py-16 flex items-center justify-center min-h-[420px]">
            <div class="text-center max-w-[420px]">
              <!-- Avatar -->
              <div class="coach-photo size-[120px] rounded-full mx-auto mb-7 flex items-center justify-center font-serif text-[42px] text-white/85">
                {{ content.coach.initial }}
              </div>
              <div class="font-serif text-[26px] text-(--color-cream) mb-1.5">{{ content.coach.name }}</div>
              <div class="text-[12px] text-(--ui-text-dimmed) tracking-[0.08em] uppercase mb-8">{{ content.coach.role }}</div>
              <p class="font-serif text-[22px] italic text-sage-200 leading-[1.45] mb-9 font-light">{{ content.coach.welcome }}</p>
              <div class="inline-flex items-center gap-2.5 px-5 py-2.5 bg-sage-400/8 border border-sage-400/20 rounded-full text-[13px] text-sage-200">
                <span class="size-2 rounded-full bg-sage-400 status-dot" />
                {{ content.coach.status }}
              </div>
            </div>
          </div>
        </div>
        <p class="text-center mt-6 text-[13px] text-(--ui-text-dimmed) italic">{{ content.caption }}</p>
      </div>

      <!-- Thumbnails -->
      <div class="mt-10 grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <!-- Booking -->
        <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[12px] p-5">
          <div class="text-[11px] text-sage-200 tracking-[0.1em] uppercase mb-3.5">{{ content.thumbs.booking.label }}</div>
          <div class="bg-[#0D110D] rounded-lg p-5 min-h-[160px]">
            <div class="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/6">
              <div class="size-7 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[13px] text-white/90">
                {{ content.thumbs.booking.initial }}
              </div>
              <div class="font-serif text-[14px] text-(--color-cream)">{{ content.thumbs.booking.title }}</div>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <div
                v-for="slot in content.thumbs.booking.slots"
                :key="slot.label"
                class="rounded-[5px] py-2 px-1.5 text-center text-[10px] border"
                :class="slot.selected
                  ? 'bg-sage-400/22 border-sage-400/40 text-(--color-cream)'
                  : 'bg-sage-400/8 border-sage-400/18 text-sage-200'"
              >
                {{ slot.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Call view -->
        <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-[12px] p-5">
          <div class="text-[11px] text-sage-200 tracking-[0.1em] uppercase mb-3.5">{{ content.thumbs.call.label }}</div>
          <div class="bg-[#0D110D] rounded-lg p-5 min-h-[160px]">
            <div class="flex gap-2 h-[140px]">
              <div class="flex-[2] bg-gradient-to-br from-[#2A3329] to-[#1E231E] rounded-md relative">
                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  <div class="size-5 rounded-full bg-white/10 border border-white/15" />
                  <div class="size-5 rounded-full bg-white/10 border border-white/15" />
                  <div class="size-5 rounded-full bg-white/10 border border-white/15" />
                </div>
              </div>
              <div class="flex-1 bg-gradient-to-br from-[#3A4A39] to-[#1E231E] rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mockup-frame {
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
}

.waiting-room {
  background: radial-gradient(ellipse at top, rgba(139, 158, 138, 0.08), transparent 70%), #0D110D;
}

.coach-photo {
  background: linear-gradient(135deg, var(--color-sage-400) 0%, var(--color-sage-600) 60%, #3a4a39 100%);
  border: 3px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.status-dot {
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
