import { MailLayout } from '../layout';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
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
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        du hast ein neues Passwort für dein HxRoom-Konto angefordert. Über den Button unten
        kannst du es setzen.
      </Paragraph>
      <PrimaryButton href={resetUrl}>Neues Passwort setzen</PrimaryButton>
      <Footnote>
        Der Link ist eine Stunde gültig und lässt sich nur einmal verwenden.
        <br />
        Hast du kein neues Passwort angefordert, kannst du diese E-Mail ignorieren – dein
        bisheriges Passwort bleibt unverändert gültig.
      </Footnote>
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
