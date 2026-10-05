// Fehlerüberwachung (GlitchTip über das Sentry-SDK). Muss als erstes Modul geladen werden –
// main.ts importiert diese Datei vor allem anderen, damit das SDK Express und Nest erfassen kann.
// Ohne SENTRY_DSN bleibt das SDK aus (lokal der Normalfall).
//
// Gemeldet werden nur unerwartete Fehler: Der SentryGlobalFilter (app.module.ts) übergeht
// HttpExceptions, also alle bewusst beantworteten 4xx. Keine Performance-Daten, keine
// Personendaten; Tokens und signierte Links werden aus allen Texten entfernt.
import * as Sentry from '@sentry/nestjs';
import { existsSync } from 'node:fs';
import { sanitizeMonitoringEvent, scrubSensitiveData } from '@hxroom/shared';

// Lokal liest Nest die .env erst im ConfigModule, also nach diesem Modul. Node lädt sie hier
// selbst; in Produktion kommen die Variablen aus docker-compose.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0,
    // Die Voreinstellungen sammeln Cookies, alle Header, Bodys, Datenbankwerte und lokale
    // Variablen in Stackframes – dort können Notizen, Chat-Inhalte oder Zugangsdaten stehen.
    // Übrig bleibt, was zur Fehlersuche nötig ist: Stacktrace, Methode, URL, User-Agent.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent'] }, response: false },
      httpBodies: [],
      urlQueryParams: true, // Tokens entfernt beforeSend
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    beforeSend: (event) => sanitizeMonitoringEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubSensitiveData(breadcrumb),
  });
}
