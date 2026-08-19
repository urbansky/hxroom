import { MailLayout } from '../layout';
import { Footnote, Greeting, InfoBox, InfoText, Paragraph, PrimaryButton } from '../_components/blocks';
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
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        dies ist eine Erinnerung an die von dir beantragte Löschung deines HxRoom-Kontos.
      </Paragraph>
      <InfoBox>
        <InfoText>
          Noch <strong>{`${daysLeft} Tage`}</strong>
          <br />
          Endgültige Löschung am <strong>{deletionDateLabel}</strong>
        </InfoText>
      </InfoBox>
      <Paragraph>
        Danach sind dein Konto, deine Klienten, alle Termine und deine Buchungsseite
        unwiderruflich gelöscht. Möchtest du bleiben, nimm die Löschung jetzt zurück.
      </Paragraph>
      <PrimaryButton href={accountUrl}>Löschung zurücknehmen</PrimaryButton>
      <Footnote>
        Möchtest du deine Daten behalten, sichere sie bitte vor dem {deletionDateLabel}.
      </Footnote>
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
