import { Button, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface EmailChangeVerificationEmailProps {
  name: string;
  verifyUrl: string;
}

// Schritt 2 von 2 des E-Mail-Wechsels, an die NEUE Adresse. better-auth ruft dafür denselben
// Handler wie bei der Registrierung auf (emailVerification.sendVerificationEmail), ohne einen
// Marker mitzugeben – auth.module.ts unterscheidet die beiden Fälle deshalb selbst und wählt
// zwischen diesem Template und email-verification.tsx. Ohne die Unterscheidung bekäme ein
// langjähriger Coach hier ein "Willkommen bei HxRoom".
export default function EmailChangeVerificationEmail({ name, verifyUrl }: EmailChangeVerificationEmailProps) {
  return (
    <MailLayout preview="Bestätige deine neue E-Mail-Adresse für HxRoom.">
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        du hast diese Adresse als neue Anmelde-Adresse für dein HxRoom-Konto angegeben und die
        Änderung über dein bisheriges Postfach bereits freigegeben. Ein letzter Klick, dann ist
        der Wechsel abgeschlossen.
      </Text>
      <Button
        href={verifyUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Neue Adresse bestätigen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Ab dann meldest du dich mit dieser Adresse an.
        <br />
        Der Link ist 24 Stunden gültig.
      </Text>
    </MailLayout>
  );
}

EmailChangeVerificationEmail.PreviewProps = {
  name: 'Anna Bergmann',
  verifyUrl: 'https://api.hxroom.de/api/auth/verify-email?token=preview',
} satisfies EmailChangeVerificationEmailProps;

export async function renderEmailChangeVerificationEmail(props: EmailChangeVerificationEmailProps): Promise<string> {
  return renderEmail(<EmailChangeVerificationEmail {...props} />);
}
