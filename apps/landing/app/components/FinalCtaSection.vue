<script setup lang="ts">
const content = {
  headlineMain: 'Sag mir, dass du',
  headlineEm: 'dabei sein willst',
  headlineEnd: '.',
  sub: 'Den Rest melde ich dir, sobald es losgeht. Eine E-Mail pro Meilenstein – nicht mehr.',
  placeholder: 'deine@email.de',
  cta: 'Benachrichtigt werden',
}

const email = ref('')

function onSubmit() {
  // TODO: Newsletter-API anbinden
}
</script>

<template>
  <section class="relative z-1 pt-[140px] pb-[100px] px-12 text-center max-sm:py-20 max-sm:px-6">
    <div class="section-divider" />

    <h2 class="font-serif text-[clamp(34px,4.5vw,50px)] font-light text-(--color-cream) leading-[1.15] mb-5 max-w-[700px] mx-auto">
      {{ content.headlineMain }} <em class="italic text-gold-300">{{ content.headlineEm }}</em>{{ content.headlineEnd }}
    </h2>
    <p class="text-[16px] text-(--ui-text-muted) max-w-[480px] mx-auto mb-10 leading-[1.6]">
      {{ content.sub }}
    </p>

    <form class="signup-form mx-auto" @submit.prevent="onSubmit">
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
  </section>
</template>

<style scoped>
.section-divider {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ui-border), transparent);
}

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

@media (max-width: 640px) {
  .signup-form { flex-direction: column; align-items: stretch; padding: 12px; }
  .signup-input { padding: 8px 6px; text-align: center; }
  .signup-btn { justify-content: center; }
}
</style>
