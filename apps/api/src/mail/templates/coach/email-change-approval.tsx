import { MailLayout } from '../layout';
import { Footnote, Greeting, InfoBox, InfoText, Paragraph, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface EmailChangeApprovalEmailProps {
  name: string;
  /** Die Adresse, auf die gewechselt werden soll. */
  newEmail: string;
  approveUrl: string;
}

// Schritt 1 von 2 des E-Mail-Wechsels (user.changeEmail.sendChangeEmailConfirmation in
// auth.module.ts). Geht bewusst an die BISHERIGE Adresse: sie muss den Wechsel freigeben,
// damit eine übernommene Session das Konto nicht stillschweigend entwenden kann. Erst nach
// diesem Klick erhält die neue Adresse ihre Verifizierungsmail (email-change-verification).
export default function EmailChangeApprovalEmail({ name, newEmail, approveUrl }: EmailChangeApprovalEmailProps) {
  return (
    <MailLayout preview="Bitte gib die Änderung deiner E-Mail-Adresse frei.">
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        für dein HxRoom-Konto wurde eine neue E-Mail-Adresse angefragt:
      </Paragraph>
      <InfoBox>
        <InfoText>
          <strong>{newEmail}</strong>
        </InfoText>
      </InfoBox>
      <Paragraph>
        Gib die Änderung frei, wenn sie von dir kommt. Danach schicken wir eine
        Bestätigungsmail an die neue Adresse – erst mit deren Bestätigung wird der Wechsel
        wirksam.
      </Paragraph>
      <PrimaryButton href={approveUrl}>Änderung freigeben</PrimaryButton>
      <Footnote>
        Kommt die Anfrage nicht von dir, klicke den Link <strong>nicht</strong> an. Deine
        Adresse bleibt dann unverändert. Ändere in diesem Fall zur Sicherheit dein Passwort.
      </Footnote>
    </MailLayout>
  );
}

EmailChangeApprovalEmail.PreviewProps = {
  name: 'Anna Bergmann',
  newEmail: 'anna@neue-praxis.de',
  approveUrl: 'https://api.hxroom.de/api/auth/verify-email?token=preview',
} satisfies EmailChangeApprovalEmailProps;

export async function renderEmailChangeApprovalEmail(props: EmailChangeApprovalEmailProps): Promise<string> {
  return renderEmail(<EmailChangeApprovalEmail {...props} />);
}
