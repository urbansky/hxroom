import { Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface BookingConfirmedEmailProps {
  clientName: string;
  coachName: string;
  offerName: string;
  dayTimeLabel: string;
  durationMinutes: number;
}

// Geht raus, sobald der Klient den Bestätigungslink geklickt hat und die Buchung final
// ist. Bewusst ohne Button: der Zugang zum Warteraum kommt später über die
// Erinnerungsmails (siehe doc/technisches-konzept.md, reminderJobs).
export default function BookingConfirmedEmail({ clientName, coachName, offerName, dayTimeLabel, durationMinutes }: BookingConfirmedEmailProps) {
  return (
    <MailLayout preview={`Dein Termin steht: ${offerName}, ${dayTimeLabel}`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {clientName},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        dein Termin bei {coachName} ist bestätigt und fest reserviert.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7 }}>
          <strong>{offerName}</strong>
          <br />
          {dayTimeLabel}
          <br />
          {`Dauer: ${durationMinutes} Minuten`}
        </Text>
      </Section>
      <Text style={{ margin: '0 0 8px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        Im Anhang dieser E-Mail findest du den Termin als Kalendereintrag – ein Klick, und er steht in deinem Kalender.
      </Text>
      <Text style={{ margin: '24px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Du hast eine Frage oder musst den Termin absagen? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
      </Text>
    </MailLayout>
  );
}

BookingConfirmedEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  offerName: 'Coaching-Sitzung',
  dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
  durationMinutes: 60,
} satisfies BookingConfirmedEmailProps;

export async function renderBookingConfirmedEmail(props: BookingConfirmedEmailProps): Promise<string> {
  return renderEmail(<BookingConfirmedEmail {...props} />);
}
