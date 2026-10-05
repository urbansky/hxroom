/// <reference types="vite/client" />

// `import '@hxroom/ui/theme'` lädt eine CSS-Datei. Seit TypeScript 6 verlangt der
// Compiler auch für Side-Effect-Importe eine Deklaration (TS2882); für ein Stylesheet
// gibt es keine, deshalb wird der Subpfad hier als typlos bekannt gemacht.
declare module '@hxroom/ui/theme';

// Zur Build-Zeit eingebettet (Dockerfile, ARG). Ohne DSN ist die Fehlerüberwachung aus.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
}
