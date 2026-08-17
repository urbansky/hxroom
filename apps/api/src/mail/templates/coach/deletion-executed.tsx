import { Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface DeletionExecutedEmailProps {
  name: string;
  clientCount: number;
  bookingCount: number;
}

// Nachweis über die vollzogene Löschung (DSGVO). Wird unmittelbar VOR dem Hard-Delete
// versendet – danach ist die Adresse des Coachs nicht mehr bekannt. Kein Link und kein
// Button: es gibt kein Konto mehr, in das er führen könnte.
export default function DeletionExecutedEmail({ name, clientCount, bookingCount }: DeletionExecutedEmailProps) {
  return (
    <MailLayout preview="Dein HxRoom-Konto und alle zugehörigen Daten sind gelöscht.">
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {name},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        wie von dir beantragt haben wir dein HxRoom-Konto und alle zugehörigen Daten gelöscht.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          Gelöscht: <strong>{clientCount}</strong> Klientenprofile, <strong>{bookingCount}</strong> Termine,
          deine Angebote, Verfügbarkeiten, Buchungsseite und hochgeladenen Dateien.
        </Text>
      </Section>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Deine Subdomain ist freigegeben, noch offene Termine wurden abgesagt und die
        betroffenen Klienten benachrichtigt.
      </Text>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Aus Nachweisgründen behalten wir einen Löschvermerk ohne personenbezogene Daten – nur
        Kennungen, Zeitpunkt und Anzahl der gelöschten Datensätze.
        <br />
        Danke, dass du HxRoom genutzt hast. Du bist jederzeit willkommen zurück.
      </Text>
    </MailLayout>
  );
}

DeletionExecutedEmail.PreviewProps = {
  name: 'Anna Bergmann',
  clientCount: 24,
  bookingCount: 118,
} satisfies DeletionExecutedEmailProps;

export async function renderDeletionExecutedEmail(props: DeletionExecutedEmailProps): Promise<string> {
  return renderEmail(<DeletionExecutedEmail {...props} />);
}
