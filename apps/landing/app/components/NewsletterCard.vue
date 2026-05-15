<script setup lang="ts">
defineProps<{
  cta?: string
  // Wird im Markup nicht gebraucht, bleibt als Optionalprop für Aufruferkompatibilität.
  source?: string
}>()

// Brevo-Form-Endpoint. Liefert auf POST?isAjax=1 ein JSON mit success/message/errors.
// Subdomain spiegelt den Request-Origin zurück (CORS), daher funktioniert auch localhost.
const BREVO_ACTION
  = 'https://3c8e304e.sibforms.com/serve/MUIFALOunJ0QrvwXyircTR7cGFudfzM0RrAmrCWd_Dnh2_ImWVZ4lsEEwPGykXq6CB2gK5-cD6gmMbNPwlArb24_FLU21LIvL6PzBuclSeuA0Cc3HDdxs-TKbANwhO_rjIq8UmxhSBZTCAUckJAs2AbiIBrll1sl2TPnOWKwT-fN0X46Izq1tissWihIbGX27jfA9kEgIt-TowWCLQ=='

type Status = 'idle' | 'loading' | 'success' | 'error'

interface BrevoAjaxResponse {
  success: boolean
  message?: string
  redirect?: string | null
  errors?: Record<string, string>
}

const uid = useId()
const nameId = `nl-name-${uid}`
const emailId = `nl-email-${uid}`

const name = ref('')
const email = ref('')
// Honeypot: für echte Nutzer unsichtbar; wenn Bots das Feld dennoch ausfüllen,
// brechen wir den Submit lautlos ab.
const honeypot = ref('')

const status = ref<Status>('idle')
const errorMessage = ref('')

async function onSubmit() {
  if (status.value === 'loading') return

  // Bot-Verdacht → vortäuschen, dass alles ok ist, ohne Brevo zu kontaktieren.
  if (honeypot.value) {
    status.value = 'success'
    return
  }

  status.value = 'loading'
  errorMessage.value = ''

  const body = new FormData()
  body.set('VORNAME', name.value)
  body.set('EMAIL', email.value)
  body.set('email_address_check', '')
  body.set('locale', 'de')

  try {
    const res = await fetch(`${BREVO_ACTION}?isAjax=1`, {
      method: 'POST',
      body,
    })
    const data = (await res.json()) as BrevoAjaxResponse

    if (data.success) {
      status.value = 'success'
      return
    }

    status.value = 'error'
    errorMessage.value
      = data.message
      ?? Object.values(data.errors ?? {})[0]
      ?? 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.'
  }
  catch {
    status.value = 'error'
    errorMessage.value = 'Netzwerkfehler – bitte später erneut versuchen.'
  }
}
</script>

<template>
  <div class="newsletter-card">
    <!-- Erfolgs-State -->
    <div v-if="status === 'success'" class="success-card">
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <p class="success-title">Fast geschafft</p>
      <p class="success-sub">Wir haben dir eine Bestätigungs-E-Mail geschickt. Klick auf den Link darin, um deinen Platz zu sichern.</p>
    </div>

    <!-- Formular -->
    <form v-else @submit.prevent="onSubmit">
      <div class="newsletter-fields">
        <div class="newsletter-field">
          <label class="newsletter-label" :for="nameId">Dein Name</label>
          <div class="input-wrap">
            <input
              :id="nameId"
              v-model="name"
              type="text"
              maxlength="200"
              placeholder="Anna Bergmann"
              autocomplete="given-name"
              class="nl-input"
              required
              :disabled="status === 'loading'"
            >
          </div>
        </div>
        <div class="newsletter-field">
          <label class="newsletter-label" :for="emailId">Deine E-Mail</label>
          <div class="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="input-icon">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 7 9-7" />
            </svg>
            <input
              :id="emailId"
              v-model="email"
              type="email"
              placeholder="anna@beispiel.de"
              autocomplete="email"
              class="nl-input"
              required
              :disabled="status === 'loading'"
            >
          </div>
        </div>
      </div>

      <!--
        Honeypot. display:none + neutraler Feldname:
        - Browser-Autofill (Chrome/Edge ignorieren autocomplete=off bei E-Mail-ähnlichen Namen,
          daher KEIN "email_address_check" im DOM)
        - Passwort-Manager überspringen display:none-Felder zuverlässig
        - Bots, die das Form serialisieren, sehen das Feld trotzdem und füllen es aus
      -->
      <input
        v-model="honeypot"
        type="text"
        name="b_company_url"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
        class="honeypot"
      >

      <p class="newsletter-consent">
        Mit Klick auf <strong>„{{ cta ?? 'Early-Access-Platz sichern' }}"</strong> willigst du ein, dass ich dir per E-Mail Neuigkeiten zu HxRoom sende. Versand über Brevo (EU-Server). Abmeldung jederzeit per Klick. Details in der
        <NuxtLink to="/datenschutz">Datenschutzerklärung</NuxtLink>.
      </p>

      <button type="submit" class="submit-btn" :disabled="status === 'loading'">
        <span v-if="status === 'loading'" class="btn-label">
          <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" />
          </svg>
          Wird gesendet …
        </span>
        <span v-else class="btn-label">
          {{ cta ?? 'Early-Access-Platz sichern' }}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      <p v-if="status === 'error'" class="error-msg" role="alert">
        {{ errorMessage }}
      </p>

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
  </div>
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

