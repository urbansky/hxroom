import { MailLayout } from '../layout';
import { Field, Greeting, Label, Quote } from '../_components/blocks';
import { renderEmail } from '../../render';

interface FeedbackReceivedEmailProps {
  categoryLabel: string;
  coachName: string;
  coachEmail: string;
  subdomain: string | null;
  message: string;
  page: string;
  userAgent: string | null;
  receivedAtLabel: string;
}

// Meldung an den Betreiber, wenn ein Coach den Feedback-Knopf benutzt. Antwortadresse ist
// der Coach (replyTo im FeedbackService), deshalb kein eigener Link zum Antworten.
export default function FeedbackReceivedEmail(props: FeedbackReceivedEmailProps) {
  return (
    <MailLayout preview={`${props.categoryLabel} von ${props.coachName}`}>
      <Greeting>{`Neues Feedback: ${props.categoryLabel}`}</Greeting>
      <Label>Nachricht</Label>
      <Quote>{props.message}</Quote>
      <Field label="Coach">
        {props.coachName} ({props.coachEmail}){props.subdomain ? ` · ${props.subdomain}` : ''}
      </Field>
      <Field label="Seite">{props.page}</Field>
      <Field label="Browser">{props.userAgent ?? 'unbekannt'}</Field>
      <Field label="Eingegangen">{props.receivedAtLabel}</Field>
    </MailLayout>
  );
}

FeedbackReceivedEmail.PreviewProps = {
  categoryLabel: 'Problem',
  coachName: 'Anna Bergmann',
  coachEmail: 'anna@example.com',
  subdomain: 'anna',
  message: 'Beim Hochladen einer Datei im Call passiert nichts.\nEs kommt keine Fehlermeldung.',
  page: '/call/b-123',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36',
  receivedAtLabel: 'Freitag, 16. Oktober 2026, 14:32',
} satisfies FeedbackReceivedEmailProps;

export async function renderFeedbackReceivedEmail(props: FeedbackReceivedEmailProps): Promise<string> {
  return renderEmail(<FeedbackReceivedEmail {...props} />);
}
