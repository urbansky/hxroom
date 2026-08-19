import { MailLayout } from '../layout';
import { Footnote, Greeting, InfoBox, InfoText, Paragraph } from '../_components/blocks';
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
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        wie von dir beantragt haben wir dein HxRoom-Konto und alle zugehörigen Daten gelöscht.
      </Paragraph>
      <InfoBox>
        <InfoText>
          Gelöscht: <strong>{clientCount}</strong> Klientenprofile, <strong>{bookingCount}</strong> Termine,
          deine Angebote, Verfügbarkeiten, Buchungsseite und hochgeladenen Dateien.
        </InfoText>
      </InfoBox>
      <Paragraph>
        Deine Subdomain ist freigegeben, noch offene Termine wurden abgesagt und die
        betroffenen Klienten benachrichtigt.
      </Paragraph>
      <Footnote>
        Aus Nachweisgründen behalten wir einen Löschvermerk ohne personenbezogene Daten – nur
        Kennungen, Zeitpunkt und Anzahl der gelöschten Datensätze.
        <br />
        Danke, dass du HxRoom genutzt hast. Du bist jederzeit willkommen zurück.
      </Footnote>
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
