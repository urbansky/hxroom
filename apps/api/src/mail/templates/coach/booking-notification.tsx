import { Button, Link, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface BookingNotificationEmailProps {
  coachName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientNote?: string | null;
  offerName: string;
  dayTimeLabel: string;
  bookingsUrl: string;
}

const labelStyle = { margin: '0 0 2px', fontSize: 12, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.06em' };
const valueStyle = { margin: '0 0 14px', fontSize: 14, color: '#333', lineHeight: 1.5 };

// Benachrichtigung an den Coach, sobald ein Klient seine Buchung bestätigt hat
// (doc/funktionen/backoffice-coach.md 7.06). Enthält bewusst die vollständigen
// Kontaktdaten: für die Klientendaten ist der Coach der Verantwortliche im Sinne der
// DSGVO (doc/legal.md §1/§2), HxRoom nur Auftragsverarbeiter.
export default function BookingNotificationEmail({
  coachName,
  clientName,
  clientEmail,
  clientPhone,
  clientNote,
  offerName,
  dayTimeLabel,
  bookingsUrl,
}: BookingNotificationEmailProps) {
  return (
    <MailLayout preview={`Neue Buchung: ${clientName}, ${dayTimeLabel}`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {coachName},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        {clientName} hat einen Termin gebucht und bestätigt.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          <strong>{offerName}</strong>
          <br />
          {dayTimeLabel}
        </Text>
      </Section>

      <Text style={labelStyle}>Klient</Text>
      <Text style={valueStyle}>{clientName}</Text>

      <Text style={labelStyle}>E-Mail</Text>
      <Text style={valueStyle}>
        <Link href={`mailto:${clientEmail}`} style={{ color: '#6d8069' }}>
          {clientEmail}
        </Link>
      </Text>

      {clientPhone ? (
        <>
          <Text style={labelStyle}>Telefon</Text>
          <Text style={valueStyle}>{clientPhone}</Text>
        </>
      ) : null}

      {clientNote ? (
        <>
          <Text style={labelStyle}>Nachricht</Text>
          <Section style={{ borderLeft: '3px solid #8B9E8A', margin: '0 0 20px', padding: '2px 0 2px 14px' }}>
            <Text style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{clientNote}</Text>
          </Section>
        </>
      ) : null}

      <Button
        href={bookingsUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15, marginTop: 8 }}
      >
        Zu deinen Buchungen
      </Button>
    </MailLayout>
  );
}

BookingNotificationEmail.PreviewProps = {
  coachName: 'Anna Bergmann',
  clientName: 'Max Mustermann',
  clientEmail: 'max@example.com',
  clientPhone: '+49 170 1234567',
  clientNote: 'Ich würde gern über den Wechsel in meine neue Rolle sprechen.',
  offerName: 'Coaching-Sitzung',
  dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
  bookingsUrl: 'https://app.hxroom.de/bookings',
} satisfies BookingNotificationEmailProps;

export async function renderBookingNotificationEmail(props: BookingNotificationEmailProps): Promise<string> {
  return renderEmail(<BookingNotificationEmail {...props} />);
}
