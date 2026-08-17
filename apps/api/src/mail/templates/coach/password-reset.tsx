import { Button, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

// Geht raus über emailAndPassword.sendResetPassword (auth.module.ts), ausgelöst von
// /auth/forgot-password in der Coach-App. Der Link führt auf die API, die zu
// /auth/reset-password?token=… weiterleitet.
export default function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <MailLayout preview="Setze dein HxRoom-Passwort zurück.">
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        du hast ein neues Passwort für dein HxRoom-Konto angefordert. Über den Button unten
        kannst du es setzen.
      </Text>
      <Button
        href={resetUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Neues Passwort setzen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Der Link ist eine Stunde gültig und lässt sich nur einmal verwenden.
        <br />
        Hast du kein neues Passwort angefordert, kannst du diese E-Mail ignorieren – dein
        bisheriges Passwort bleibt unverändert gültig.
      </Text>
    </MailLayout>
  );
}

PasswordResetEmail.PreviewProps = {
  name: 'Anna Bergmann',
  resetUrl: 'https://api.hxroom.de/api/auth/reset-password/preview',
} satisfies PasswordResetEmailProps;

export async function renderPasswordResetEmail(props: PasswordResetEmailProps): Promise<string> {
  return renderEmail(<PasswordResetEmail {...props} />);
}
