import { Link } from '@react-email/components';
import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
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
  /** Zugang zum Warteraum. `null` aus demselben Grund wie cancelUrl. */
  callUrl: string | null;
  /** Wie lange vor Beginn der Raum öffnet – kommt aus CALL_OPENS_MINUTES_BEFORE_START,
   *  damit Text und tatsächliche Prüfung nicht auseinanderlaufen. */
  callOpensMinutesBefore: number;
}

// Geht raus, sobald der Klient den Bestätigungslink geklickt hat und die Buchung final ist.
//
// Diese Mail trägt den Zugang zum Warteraum. Erinnerungsmails kurz vor dem Termin gibt es
// nicht (die reminderJobs aus doc/technisches-konzept.md sind Entwurf, keine Tabelle) –
// damit ist sie der einzige Weg, auf dem der Klient seinen Link je erhält. Deshalb steht er
// hier als Haupt-Button, während die Selbstabsage im Fußtext bleibt.
export default function BookingConfirmedEmail({ clientName, coachName, appointment, cancelUrl, callUrl, callOpensMinutesBefore }: BookingConfirmedEmailProps) {
  return (
    <MailLayout preview={`Dein Termin steht: ${appointment.offerName}, ${appointment.dayLabel}, ${appointment.timeRangeLabel}`}>
      <Greeting>Hallo {clientName},</Greeting>
      <Paragraph>dein Termin bei {coachName} ist bestätigt und fest reserviert.</Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min. · bei ${coachName}`}
      />
      {callUrl ? (
        <>
          <PrimaryButton href={callUrl}>Zum Warteraum</PrimaryButton>
          <Paragraph>
            {`Der Raum öffnet ${callOpensMinutesBefore} Minuten vor Beginn. Bewahre diese E-Mail auf – der Link führt dich zum Termin, und `}
            {coachName} lässt dich dann herein.
          </Paragraph>
        </>
      ) : null}
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
  callUrl: 'https://anna.hxroom.de/call/b-123?token=abc',
  callOpensMinutesBefore: 60,
} satisfies BookingConfirmedEmailProps;

export async function renderBookingConfirmedEmail(props: BookingConfirmedEmailProps): Promise<string> {
  return renderEmail(<BookingConfirmedEmail {...props} />);
}
