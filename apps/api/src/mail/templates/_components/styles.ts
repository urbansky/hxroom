import type { CSSProperties } from 'react';

// Farb- und Textstile aller HxRoom-Mails, abgeleitet aus dem Theme der Coach-App
// (packages/ui/theme/main.css). Mails brauchen solide Hex-Werte statt CSS-Variablen,
// deshalb liegen die aufgelösten Werte hier – der Kommentar hinter jedem Eintrag nennt
// das Token, aus dem er kommt, damit beide Seiten nachvollziehbar zusammenbleiben.
export const colors = {
  pageBg: '#faf8f4',       // --ui-bg
  card: '#ffffff',         // bg-white
  border: '#e8e5de',       // --ui-border (rgba(0,0,0,.08)) als solider Wert auf warmem Grund
  surface: '#f2efe8',      // --ui-bg-muted
  barFallback: '#c5d0c4',  // sage-200, wenn ein Termin kein Angebot hat
  wordmark: '#634d2c',     // gold-700, wie packages/ui/components/Logo.vue
  heading: '#141814',      // --ui-text-highlighted
  text: '#2e3a2d',         // --ui-text (sage-900)
  muted: '#5C6E5B',        // --ui-text-muted (sage-600)
  primary: '#4a5a49',      // --ui-primary (sage-700)
} as const;

// Web-Fonts sind in E-Mail-Clients unzuverlässig: die Stacks nennen die Theme-Schriften
// zuerst, tragend sind aber die Systemschriften dahinter (Georgia als Serif-Ersatz für
// Cormorant Garamond). Die geladene DM-Sans-Achse endet bei 500 – deshalb ist 500 auch
// hier das höchste Gewicht, damit Mail und App gleich kräftig wirken.
export const fonts = {
  sans: "'DM Sans', Helvetica, Arial, sans-serif",
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
} as const;

/** Serif-Anrede, Gegenstück zu `font-serif text-3xl text-highlighted` in der App. */
export const heading: CSSProperties = {
  margin: '0 0 16px',
  fontFamily: fonts.serif,
  fontSize: 28,
  fontWeight: 400,
  lineHeight: 1.25,
  color: colors.heading,
};

export const paragraph: CSSProperties = {
  margin: '0 0 20px',
  fontSize: 15,
  lineHeight: 1.65,
  color: colors.text,
};

/** Dezenter Schlussabsatz (Hinweise, Absage-Link, Gültigkeitsdauer). */
export const footnote: CSSProperties = {
  margin: '28px 0 0',
  fontSize: 13,
  lineHeight: 1.6,
  color: colors.muted,
};

export const label: CSSProperties = {
  margin: '0 0 2px',
  fontSize: 12,
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export const value: CSSProperties = {
  margin: '0 0 14px',
  fontSize: 14,
  lineHeight: 1.5,
  color: colors.text,
};

export const link: CSSProperties = {
  color: colors.primary,
};

export const button: CSSProperties = {
  backgroundColor: colors.primary,
  color: '#ffffff',
  textDecoration: 'none',
  padding: '13px 26px',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
};

/** Warme Fläche für Fakten ohne Termin (Löschdatum, neue Adresse). */
export const infoBox: CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  margin: '0 0 24px',
  padding: '16px 20px',
};

export const quote: CSSProperties = {
  borderLeft: `3px solid ${colors.primary}`,
  margin: '0 0 20px',
  padding: '2px 0 2px 14px',
};

export const quoteText: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.65,
  color: colors.text,
  whiteSpace: 'pre-line',
};
