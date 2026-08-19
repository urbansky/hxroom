import { Button, Column, Row, Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';
import * as styles from './styles';

// Die wiederkehrenden Bausteine der Mails an einem Ort: vorher stand jeder dieser Styles
// als Inline-Literal in jedem einzelnen Template.

/** Serif-Anrede am Anfang jeder Mail. */
export function Greeting({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Paragraph({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={{ ...styles.paragraph, ...style }}>{children}</Text>;
}

/** Dezenter Schlussabsatz (Gültigkeitsdauer, Absage-Hinweis, Rückfragen). */
export function Footnote({ children }: { children: ReactNode }) {
  return <Text style={styles.footnote}>{children}</Text>;
}

/**
 * Warme Fläche für Fakten ohne Termin – Löschdatum, neue Adresse, Zählwerte.
 *
 * Row/Column statt Section, weil React Email den Style einer Section auf das <table>
 * legt und die Word-Engine von Outlook Padding auf Tabellen ignoriert.
 */
export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <Row style={{ borderCollapse: 'separate', margin: '0 0 24px' }}>
      <Column style={styles.infoBox}>{children}</Column>
    </Row>
  );
}

export function InfoText({ children }: { children: ReactNode }) {
  return <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: styles.colors.text }}>{children}</Text>;
}

/** Kleines Uppercase-Label über einem Zitat oder Block. */
export function Label({ children }: { children: ReactNode }) {
  return <Text style={{ ...styles.label, margin: '0 0 6px' }}>{children}</Text>;
}

/** Label-Wert-Paar für die Kontaktdaten in den Coach-Mails. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{children}</Text>
    </>
  );
}

/** Zitierter Freitext des Klienten (Nachricht zur Buchung, Absagegrund). */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <Row style={{ borderCollapse: 'separate', margin: '0 0 20px' }}>
      <Column style={styles.quote}>
        <Text style={styles.quoteText}>{children}</Text>
      </Column>
    </Row>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button href={href} style={styles.button}>
      {children}
    </Button>
  );
}
