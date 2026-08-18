import { Button, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface BookingCancelledEmailProps {
  clientName: string;
  coachName: string;
  offerName: string;
  dayTimeLabel: string;
  /**
   * Wer abgesagt hat. Bei 'client' ist diese Mail die Quittung auf die eigene Absage –
   * ein „musste leider abgesagt werden" wäre dort schlicht falsch.
   */
  cancelledBy: 'coach' | 'client';
  /** Optionaler Grund des Coachs – wird nur angezeigt, wenn er einen angegeben hat. */
  reason?: string | null;
  /**
   * Link zum Neubuchen. `null`, wenn es keine Buchungsseite mehr gibt – so ist es bei der
   * Absage im Rahmen einer Kontolöschung. Ein Button auf eine abgeschaltete Subdomain würde
   * den Klienten sonst ins Leere schicken.
   */
  bookingPageUrl: string | null;
}

// Geht raus, wenn der Coach einen Termin im Backoffice absagt, wenn der Klient ihn über
// den Link aus der Bestätigungsmail selbst absagt (beides
// doc/funktionen/backoffice-coach.md 2.06) oder wenn das Coach-Konto gelöscht wird und
// noch Termine offen sind (DeletionExecutorService).
export default function BookingCancelledEmail({ clientName, coachName, offerName, dayTimeLabel, cancelledBy, reason, bookingPageUrl }: BookingCancelledEmailProps) {
  const byClient = cancelledBy === 'client';

  return (
    <MailLayout preview={byClient ? `Deine Absage für den ${dayTimeLabel} ist eingegangen` : `Dein Termin am ${dayTimeLabel} wurde abgesagt`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {clientName},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        {byClient
          ? `deine Absage ist eingegangen – der folgende Termin bei ${coachName} ist storniert. ${coachName} wurde darüber informiert.`
          : `dein Termin bei ${coachName} musste leider abgesagt werden.`}
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 24px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.7, textDecoration: 'line-through' }}>
          <strong>{offerName}</strong>
          <br />
          {dayTimeLabel}
        </Text>
      </Section>

      {/* Bei einer Selbstabsage kennt der Klient seinen Grund – ihn zurückzuspiegeln
          wäre nur Füllmaterial. Der Grund geht stattdessen an den Coach. */}
      {reason && !byClient ? (
        <>
          <Text style={{ margin: '0 0 6px', fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Grund
          </Text>
          <Section style={{ borderLeft: '3px solid #8B9E8A', margin: '0 0 24px', padding: '2px 0 2px 14px' }}>
            <Text style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{reason}</Text>
          </Section>
        </>
      ) : null}

      {bookingPageUrl ? (
        <>
          <Text style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
            Du kannst jederzeit einen neuen Termin buchen.
          </Text>
          <Button
            href={bookingPageUrl}
            style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
          >
            Neuen Termin buchen
          </Button>
          <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
            Du hast eine Frage? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
          </Text>
        </>
      ) : (
        <Text style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
          Eine Neubuchung über HxRoom ist nicht mehr möglich. Wende dich für weitere Termine
          bitte direkt an {coachName}.
        </Text>
      )}
    </MailLayout>
  );
}

BookingCancelledEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  offerName: 'Coaching-Sitzung',
  dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
  cancelledBy: 'coach',
  reason: 'Ich bin an dem Tag leider kurzfristig verhindert.',
  bookingPageUrl: 'https://anna.hxroom.de',
} satisfies BookingCancelledEmailProps;

export async function renderBookingCancelledEmail(props: BookingCancelledEmailProps): Promise<string> {
  return renderEmail(<BookingCancelledEmail {...props} />);
}
