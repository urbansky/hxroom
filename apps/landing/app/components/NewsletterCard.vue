<script setup lang="ts">
const props = defineProps<{
  cta: string
  source?: 'landing' | 'coach-page' | 'pricing'
}>()

const config = useRuntimeConfig()

type Status = 'idle' | 'loading' | 'success' | 'error'

const name = ref('')
const email = ref('')
const status = ref<Status>('idle')
const errorMessage = ref('')

async function onSubmit() {
  if (status.value === 'loading') return
  status.value = 'loading'
  errorMessage.value = ''

  try {
    const res = await fetch(`${config.public.apiUrl}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        name: name.value || undefined,
        source: props.source ?? 'landing',
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? 'Anmeldung fehlgeschlagen')
    }
    status.value = 'success'
  } catch (e: unknown) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten'
  }
}
</script>

<template>
  <!-- Success state -->
  <div v-if="status === 'success'" class="newsletter-card success-card">
    <div class="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
    <p class="success-title">Fast geschafft</p>
    <p class="success-sub">Wir haben dir eine Bestätigungs-E-Mail geschickt. Klick auf den Link darin, um deinen Platz zu sichern.</p>
  </div>

  <!-- Form -->
  <form v-else class="newsletter-card" @submit.prevent="onSubmit" novalidate>
    <div class="newsletter-fields">
      <div class="newsletter-field">
        <label class="newsletter-label" for="nl-name">Dein Name</label>
        <div class="input-wrap">
          <input
            id="nl-name"
            v-model="name"
            type="text"
            placeholder="Anna Bergmann"
            autocomplete="name"
            class="nl-input"
            :disabled="status === 'loading'"
          >
        </div>
      </div>
      <div class="newsletter-field">
        <label class="newsletter-label" for="nl-email">Deine E-Mail</label>
        <div class="input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="input-icon">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 7 9-7" />
          </svg>
          <input
            id="nl-email"
            v-model="email"
            type="email"
            placeholder="anna@beispiel.de"
            autocomplete="email"
            required
            class="nl-input"
            :disabled="status === 'loading'"
          >
        </div>
      </div>
    </div>

    <button type="submit" class="submit-btn" :disabled="status === 'loading'">
      <span v-if="status === 'loading'">Wird gesendet…</span>
      <template v-else>
        {{ props.cta }}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </template>
    </button>

    <p v-if="status === 'error'" class="error-msg" role="alert">{{ errorMessage }}</p>

    <div class="divider" />

    <div class="trust-row">
      <span v-for="item in ['Eine Mail pro Meilenstein', 'Kein Spam, keine Werbung', 'Jederzeit abmeldbar']" :key="item" class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="trust-check">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {{ item }}
      </span>
    </div>
  </form>
</template>

<style scoped>
.newsletter-card {
  width: 100%;
  max-width: 620px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 18px;
  padding: 36px 36px 28px;
  text-align: left;
}

.success-card {
  text-align: center;
  padding: 48px 36px;
}
.success-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: rgba(139, 158, 138, 0.12);
  border: 1px solid rgba(139, 158, 138, 0.25);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  stroke: var(--color-sage-400);
}
.success-icon svg { width: 22px; height: 22px; stroke: var(--color-sage-400); }
.success-title {
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--color-cream);
  margin-bottom: 10px;
}
.success-sub {
  font-size: 14px;
  color: var(--ui-text-muted);
  line-height: 1.6;
  max-width: 360px;
  margin: 0 auto;
}

.newsletter-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 22px;
}
.newsletter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.newsletter-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-cream);
  letter-spacing: 0.01em;
}
.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.2s, background 0.2s;
}
.input-wrap:focus-within {
  border-color: rgba(139, 158, 138, 0.4);
  background: rgba(255, 255, 255, 0.04);
}
.input-icon {
  width: 16px; height: 16px;
  stroke: var(--ui-text-dimmed);
  flex-shrink: 0;
}
.nl-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ui-text);
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 14px 0 14px 10px;
  min-width: 0;
}
.nl-input:first-child { padding-left: 0; }
.nl-input::placeholder { color: var(--ui-text-dimmed); }
.nl-input:disabled { opacity: 0.6; cursor: not-allowed; }

.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-sage-600) 0%, var(--color-sage-500) 100%);
  color: rgba(255, 255, 255, 0.96);
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 36px rgba(92, 110, 91, 0.32);
}
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.error-msg {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-error-400, #f87171);
}

.divider {
  height: 1px;
  background: var(--ui-border);
  margin: 24px 0 18px;
}

.trust-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.trust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ui-text-muted);
}
.trust-check {
  width: 14px; height: 14px;
  stroke: var(--color-sage-400);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .newsletter-card { padding: 26px 22px 22px; }
  .newsletter-fields { grid-template-columns: 1fr; gap: 14px; }
  .trust-row { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>
