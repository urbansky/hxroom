import { Body, Column, Container, Head, Html, Preview, Row, Text } from '@react-email/components';
import type { ReactNode } from 'react';
import { colors, fonts } from './_components/styles';

interface MailLayoutProps {
  preview: string;
  children: ReactNode;
}

// Gemeinsames Grundgerüst für alle HxRoom-Mails, bewusst wie eine Seite der Coach-App
// gebaut: warmer Hintergrund, links darüber die Wortmarke, darunter eine weiße Karte mit
// Hairline-Rand und großem Radius (siehe SettingsSection.vue). Kein Bild-Asset – die
// Wortmarke bleibt Text, damit sie ohne Bilder-Freigabe und in jedem Client erscheint.
//
// Karte als Row/Column, nicht als Section: React Email legt den Style einer Section auf
// das <table>, und die Word-Engine von Outlook ignoriert Padding auf Tabellen – der Text
// würde dort am Rand kleben. Auf einer <td> (= Column) hält jeder Client Padding,
// Hintergrund und Rand; nur den Radius lässt Word weg.
export function MailLayout({ preview, children }: MailLayoutProps) {
  return (
    <Html lang="de">
      <Head>
        {/* Ohne diese Angaben invertiert Apple Mail die Palette im Dark Mode selbst und
            zerlegt dabei die warmen Töne. */}
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: '40px 16px', backgroundColor: colors.pageBg, fontFamily: fonts.sans }}>
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
        </Container>
      </Body>
    </Html>
  );
}
