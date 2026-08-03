import { Button, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface EmailVerificationEmailProps {
  name: string;
  verifyUrl: string;
}

export default function EmailVerificationEmail({ name, verifyUrl }: EmailVerificationEmailProps) {
  return (
    <MailLayout preview="Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.">
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Willkommen, {name}!
      </Text>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.
      </Text>
      <Button
        href={verifyUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        E-Mail bestätigen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
        <br />
        Der Link ist 24 Stunden gültig.
      </Text>
    </MailLayout>
  );
}

EmailVerificationEmail.PreviewProps = {
  name: 'Anna Bergmann',
  verifyUrl: 'https://api.hxroom.de/api/auth/verify-email?token=preview',
} satisfies EmailVerificationEmailProps;

export async function renderEmailVerificationEmail(props: EmailVerificationEmailProps): Promise<string> {
  return renderEmail(<EmailVerificationEmail {...props} />);
}