/* Erfolgs-State */
.success-card {
  text-align: center;
  padding: 12px 0 0;
}
.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-sage-400) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sage-400) 25%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}
.success-icon svg {
  width: 22px;
  height: 22px;
  stroke: var(--color-sage-500);
}
.success-title {
  //font-family: var(--font-serif), Georgia, serif;
  font-size: 22px;
  color: var(--ui-text-highlighted);
  margin-bottom: 10px;
}
.success-sub {
  font-size: 14px;
  color: var(--ui-text-muted);
  line-height: 1.6;
  max-width: 360px;
  margin: 0 auto;
}

/* Felder */
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
  color: var(--ui-text-highlighted);
  letter-spacing: 0.01em;
}
.input-wrap {
  display: flex;
  align-items: center;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.2s, background 0.2s;
}
.input-wrap:focus-within {
  border-color: var(--color-sage-600);
  background: var(--ui-bg-accented);
}
.input-icon {
  width: 16px;
  height: 16px;
  stroke: var(--ui-text-dimmed);
  flex-shrink: 0;
}
.nl-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ui-text);
  font-family: var(--font-sans), system-ui, sans-serif;
  font-size: 14px;
  padding: 14px 0 14px 10px;
  min-width: 0;
}
.nl-input:first-child { padding-left: 0; }
.nl-input::placeholder { color: var(--ui-text-dimmed); }
.nl-input:disabled { opacity: 0.6; cursor: not-allowed; }

/* Honeypot: display:none ist die stärkste Heuristik gegen Autofill */
.honeypot {
  display: none !important;
}

/* DSGVO-Hinweis */
.newsletter-consent {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text-muted);
  margin-bottom: 18px;
  padding: 16px 18px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: 10px;
}
.newsletter-consent strong {
  color: var(--ui-text-muted);
  font-weight: 500;
}
.newsletter-consent :deep(a) {
  color: var(--color-sage-700);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}
:global(.dark) .newsletter-consent :deep(a) {
  color: var(--color-sage-200);
}
.newsletter-consent :deep(a:hover) {
  color: var(--ui-text-highlighted);
}

/* Submit-Button */
.submit-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-sage-600) 0%, var(--color-sage-500) 100%);
  color: rgba(255, 255, 255, 0.96);
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-family: var(--font-sans), system-ui, sans-serif;
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
.btn-label { display: inline-flex; align-items: center; gap: 8px; }
.arrow { width: 14px; height: 14px; }
.spinner {
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Fehler */
.error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--color-error-400, #f87171) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error-400, #f87171) 25%, transparent);
  color: var(--color-error-400, #f87171);
}

/* Trenner + Trust-Row */
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
  width: 14px;
  height: 14px;
  stroke: var(--color-sage-500);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .newsletter-card { padding: 26px 22px 22px; }
  .newsletter-fields { grid-template-columns: 1fr; gap: 14px; }
  .trust-row { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>
