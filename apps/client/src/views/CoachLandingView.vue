<script setup lang="ts">
const coach = {
  name: 'Anna Bergmann',
  initial: 'A',
  title: 'Zertifizierte Life & Business Coach · 8 Jahre Erfahrung',
  eyebrow: 'Life Coaching · Berlin & online',
  bio: 'Ich arbeite mit Menschen, die an einem Wendepunkt stehen – beruflich oder persönlich – und Klarheit suchen, wo es gerade nur Nebel gibt.',
  topics: ['Beruflicher Neustart', 'Selbstvertrauen', 'Work-Life-Balance', 'Führung'],
  stats: [
    { value: '340+', label: 'Sitzungen' },
    { value: '8', label: 'Jahre' },
    { value: '4.9', label: 'Bewertung' },
  ],
};

const sessionTypes = [
  { name: 'Erstgespräch', duration: '30 Minuten · Kennenlernen', price: 'Kostenlos', free: true, featured: true },
  { name: 'Coaching-Sitzung', duration: '60 Minuten', price: '150 €', free: false, featured: false },
  { name: 'Intensiv-Session', duration: '90 Minuten', price: '210 €', free: false, featured: false },
];

const nextSlots = [
  { day: 'Montag', date: '10. März', time: '10:00 – 10:30 Uhr', type: 'Erstgespräch · 30 min', soon: true },
  { day: 'Montag', date: '10. März', time: '14:00 – 15:00 Uhr', type: 'Coaching-Sitzung · 60 min', soon: false },
  { day: 'Dienstag', date: '11. März', time: '09:00 – 09:30 Uhr', type: 'Erstgespräch · 30 min', soon: false },
  { day: 'Donnerstag', date: '13. März', time: '17:00 – 18:00 Uhr', type: 'Coaching-Sitzung · 60 min', soon: false },
];

const testimonials = [
  {
    text: '„Nach drei Sitzungen mit Anna hatte ich mehr Klarheit über meinen nächsten Schritt als nach einem Jahr Selbstreflexion. Sie stellt die richtigen Fragen – und lässt Raum zum Denken."',
    name: 'Markus K.',
    detail: 'Beruflicher Neustart · 6 Sitzungen',
    initials: 'MK',
  },
  {
    text: '„Die Kombination aus Online-Format und diesem ruhigen, professionellen Raum hat mich überrascht. Kein Zoom-Stress, kein Technik-Chaos – einfach ein gutes Gespräch."',
    name: 'Sarah L.',
    detail: 'Work-Life-Balance · 4 Sitzungen',
    initials: 'SL',
  },
  {
    text: '„Ich war skeptisch ob Online-Coaching wirklich funktioniert. Anna hat mich vom Gegenteil überzeugt – und ihr digitaler Empfangsraum macht von Anfang an einen professionellen Eindruck."',
    name: 'Thomas F.',
    detail: 'Führungskräfte-Coaching · 8 Sitzungen',
    initials: 'TF',
  },
];

const credentials = [
  { icon: 'i-lucide-graduation-cap', text: 'ICF-zertifiziert (ACC) · International Coaching Federation' },
  { icon: 'i-lucide-clock', text: '8 Jahre Coaching-Erfahrung · 340+ begleitete Klienten' },
  { icon: 'i-lucide-users', text: 'Ausgebildet in systemischem Coaching & NLP' },
];
</script>

