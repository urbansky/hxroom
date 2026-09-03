import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface SessionInvitationEmailProps {
  clientName: string;
  coachName: string;
  appointment: AppointmentInfo;
  /** Zugang zum Warteraum – anders als sonst bereits offen, der Termin beginnt jetzt. */
  callUrl: string;
}

// Spontan-Termin (backoffice-coach.md 2.04): Der Coach hat die Sitzung eben angelegt, sie
// läuft ab sofort. Diese Mail ist deshalb kürzer als die Bestätigung – sie hat genau eine
// Aufgabe, und der Klient liest sie im Zweifel im Gehen.
//
// Kein Kalenderanhang und kein Absage-Link: Ein Termin, der jetzt beginnt, wandert in
// keinen Kalender mehr, und absagen lässt er sich ohnehin nicht (canClientCancel verlangt
// einen Beginn in der Zukunft). Bleibt die Antwort auf diese Mail, die beim Coach landet.
export default function SessionInvitationEmail({ clientName, coachName, appointment, callUrl }: SessionInvitationEmailProps) {
  return (
    <MailLayout preview={`${coachName} möchte jetzt mit dir sprechen`}>
      <Greeting>Hallo {clientName},</Greeting>
      <Paragraph>{coachName} hat gerade eine Sitzung für dich geöffnet – der Raum ist ab sofort bereit.</Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min. · bei ${coachName}`}
      />
      <PrimaryButton href={callUrl}>Zum Warteraum</PrimaryButton>
      <Paragraph style={{ margin: 0 }}>
        Du landest zuerst im Warteraum, {coachName} holt dich von dort herein.
      </Paragraph>
      <Footnote>
        Du kannst gerade nicht? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
      </Footnote>
    </MailLayout>
  );
}

SessionInvitationEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 09:30',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 30,
  },
  callUrl: 'https://anna.hxroom.de/call/b-123?token=abc',
} satisfies SessionInvitationEmailProps;

export async function renderSessionInvitationEmail(props: SessionInvitationEmailProps): Promise<string> {
  return renderEmail(<SessionInvitationEmail {...props} />);
}
