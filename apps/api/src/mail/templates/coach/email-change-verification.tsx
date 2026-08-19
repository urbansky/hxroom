import { MailLayout } from '../layout';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
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
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        du hast diese Adresse als neue Anmelde-Adresse für dein HxRoom-Konto angegeben und die
        Änderung über dein bisheriges Postfach bereits freigegeben. Ein letzter Klick, dann ist
        der Wechsel abgeschlossen.
      </Paragraph>
      <PrimaryButton href={verifyUrl}>Neue Adresse bestätigen</PrimaryButton>
      <Footnote>
        Ab dann meldest du dich mit dieser Adresse an.
        <br />
        Der Link ist 24 Stunden gültig.
      </Footnote>
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
