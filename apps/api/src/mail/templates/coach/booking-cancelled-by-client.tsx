import { Button, Link, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface BookingCancelledByClientEmailProps {
  coachName: string;
  clientName: string;
  clientEmail: string;
  offerName: string;
  dayTimeLabel: string;
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
  offerName,
  dayTimeLabel,
  reason,
  bookingsUrl,
}: BookingCancelledByClientEmailProps) {
  return (
    <MailLayout preview={`${clientName} hat den Termin am ${dayTimeLabel} abgesagt`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {coachName},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        {clientName} hat den folgenden Termin abgesagt. Der Zeitpunkt ist auf deiner
        Buchungsseite wieder frei.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7, textDecoration: 'line-through' }}>
          <strong>{offerName}</strong>
          <br />
          {dayTimeLabel}
        </Text>
      </Section>

      {reason ? (
        <>
          <Text style={{ margin: '0 0 6px', fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Grund
          </Text>
          <Section style={{ borderLeft: '3px solid #8B9E8A', margin: '0 0 24px', padding: '2px 0 2px 14px' }}>
            <Text style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{reason}</Text>
          </Section>
        </>
      ) : (
        <Text style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
          Einen Grund hat {clientName} nicht angegeben.
        </Text>
      )}

      <Text style={{ margin: '0 0 6px', fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Klient
      </Text>
      <Text style={{ margin: '0 0 24px', fontSize: 14, color: '#333', lineHeight: 1.5 }}>
        {clientName}
        <br />
        <Link href={`mailto:${clientEmail}`} style={{ color: '#6d8069' }}>
          {clientEmail}
        </Link>
      </Text>

      <Button
        href={bookingsUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Zu deinen Buchungen
      </Button>
    </MailLayout>
  );
}

BookingCancelledByClientEmail.PreviewProps = {
  coachName: 'Anna Bergmann',
  clientName: 'Max Mustermann',
  clientEmail: 'max@example.com',
  offerName: 'Coaching-Sitzung',
  dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
  reason: 'Ich bin an dem Tag leider krank geworden.',
  bookingsUrl: 'https://app.hxroom.de/bookings',
} satisfies BookingCancelledByClientEmailProps;

export async function renderBookingCancelledByClientEmail(props: BookingCancelledByClientEmailProps): Promise<string> {
  return renderEmail(<BookingCancelledByClientEmail {...props} />);
}
