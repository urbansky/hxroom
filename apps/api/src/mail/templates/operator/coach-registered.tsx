import { MailLayout } from '../layout';
import { Field, Footnote, Greeting, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface CoachRegisteredEmailProps {
  coachName: string;
  coachEmail: string;
  subdomain: string;
  registeredAtLabel: string;
  coachesUrl: string;
}

// Meldung an jeden Betreiber, sobald sich ein Coach selbst registriert (SignupNotifier).
// Verschickt wird beim Absenden des Formulars – die Adresse ist da noch unbestätigt.
export default function CoachRegisteredEmail(props: CoachRegisteredEmailProps) {
  return (
    <MailLayout preview={`${props.coachName} hat sich bei HxRoom registriert`}>
      <Greeting>Neuer Coach registriert</Greeting>
      <Field label="Name">{props.coachName}</Field>
      <Field label="E-Mail">{props.coachEmail}</Field>
      <Field label="Subdomain">{props.subdomain}</Field>
      <Field label="Registriert">{props.registeredAtLabel}</Field>
      <PrimaryButton href={props.coachesUrl}>Zur Coach-Liste</PrimaryButton>
      <Footnote>
        Die E-Mail-Adresse ist zu diesem Zeitpunkt noch nicht bestätigt. Ob der Coach den
        Bestätigungslink geöffnet hat, zeigt die Coach-Liste im Backoffice.
      </Footnote>
    </MailLayout>
  );
}

CoachRegisteredEmail.PreviewProps = {
  coachName: 'Anna Bergmann',
  coachEmail: 'anna@example.com',
  subdomain: 'anna-bergmann',
  registeredAtLabel: 'Mittwoch, 25. November 2026, 10:14',
  coachesUrl: 'https://admin.hxroom.de/coaches',
} satisfies CoachRegisteredEmailProps;

export async function renderCoachRegisteredEmail(props: CoachRegisteredEmailProps): Promise<string> {
  return renderEmail(<CoachRegisteredEmail {...props} />);
}
