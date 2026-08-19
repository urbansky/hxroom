import { Link } from '@react-email/components';
import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Greeting, Label, Paragraph, PrimaryButton, Quote } from '../_components/blocks';
import { link, value } from '../_components/styles';
import { renderEmail } from '../../render';

interface BookingCancelledByClientEmailProps {
  coachName: string;
  clientName: string;
  clientEmail: string;
  appointment: AppointmentInfo;
  /** Optionaler Grund des Klienten – wird nur angezeigt, wenn er einen angegeben hat. */
  reason?: string | null;
  bookingsUrl: string;
}

// Benachrichtigung an den Coach, wenn ein Klient seinen Termin über den Link aus der
// Bestätigungsmail selbst absagt (doc/funktionen/backoffice-coach.md 2.06). Der Slot ist
// zu diesem Zeitpunkt bereits wieder frei – diese Mail ist der einzige aktive Hinweis
// darauf, dass eine Lücke im Kalender entstanden ist.
export default function BookingCancelledByClientEmail({
  coachName,
  clientName,
  clientEmail,
  appointment,
  reason,
  bookingsUrl,
}: BookingCancelledByClientEmailProps) {
  return (
    <MailLayout preview={`${clientName} hat den Termin am ${appointment.dayLabel}, ${appointment.timeRangeLabel} abgesagt`}>
      <Greeting>Hallo {coachName},</Greeting>
      <Paragraph>
        {clientName} hat den folgenden Termin abgesagt. Der Zeitpunkt ist auf deiner
        Buchungsseite wieder frei.
      </Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={clientName}
        meta={`${appointment.durationMinutes} Min. · ${appointment.offerName}`}
        cancelled
      />

      {reason ? (
        <>
          <Label>Grund</Label>
          <Quote>{reason}</Quote>
        </>
      ) : (
        <Paragraph>Einen Grund hat {clientName} nicht angegeben.</Paragraph>
      )}

      <Label>Klient</Label>
      <Paragraph style={{ ...value, margin: '0 0 24px' }}>
        {clientName}
        <br />
        <Link href={`mailto:${clientEmail}`} style={link}>
          {clientEmail}
        </Link>
      </Paragraph>

      <PrimaryButton href={bookingsUrl}>Zu deinen Buchungen</PrimaryButton>
    </MailLayout>
  );
}

BookingCancelledByClientEmail.PreviewProps = {
  coachName: 'Anna Bergmann',
  clientName: 'Max Mustermann',
  clientEmail: 'max@example.com',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 10:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  reason: 'Ich bin an dem Tag leider krank geworden.',
  bookingsUrl: 'https://app.hxroom.de/bookings',
} satisfies BookingCancelledByClientEmailProps;

export async function renderBookingCancelledByClientEmail(props: BookingCancelledByClientEmailProps): Promise<string> {
  return renderEmail(<BookingCancelledByClientEmail {...props} />);
}
