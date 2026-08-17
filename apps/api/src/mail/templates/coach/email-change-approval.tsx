import { Button, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
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
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        für dein HxRoom-Konto wurde eine neue E-Mail-Adresse angefragt:
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          <strong>{newEmail}</strong>
        </Text>
      </Section>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Gib die Änderung frei, wenn sie von dir kommt. Danach schicken wir eine
        Bestätigungsmail an die neue Adresse – erst mit deren Bestätigung wird der Wechsel
        wirksam.
      </Text>
      <Button
        href={approveUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Änderung freigeben
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Kommt die Anfrage nicht von dir, klicke den Link <strong>nicht</strong> an. Deine
        Adresse bleibt dann unverändert. Ändere in diesem Fall zur Sicherheit dein Passwort.
      </Text>
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
