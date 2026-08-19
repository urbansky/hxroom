import { MailLayout } from '../layout';
import { Footnote, Greeting, InfoBox, InfoText, Paragraph, PrimaryButton } from '../_components/blocks';
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
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        du hast die Löschung deines HxRoom-Kontos beantragt. Wir haben sie vorgemerkt:
      </Paragraph>
      <InfoBox>
        <InfoText>
          Endgültige Löschung am <strong>{deletionDateLabel}</strong>
        </InfoText>
      </InfoBox>
      <Paragraph>
        Deine öffentliche Buchungsseite ist ab jetzt offline, neue Buchungen sind nicht mehr
        möglich. Bereits vereinbarte Termine bleiben bestehen; sie werden erst mit der
        endgültigen Löschung abgesagt, und deine Klienten erhalten dann eine Nachricht.
      </Paragraph>
      <Paragraph>
        Bis dahin kannst du dich normal anmelden und die Löschung jederzeit zurücknehmen –
        alles ist dann wieder wie vorher.
      </Paragraph>
      <PrimaryButton href={accountUrl}>Löschung zurücknehmen</PrimaryButton>
      <Footnote>
        Kommt der Antrag nicht von dir, nimm ihn über den Button zurück und ändere dein
        Passwort. Nach dem {deletionDateLabel} sind Konto, Klienten, Termine und Buchungsseite
        endgültig gelöscht und lassen sich nicht wiederherstellen.
      </Footnote>
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
