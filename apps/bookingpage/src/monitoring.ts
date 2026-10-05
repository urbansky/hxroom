import type { App } from 'vue';
import type { Router } from 'vue-router';
import * as Sentry from '@sentry/vue';
import { MONITORING_EXCLUDED_INTEGRATIONS, sanitizeMonitoringEvent, scrubSensitiveData } from '@hxroom/shared';
import { apiUrl } from './utils/api';

/**
 * Fehlerüberwachung (GlitchTip über das Sentry-SDK). Ohne VITE_SENTRY_DSN bleibt sie aus.
 *
 * Die Meldungen gehen über den Tunnel der eigenen API (POST /api/v1/monitoring), nicht direkt an
 * GlitchTip: Die Klientenseite spricht weiterhin nur mit api.hxroom.de (technisches-konzept §17),
 * und Werbeblocker halten die Meldungen nicht auf. Nur Fehler – keine Performance-Daten, keine
 * Sitzungsaufzeichnung, keine Konsolenausgaben. Tokens aus den Zugangslinks werden entfernt.
 */
export function initMonitoring(app: App, router: Router) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    app,
    dsn,
    tunnel: `${apiUrl}/api/v1/monitoring`,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: 0,
    integrations: (defaults) =>
      defaults.filter((integration) => !MONITORING_EXCLUDED_INTEGRATIONS.includes(integration.name)),
    dataCollection: {
      userInfo: false,
      cookies: false,
      // Nur der User-Agent: Welcher Browser scheiterte, ist bei Call-Problemen das Wichtigste.
      httpHeaders: { request: { allow: ['User-Agent'] }, response: false },
      httpBodies: [],
      stackFrameVariables: false,
    },
    beforeSend: (event) => sanitizeMonitoringEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubSensitiveData(breadcrumb),
  });

  // Zur Abnahme und Prüfung im Betrieb: ?monitoring-test=1 löst nach dem Laden einen Fehler aus.
  router.isReady().then(() => {
    if (new URLSearchParams(window.location.search).has('monitoring-test')) {
      setTimeout(() => {
        throw new Error('Monitoring test error (bookingpage)');
      });
    }
  });
}
