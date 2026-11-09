import { Link } from 'react-email';
import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Field, Footnote, Greeting, Label, Paragraph, PrimaryButton, Quote } from '../_components/blocks';
import { link } from '../_components/styles';
import { renderEmail } from '../../render';

/** Vorausgefüllte Eintragsseiten der Kalenderanbieter (mail/coach-calendar.ts). */
export interface CalendarLinks {
  google: string;
  outlookWork: string;
  outlookPersonal: string;
}

interface BookingNotificationEmailProps {
  coachName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientNote?: string | null;
  appointment: AppointmentInfo;
  bookingsUrl: string;
  /** Links zum Eintragen; die Kalenderdatei hängt zusätzlich an der Mail. */
  calendarLinks?: CalendarLinks;
}

// Benachrichtigung an den Coach, sobald ein Klient seine Buchung bestätigt hat
// (doc/produkt/funktionen/backoffice-coach.md 7.06). Enthält bewusst die vollständigen
// Kontaktdaten: für die Klientendaten ist der Coach der Verantwortliche im Sinne der
// DSGVO (doc/recht/legal.md §1/§2), HxRoom nur Auftragsverarbeiter.
//
// Der Termin-Block ist wie im Dashboard aufgebaut: Klientenname als Titel, Angebot in der
// Meta-Zeile – dieselbe Zeile, die der Coach in seiner Agenda sieht.
export default function BookingNotificationEmail({
  coachName,
  clientName,
  clientEmail,
  clientPhone,
  clientNote,
  appointment,
  bookingsUrl,
  calendarLinks,
}: BookingNotificationEmailProps) {
  return (
    <MailLayout preview={`Neue Buchung: ${clientName}, ${appointment.dayLabel}, ${appointment.timeRangeLabel}`}>
      <Greeting>Hallo {coachName},</Greeting>
      <Paragraph>{clientName} hat einen Termin gebucht und bestätigt.</Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={clientName}
        meta={`${appointment.durationMinutes} Min. · ${appointment.offerName}`}
      />

      <Field label="Klient">{clientName}</Field>

      <Field label="E-Mail">
        <Link href={`mailto:${clientEmail}`} style={link}>
          {clientEmail}
        </Link>
      </Field>

      {clientPhone ? <Field label="Telefon">{clientPhone}</Field> : null}

      {clientNote ? (
        <>
          <Label>Nachricht</Label>
          <Quote>{clientNote}</Quote>
        </>
      ) : null}

      <PrimaryButton href={bookingsUrl}>Zu deinen Buchungen</PrimaryButton>

      {/* Sofort in den eigenen Kalender (kalenderabgleich.md §4) – für die Zeit, bis ein
          abonnierter Feed nachgeladen hat. Die angehängte Datei deckt Apple Kalender ab. */}
      {calendarLinks ? (
        <Footnote>
          In deinen Kalender eintragen:{' '}
          <Link href={calendarLinks.google} style={link}>Google Kalender</Link>
          {' · '}
          <Link href={calendarLinks.outlookWork} style={link}>Outlook (Microsoft 365)</Link>
          {' · '}
          <Link href={calendarLinks.outlookPersonal} style={link}>Outlook.com</Link>
          {' · '}
          oder die angehängte Kalenderdatei öffnen. Nutzt du das Kalender-Abo von HxRoom,
          erscheint der Termin dort ohnehin.
        </Footnote>
      ) : null}
    </MailLayout>
  );
}

BookingNotificationEmail.PreviewProps = {
  coachName: 'Anna Bergmann',
  clientName: 'Max Mustermann',
  clientEmail: 'max@example.com',
  clientPhone: '+49 170 1234567',
  clientNote: 'Ich würde gern über den Wechsel in meine neue Rolle sprechen.',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 10:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  bookingsUrl: 'https://app.hxroom.de/bookings',
  calendarLinks: {
    google: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    outlookWork: 'https://outlook.office.com/calendar/0/deeplink/compose',
    outlookPersonal: 'https://outlook.live.com/calendar/0/deeplink/compose',
  },
} satisfies BookingNotificationEmailProps;

export async function renderBookingNotificationEmail(props: BookingNotificationEmailProps): Promise<string> {
  return renderEmail(<BookingNotificationEmail {...props} />);
}
