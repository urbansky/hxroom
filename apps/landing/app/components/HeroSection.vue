<script setup lang="ts">
const content = {
  eyebrow: 'Early Access · Launch Q4 2026',
  headlineMain: 'Dein Coaching. Dein Raum.',
  headlineEm: 'Dein Name.',
  sub: 'Ein gebrandeter Videocall-Raum für Coaches – ohne Zoom-Link, ohne Klienten-Account, ohne fremdes Logo. Gebaut in Deutschland, DSGVO-konform by Design.',
  placeholder: 'deine@email.de',
  cta: 'Early-Access-Platz sichern',
  fineprintStrong: 'Die ersten 20 Coaches',
  fineprintRest: ' bekommen Launch-Preis auf Lebenszeit, direkten Draht zur Entwicklung und ersten Zugriff. Keine Kreditkarte, kein Spam.',
}

const email = ref('')

function onSubmit() {
  // TODO: Newsletter-API anbinden
}
</script>

<template>
  <section id="top" class="relative z-1 min-h-[92vh] flex flex-col items-center justify-center text-center px-8 pt-[140px] pb-20 overflow-hidden">
    <!-- Eyebrow -->
    <div class="a1 inline-flex items-center gap-2.5 bg-gold-400/8 border border-gold-400/22 rounded-full px-[18px] py-[7px] mb-9">
      <span class="size-1.5 rounded-full bg-gold-400 shrink-0" />
      <span class="text-[11px] text-gold-300 tracking-[0.14em] uppercase">{{ content.eyebrow }}</span>
    </div>

    <!-- Headline -->
    <h1 class="a2 font-serif text-[clamp(48px,7vw,84px)] font-light leading-[1.04] text-(--color-cream) tracking-[-0.02em] max-w-[880px] mb-7">
      {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em>
    </h1>

    <!-- Sub -->
    <p class="a3 text-[18px] text-(--ui-text-muted) leading-[1.65] max-w-[560px] mb-12">
      {{ content.sub }}
    </p>

    <!-- Signup form -->
    <form id="signup" class="a4 signup-form" @submit.prevent="onSubmit">
      <input
        v-model="email"
        type="email"
        :placeholder="content.placeholder"
        required
        class="signup-input"
      >
      <button type="submit" class="signup-btn">
        {{ content.cta }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
      </button>
    </form>

    <!-- Fineprint -->
    <p class="a5 text-[12px] text-(--ui-text-dimmed) max-w-[460px] leading-[1.6]">
      <strong class="text-sage-200 font-medium">{{ content.fineprintStrong }}</strong>{{ content.fineprintRest }}
    </p>
  </section>
</template>

<style scoped>
.a1 { animation: fadeUp 0.7s ease both; }
.a2 { animation: fadeUp 0.7s 0.1s ease both; }
.a3 { animation: fadeUp 0.7s 0.2s ease both; }
.a4 { animation: fadeUp 0.7s 0.3s ease both; }
.a5 { animation: fadeUp 0.7s 0.4s ease both; }

.signup-form {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  padding: 6px 6px 6px 18px;
  width: 100%;
  max-width: 460px;
  margin-bottom: 20px;
  transition: border-color 0.2s;
}
.signup-form:focus-within { border-color: rgba(139, 158, 138, 0.35); }

.signup-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ui-text);
  font-family: var(--font-sans);
  font-size: 15px;
  padding: 12px 0;
}
.signup-input::placeholder { color: var(--ui-text-dimmed); }

.signup-btn {
  background: linear-gradient(135deg, var(--color-sage-600) 0%, #7a9079 100%);
  color: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 10px;
  padding: 12px 22px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.signup-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(92, 110, 91, 0.28); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .signup-form { flex-direction: column; align-items: stretch; padding: 12px; }
  .signup-input { padding: 8px 6px; text-align: center; }
  .signup-btn { justify-content: center; }
}
</style>