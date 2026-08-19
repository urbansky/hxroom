import { MailLayout } from '../layout';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface EmailVerificationEmailProps {
  name: string;
  verifyUrl: string;
}

export default function EmailVerificationEmail({ name, verifyUrl }: EmailVerificationEmailProps) {
  return (
    <MailLayout preview="Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.">
      <Greeting>Willkommen, {name}!</Greeting>
      <Paragraph>
        Bitte bestätige deine E-Mail-Adresse, um dein HxRoom-Konto zu aktivieren.
      </Paragraph>
      <PrimaryButton href={verifyUrl}>E-Mail bestätigen</PrimaryButton>
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
} satisfies EmailVerificationEmailProps;

export async function renderEmailVerificationEmail(props: EmailVerificationEmailProps): Promise<string> {
  return renderEmail(<EmailVerificationEmail {...props} />);
}