<template>
  <!-- Ambient Effects -->
  <div class="glow-top" />
  <div class="glow-bottom" />

  <!-- Header -->
  <UHeader
    title="Anna Bergmann"
    :ui="{
      root: 'bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)',
      container: 'max-w-[1200px] px-6 lg:px-10',
    }"
  >
    <template #left>
      <a href="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-[34px] rounded-[9px] bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[17px] text-white/92 font-semibold shrink-0">
          {{ coach.initial }}
        </div>
        <span class="font-serif text-xl font-semibold text-gold-700 dark:text-gold-200 tracking-wide">{{ coach.name }}</span>
      </a>
    </template>
    <template #default>
      <div class="hidden sm:flex items-center gap-6">
        <a href="#about" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Über mich</a>
        <a href="#booking" class="text-[15px] text-(--ui-text-muted) hover:text-(--ui-text) transition-colors tracking-wide no-underline">Sitzungsarten</a>
      </div>
    </template>
    <template #right>
      <UButton color="primary" icon="i-lucide-calendar" size="lg" class="px-5">Termin buchen</UButton>
    </template>
  </UHeader>

  <!-- Hero -->
  <section class="relative z-1 min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-20 max-w-[1200px] mx-auto px-6 lg:px-10 pt-28 lg:pt-32 pb-16 lg:pb-20">
    <!-- Left -->
    <div class="flex flex-col gap-8">
      <div class="inline-flex items-center gap-2 bg-sage-400/10 border border-sage-400/20 rounded-full px-3.5 py-1.5 w-fit">
        <div class="size-1.5 rounded-full bg-sage-400" />
        <span class="text-[11px] text-sage-700 dark:text-sage-200 tracking-[0.08em] uppercase">{{ coach.eyebrow }}</span>
      </div>

      <h1 class="font-serif text-5xl lg:text-[68px] font-light leading-[1.08] text-sage-950 dark:text-cream tracking-tight">
        Raum für das,<br>
        was <em class="italic text-gold-500 dark:text-gold-300">wirklich</em><br>
        zählt.
      </h1>

      <p class="text-lg text-(--ui-text-muted) leading-[1.65] max-w-[440px]">
        Ich begleite Menschen in beruflichen Übergängen und persönlichen Wendepunkten – mit Klarheit, Offenheit und einer Methode, die zu dir passt.
      </p>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <UButton size="xl" color="primary" icon="i-lucide-calendar" class="shadow-lg shadow-sage-600/25 px-4">
          Erstgespräch buchen
        </UButton>
        <UButton size="xl" variant="outline" color="neutral" class="px-5">
          Mehr erfahren
        </UButton>
      </div>

      <div class="flex flex-wrap items-center gap-5">
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          Kein Account nötig
        </div>
        <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          DSGVO-konform
        </div>
        <div class="w-px h-3.5 bg-(--ui-border) hidden sm:block" />
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-dimmed)">
          <UIcon name="i-lucide-check" class="size-[13px] text-sage-400" />
          Erstgespräch kostenlos
        </div>
      </div>
    </div>

    <!-- Right -->
    <div class="flex flex-col gap-4" id="booking">
      <!-- Coach Card -->
      <div class="coach-card bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl overflow-hidden">
        <div class="coach-card-header relative h-[200px]">
          <img src="/coach-example.jpg" alt="Anna Bergmann" class="absolute inset-0 size-full object-cover object-top" />
        </div>
        <div class="px-5 pb-6 pt-5 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="font-serif text-[26px] font-normal text-sage-950 dark:text-cream leading-tight tracking-wide">{{ coach.name }}</h2>
              <p class="text-[15px] text-(--ui-text-muted) mt-1 tracking-wide">{{ coach.title }}</p>
            </div>
            <UBadge color="primary" variant="subtle" size="md" icon="i-lucide-check">
              Verifiziert
            </UBadge>
          </div>

          <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ coach.bio }}</p>

          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="topic in coach.topics" :key="topic" color="neutral" variant="subtle" size="md">
              {{ topic }}
            </UBadge>
          </div>

          <USeparator />

          <div class="flex gap-6">
            <div v-for="stat in coach.stats" :key="stat.label" class="flex flex-col gap-0.5">
              <span class="font-serif text-2xl text-sage-950 dark:text-cream font-light leading-none">{{ stat.value }}</span>
              <span class="text-xs text-(--ui-text-dimmed) tracking-[0.06em] uppercase">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Types -->
      <div class="bg-(--ui-bg-accented) border border-(--ui-border) rounded-[14px] p-4 flex flex-col gap-2">
        <span class="text-[10px] text-(--ui-text-dimmed) tracking-[0.1em] uppercase mb-1">Sitzungsarten</span>
        <div
          v-for="session in sessionTypes"
          :key="session.name"
          class="flex items-center justify-between px-3.5 py-3 rounded-[10px] border cursor-pointer transition-colors"
          :class="session.featured
            ? 'bg-sage-400/8 border-sage-400/18 hover:bg-sage-400/12'
            : 'bg-black/[0.025] dark:bg-white/[0.025] border-black/[0.04] dark:border-white/[0.04] hover:bg-black/5 dark:hover:bg-white/5'"
        >
          <div class="flex items-center gap-2.5">
            <div class="size-2 rounded-full" :class="session.featured ? 'bg-sage-400' : 'bg-sage-600'" />
            <div>
              <div class="text-[17px]" :class="session.featured ? 'text-sage-700 dark:text-sage-200' : ''">{{ session.name }}</div>
              <div class="text-[14px] text-(--ui-text-dimmed)">{{ session.duration }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <span
              :class="session.free
                ? 'text-sage-400 text-base'
                : 'font-serif text-lg text-sage-950 dark:text-cream'"
            >{{ session.price }}</span>
            <div class="size-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <UIcon name="i-lucide-chevron-right" class="size-2.5 text-(--ui-text-dimmed)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Next Slots -->
  <div class="section-divider" />
  <section class="relative z-1 max-w-[1200px] mx-auto px-6 lg:px-10 py-16" id="slots">
    <div class="flex items-baseline gap-4 mb-7">
      <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream">Nächste freie Termine</h2>
      <span class="text-xs text-(--ui-text-dimmed) tracking-wide">Alle Zeiten in MEZ</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="(slot, i) in nextSlots"
        :key="i"
        class="bg-(--ui-bg-elevated) border rounded-[14px] p-[18px] flex flex-col gap-2.5 cursor-pointer transition-all hover:border-sage-400/30 hover:bg-(--ui-bg-accented) hover:-translate-y-0.5 relative overflow-hidden"
        :class="slot.soon ? 'border-sage-400/20' : 'border-(--ui-border)'"
      >
        <div v-if="slot.soon" class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sage-600 to-sage-400" />
        <div class="text-[10px] text-(--ui-text-dimmed) uppercase tracking-[0.1em]">{{ slot.day }}</div>
        <div class="font-serif text-[22px] text-sage-950 dark:text-cream font-light leading-none">{{ slot.date }}</div>
        <div class="text-[13px] text-(--ui-text-muted)">{{ slot.time }}</div>
        <div class="text-[11px] text-(--ui-text-dimmed) tracking-wide">{{ slot.type }}</div>
        <div class="flex items-center gap-1 mt-1 text-xs text-sage-700 dark:text-sage-200">
          <UIcon name="i-lucide-calendar" class="size-[11px] text-sage-400" />
          Buchen
        </div>
      </div>
    </div>
  </section>

  <!-- About -->
  <div class="section-divider" />
  <section class="relative z-1 max-w-[1200px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start" id="about">
    <!-- Left: About -->
    <div>
      <h2 class="font-serif text-[28px] font-light text-sage-950 dark:text-cream mb-5">Über mich</h2>

      <blockquote class="border-l-2 border-sage-600 pl-5 py-3 my-6">
        <p class="font-serif text-xl italic text-sage-950 dark:text-cream font-light leading-relaxed">
          „Klarheit entsteht nicht durch mehr Nachdenken – sondern durch andere Gespräche."
        </p>
      </blockquote>

      <p class="text-[15px] text-(--ui-text-muted) leading-loose mb-4">
        Ich bin Anna, zertifizierte Life & Business Coach aus Berlin. Nach zehn Jahren in der Unternehmensberatung habe ich gemerkt: Die wichtigsten Veränderungen in meinem Leben kamen nicht aus Strategiepapieren, sondern aus echten Gesprächen, die mich herausgefordert haben.
      </p>
      <p class="text-[15px] text-(--ui-text-muted) leading-loose">
        Heute begleite ich Menschen, die an einem Wendepunkt stehen – die spüren, dass etwas nicht mehr stimmt, aber noch nicht wissen, wohin es gehen soll.
      </p>

      <div class="mt-7 flex flex-col gap-2.5">
        <div v-for="cred in credentials" :key="cred.text" class="flex items-center gap-2.5 p-3 px-3.5 bg-black/[0.025] dark:bg-white/[0.025] border border-black/[0.04] dark:border-white/[0.04] rounded-[10px]">
          <div class="size-7 rounded-[7px] bg-sage-400/10 border border-sage-400/15 flex items-center justify-center shrink-0">
            <UIcon :name="cred.icon" class="size-3.5 text-sage-400" />
          </div>
          <span class="text-[13px] text-(--ui-text-muted)">{{ cred.text }}</span>
        </div>
      </div>
    </div>

    <!-- Right: Testimonials -->
    <div class="flex flex-col gap-5">
      <UCard v-for="t in testimonials" :key="t.name">
        <div class="flex gap-0.5 mb-3">
          <UIcon v-for="i in 5" :key="i" name="i-lucide-star" class="size-3 text-gold-400" />
        </div>
        <p class="text-sm text-(--ui-text-muted) leading-relaxed italic">{{ t.text }}</p>
        <div class="flex items-center gap-2.5 mt-3">
          <UAvatar :text="t.initials" size="sm" />
          <div>
            <div class="text-xs">{{ t.name }}</div>
            <div class="text-[11px] text-(--ui-text-dimmed)">{{ t.detail }}</div>
          </div>
        </div>
      </UCard>
    </div>
  </section>

  <!-- Footer -->
  <UFooter>
    <template #left>
      <span class="text-xs text-(--ui-text-dimmed)">
        Gebrandeter HxRoom von
        <a href="https://hxroom.io" target="_blank" class="text-sage-400/70 hover:text-sage-400 transition-colors no-underline">hxroom.io</a>
        &nbsp;·&nbsp;DSGVO-konform&nbsp;·&nbsp;Server Deutschland
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-5">
        <UColorModeButton size="xs" />
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Datenschutz</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">Impressum</a>
        <a href="#" class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text-muted) transition-colors no-underline">AGB</a>
      </div>
    </template>
  </UFooter>
</template>

<style scoped>
.glow-top {
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(92, 110, 91, 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.glow-bottom {
  position: fixed;
  bottom: -300px;
  right: -200px;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(181, 147, 90, 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.coach-card {
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.08);
}

:global(.dark) .coach-card {
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
}

.coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.2) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.08) 0%, transparent 60%),
    #c5d0c4;
}

:global(.dark) .coach-card-header {
  background:
    radial-gradient(ellipse 60% 80% at 40% 60%, rgba(92, 110, 91, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 70% 30%, rgba(181, 147, 90, 0.12) 0%, transparent 60%),
    #0e1410;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
  max-width: 1200px;
  margin: 0 auto;
}
</style>
