import { Button, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface DeletionReminderEmailProps {
  name: string;
  deletionDateLabel: string;
  daysLeft: number;
  accountUrl: string;
}

// Letzte Erinnerung vor der endgültigen Löschung (DeletionReminderService).
// Ohne sie wäre die 30-Tage-Frist eine Falle: wer den Antrag stellt und ihn vergisst, hätte
// keinen weiteren Anlass, sich vor dem Datenverlust noch einmal zu entscheiden.
export default function DeletionReminderEmail({ name, deletionDateLabel, daysLeft, accountUrl }: DeletionReminderEmailProps) {
  return (
    <MailLayout preview={`Letzte Erinnerung: Dein HxRoom-Konto wird am ${deletionDateLabel} gelöscht.`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        dies ist eine Erinnerung an die von dir beantragte Löschung deines HxRoom-Kontos.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          Noch <strong>{`${daysLeft} Tage`}</strong>
          <br />
          Endgültige Löschung am <strong>{deletionDateLabel}</strong>
        </Text>
      </Section>
      <Text style={{ margin: '0 0 28px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Danach sind dein Konto, deine Klienten, alle Termine und deine Buchungsseite
        unwiderruflich gelöscht. Möchtest du bleiben, nimm die Löschung jetzt zurück.
      </Text>
      <Button
        href={accountUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Löschung zurücknehmen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Möchtest du deine Daten behalten, sichere sie bitte vor dem {deletionDateLabel}.
      </Text>
    </MailLayout>
  );
}

DeletionReminderEmail.PreviewProps = {
  name: 'Anna Bergmann',
  deletionDateLabel: '16. September 2026',
  daysLeft: 7,
  accountUrl: 'https://app.hxroom.de/settings/account',
} satisfies DeletionReminderEmailProps;

export async function renderDeletionReminderEmail(props: DeletionReminderEmailProps): Promise<string> {
  return renderEmail(<DeletionReminderEmail {...props} />);
}
