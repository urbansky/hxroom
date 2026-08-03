import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

interface MailLayoutProps {
  preview: string;
  children: ReactNode;
}

// Gemeinsames Grundgerüst für alle HxRoom-Mails: sage-farbener Header mit Wordmark,
// weiße Content-Card. Web-Fonts sind in E-Mail-Clients unzuverlässig, daher bewusst
// nur Systemschrift-Fallbacks (DM Sans/Arial, Georgia/serif für die Wordmark).
export function MailLayout({ preview, children }: MailLayoutProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: '40px 16px', backgroundColor: '#f5f5f2', fontFamily: "'DM Sans', Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={{ backgroundColor: '#8B9E8A', padding: '28px 32px', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, color: '#fff', letterSpacing: '0.06em' }}>
              HxRoom
            </Text>
          </Section>
          <Section style={{ backgroundColor: '#fff', padding: '40px 32px', borderRadius: '0 0 8px 8px' }}>
            {children}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
