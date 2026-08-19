import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Label, Paragraph, PrimaryButton, Quote } from '../_components/blocks';
import { renderEmail } from '../../render';

interface BookingCancelledEmailProps {
  clientName: string;
  coachName: string;
  appointment: AppointmentInfo;
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
export default function BookingCancelledEmail({ clientName, coachName, appointment, cancelledBy, reason, bookingPageUrl }: BookingCancelledEmailProps) {
  const byClient = cancelledBy === 'client';
  const when = `${appointment.dayLabel}, ${appointment.timeRangeLabel}`;

  return (
    <MailLayout preview={byClient ? `Deine Absage für ${when} ist eingegangen` : `Dein Termin am ${when} wurde abgesagt`}>
      <Greeting>Hallo {clientName},</Greeting>
      <Paragraph>
        {byClient
          ? `deine Absage ist eingegangen – der folgende Termin bei ${coachName} ist storniert. ${coachName} wurde darüber informiert.`
          : `dein Termin bei ${coachName} musste leider abgesagt werden.`}
      </Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min. · bei ${coachName}`}
        cancelled
      />

      {/* Bei einer Selbstabsage kennt der Klient seinen Grund – ihn zurückzuspiegeln
          wäre nur Füllmaterial. Der Grund geht stattdessen an den Coach. */}
      {reason && !byClient ? (
        <>
          <Label>Grund</Label>
          <Quote>{reason}</Quote>
        </>
      ) : null}

      {bookingPageUrl ? (
        <>
          <Paragraph>Du kannst jederzeit einen neuen Termin buchen.</Paragraph>
          <PrimaryButton href={bookingPageUrl}>Neuen Termin buchen</PrimaryButton>
          <Footnote>
            Du hast eine Frage? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
          </Footnote>
        </>
      ) : (
        <Paragraph style={{ margin: 0 }}>
          Eine Neubuchung über HxRoom ist nicht mehr möglich. Wende dich für weitere Termine
          bitte direkt an {coachName}.
        </Paragraph>
      )}
    </MailLayout>
  );
}

BookingCancelledEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 10:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  cancelledBy: 'coach',
  reason: 'Ich bin an dem Tag leider kurzfristig verhindert.',
  bookingPageUrl: 'https://anna.hxroom.de',
} satisfies BookingCancelledEmailProps;

export async function renderBookingCancelledEmail(props: BookingCancelledEmailProps): Promise<string> {
  return renderEmail(<BookingCancelledEmail {...props} />);
}
