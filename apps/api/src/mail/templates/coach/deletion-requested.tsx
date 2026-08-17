import { Button, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface DeletionRequestedEmailProps {
  name: string;
  /** Tag der endgültigen Löschung, z. B. "16. September 2026". */
  deletionDateLabel: string;
  accountUrl: string;
}

// Geht raus, sobald der Coach die Löschung auf /settings/account beantragt.
// Sicherheitsrelevant: auch wenn jemand anders den Antrag gestellt hätte, erfährt der Coach
// davon und hat 30 Tage Zeit, ihn zurückzunehmen.
export default function DeletionRequestedEmail({ name, deletionDateLabel, accountUrl }: DeletionRequestedEmailProps) {
  return (
    <MailLayout preview={`Dein HxRoom-Konto wird am ${deletionDateLabel} gelöscht.`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        du hast die Löschung deines HxRoom-Kontos beantragt. Wir haben sie vorgemerkt:
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          Endgültige Löschung am <strong>{deletionDateLabel}</strong>
        </Text>
      </Section>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Deine öffentliche Buchungsseite ist ab jetzt offline, neue Buchungen sind nicht mehr
        möglich. Bereits vereinbarte Termine bleiben bestehen; sie werden erst mit der
        endgültigen Löschung abgesagt, und deine Klienten erhalten dann eine Nachricht.
      </Text>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Bis dahin kannst du dich normal anmelden und die Löschung jederzeit zurücknehmen –
        alles ist dann wieder wie vorher.
      </Text>
      <Button
        href={accountUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Löschung zurücknehmen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Kommt der Antrag nicht von dir, nimm ihn über den Button zurück und ändere dein
        Passwort. Nach dem {deletionDateLabel} sind Konto, Klienten, Termine und Buchungsseite
        endgültig gelöscht und lassen sich nicht wiederherstellen.
      </Text>
    </MailLayout>
  );
}

DeletionRequestedEmail.PreviewProps = {
  name: 'Anna Bergmann',
  deletionDateLabel: '16. September 2026',
  accountUrl: 'https://app.hxroom.de/settings/account',
} satisfies DeletionRequestedEmailProps;

export async function renderDeletionRequestedEmail(props: DeletionRequestedEmailProps): Promise<string> {
  return renderEmail(<DeletionRequestedEmail {...props} />);
}
