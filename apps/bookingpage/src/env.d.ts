/// <reference types="vite/client" />

// `import '@hxroom/ui/theme'` lädt eine CSS-Datei. Seit TypeScript 6 verlangt der
// Compiler auch für Side-Effect-Importe eine Deklaration (TS2882); für ein Stylesheet
// gibt es keine, deshalb wird der Subpfad hier als typlos bekannt gemacht.
declare module '@hxroom/ui/theme';
