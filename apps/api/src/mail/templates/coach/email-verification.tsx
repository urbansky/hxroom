import { Link } from 'react-email';
import { MailLayout } from '../layout';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import * as styles from '../_components/styles';
import { renderEmail } from '../../render';

interface EmailVerificationEmailProps {
  name: string;
  verifyUrl: string;
  /** hxroom.de/agb und /avv: Die Vertragsbestimmungen gehören zum Vertragsschluss (§ 312i BGB). */
  termsUrl: string;
  dpaUrl: string;
}

export default function EmailVerificationEmail({ name, verifyUrl, termsUrl, dpaUrl }: EmailVerificationEmailProps) {
  return (
    <MailLayout preview="Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.">
      <Greeting>Willkommen, {name}!</Greeting>
      <Paragraph>
        Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.
      </Paragraph>
      <PrimaryButton href={verifyUrl}>E-Mail bestätigen</PrimaryButton>
      <Paragraph>
        Mit der Registrierung hast du den <Link href={termsUrl} style={styles.link}>AGB</Link> und
        dem <Link href={dpaUrl} style={styles.link}>Auftragsverarbeitungsvertrag</Link> zugestimmt.
        Beide kannst du dort jederzeit abrufen und speichern.
      </Paragraph>
      <Footnote>
        Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
        <br />
        Der Link ist 24 Stunden gültig.
      </Footnote>
    </MailLayout>
  );
}

EmailVerificationEmail.PreviewProps = {
  name: 'Anna Bergmann',
  verifyUrl: 'https://api.hxroom.de/api/auth/verify-email?token=preview',
  termsUrl: 'https://hxroom.de/agb',
  dpaUrl: 'https://hxroom.de/avv',
} satisfies EmailVerificationEmailProps;

export async function renderEmailVerificationEmail(props: EmailVerificationEmailProps): Promise<string> {
  return renderEmail(<EmailVerificationEmail {...props} />);
}
