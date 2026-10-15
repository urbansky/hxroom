import { Body, Column, Container, Head, Html, Link, Preview, Row, Text } from 'react-email';
import type { ReactNode } from 'react';
import { colors, fonts } from './_components/styles';

/**
 * Impressum und Datenschutzerklärung der Buchungsseite, unter jeder Mail an Klienten: Diese
 * Mails gehen im Namen des Coachs hinaus (doc/legal.md §3.2). Aufgebaut in booking-urls.ts.
 */
export interface MailLegalLinks {
  imprintUrl: string;
  privacyUrl?: string;
}

interface MailLayoutProps {
  preview: string;
  children: ReactNode;
  /** Nur bei Mails an Klienten; Mails an Coachs kommen von HxRoom selbst. */
  legalLinks?: MailLegalLinks | null;
}

const legalLinkStyle = { color: colors.muted, textDecoration: 'underline', textUnderlineOffset: '2px' };

// Gemeinsames Grundgerüst für alle HxRoom-Mails, bewusst wie eine Seite der Coach-App
// gebaut: warmer Hintergrund, links darüber die Wortmarke, darunter eine weiße Karte mit
// Hairline-Rand und großem Radius (siehe SettingsSection.vue). Kein Bild-Asset – die
// Wortmarke bleibt Text, damit sie ohne Bilder-Freigabe und in jedem Client erscheint.
//
// Karte als Row/Column, nicht als Section: React Email legt den Style einer Section auf
// das <table>, und die Word-Engine von Outlook ignoriert Padding auf Tabellen – der Text
// würde dort am Rand kleben. Auf einer <td> (= Column) hält jeder Client Padding,
// Hintergrund und Rand; nur den Radius lässt Word weg.
export function MailLayout({ preview, children, legalLinks }: MailLayoutProps) {
  return (
    <Html lang="de">
      <Head>
        {/* Ohne diese Angaben invertiert Apple Mail die Palette im Dark Mode selbst und
            zerlegt dabei die warmen Töne. */}
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      {/* `lang` gehört hier wiederholt, obwohl <Html lang="de"> es schon setzt: react-email
          schreibt sonst ein eigenes lang="en" auf <body> und die Karten-<td>. */}
      <Body lang="de" style={{ margin: 0, padding: '40px 16px', backgroundColor: colors.pageBg, fontFamily: fonts.sans }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ margin: '0 0 16px 4px', fontSize: 22, lineHeight: 1.2, color: colors.wordmark, letterSpacing: '0.02em' }}>
            HxRoom
          </Text>
          <Row style={{ borderCollapse: 'separate' }}>
            <Column
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 24,
                padding: '32px',
              }}
            >
              {children}
            </Column>
          </Row>
          {legalLinks ? (
            <Text style={{ margin: '16px 4px 0', fontSize: 12, lineHeight: 1.5, color: colors.muted }}>
              <Link href={legalLinks.imprintUrl} style={legalLinkStyle}>Impressum</Link>
              {legalLinks.privacyUrl ? (
                <>
                  {' · '}
                  <Link href={legalLinks.privacyUrl} style={legalLinkStyle}>Datenschutz</Link>
                </>
              ) : null}
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
