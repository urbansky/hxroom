import * as Sentry from '@sentry/vue'
import { MONITORING_EXCLUDED_INTEGRATIONS, sanitizeMonitoringEvent, scrubSensitiveData } from '@hxroom/shared'

// Fehlerüberwachung (GlitchTip über das Sentry-SDK). Ohne NUXT_PUBLIC_SENTRY_DSN bleibt sie aus.
//
// Die Meldungen gehen über den Tunnel der eigenen API (POST /api/v1/monitoring), nicht direkt an
// GlitchTip – Werbeblocker halten sie so nicht auf. Nur Fehler: keine Performance-Daten, keine
// Sitzungsaufzeichnung, keine Konsolenausgaben, kein Benutzer. Tokens werden entfernt.
export default defineNuxtPlugin((nuxtApp) => {
  const { public: { apiUrl, sentryDsn, sentryEnvironment, sentryRelease } } = useRuntimeConfig()
  if (!sentryDsn) return

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn: sentryDsn,
    tunnel: `${apiUrl}/monitoring`,
    environment: sentryEnvironment || (import.meta.dev ? 'development' : 'production'),
    release: sentryRelease || undefined,
    tracesSampleRate: 0,
    integrations: defaults =>
      defaults.filter(integration => !MONITORING_EXCLUDED_INTEGRATIONS.includes(integration.name)),
    dataCollection: {
      userInfo: false,
      cookies: false,
      // Nur der User-Agent: Welcher Browser scheiterte, ist bei Call-Problemen das Wichtigste.
      httpHeaders: { request: { allow: ['User-Agent'] }, response: false },
      httpBodies: [],
      stackFrameVariables: false,
    },
    beforeSend: event => sanitizeMonitoringEvent(event),
    beforeBreadcrumb: breadcrumb => scrubSensitiveData(breadcrumb),
  })

  // Zur Abnahme und Prüfung im Betrieb: ?monitoring-test=1 löst nach dem Laden einen Fehler aus.
  nuxtApp.hook('app:mounted', () => {
    if (new URLSearchParams(window.location.search).has('monitoring-test')) {
      setTimeout(() => {
        throw new Error('Monitoring test error (coach)')
      })
    }
  })
})
