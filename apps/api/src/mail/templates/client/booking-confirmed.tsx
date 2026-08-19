import { Link } from '@react-email/components';
import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph } from '../_components/blocks';
import { link } from '../_components/styles';
import { renderEmail } from '../../render';

interface BookingConfirmedEmailProps {
  clientName: string;
  coachName: string;
  appointment: AppointmentInfo;
  /**
   * Link zur Selbstabsage. `null`, wenn die Organisation keinen Slug hat und es damit
   * keine Klienten-Subdomain gibt – dann bleibt nur der Weg über eine Antwortmail.
   */
  cancelUrl: string | null;
}

// Geht raus, sobald der Klient den Bestätigungslink geklickt hat und die Buchung final
// ist. Bewusst ohne Haupt-Button: der Zugang zum Warteraum kommt später über die
// Erinnerungsmails (siehe doc/technisches-konzept.md, reminderJobs). Der Absage-Link
// steht deshalb dezent im Fußtext – er ist der einzige Selfservice, den der Klient hat.
export default function BookingConfirmedEmail({ clientName, coachName, appointment, cancelUrl }: BookingConfirmedEmailProps) {
  return (
    <MailLayout preview={`Dein Termin steht: ${appointment.offerName}, ${appointment.dayLabel}, ${appointment.timeRangeLabel}`}>
      <Greeting>Hallo {clientName},</Greeting>
      <Paragraph>dein Termin bei {coachName} ist bestätigt und fest reserviert.</Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min. · bei ${coachName}`}
      />
      <Paragraph style={{ margin: 0 }}>
        Im Anhang dieser E-Mail findest du den Termin als Kalendereintrag – ein Klick, und er steht in deinem Kalender.
      </Paragraph>
      {cancelUrl ? (
        <Footnote>
          Du kannst den Termin nicht wahrnehmen?{' '}
          <Link href={cancelUrl} style={link}>
            Termin absagen
          </Link>
          . Bei allen anderen Fragen antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
        </Footnote>
      ) : (
        <Footnote>
          Du hast eine Frage oder musst den Termin absagen? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
        </Footnote>
      )}
    </MailLayout>
  );
}

BookingConfirmedEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 10:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  cancelUrl: 'https://anna.hxroom.de/cancel/b-123?token=abc',
} satisfies BookingConfirmedEmailProps;

export async function renderBookingConfirmedEmail(props: BookingConfirmedEmailProps): Promise<string> {
  return renderEmail(<BookingConfirmedEmail {...props} />);
}
