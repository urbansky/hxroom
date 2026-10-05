import { Link } from 'react-email';
import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import { link } from '../_components/styles';
import { renderEmail } from '../../render';

interface BookingReminderEmailProps {
  /** 24h: „morgen um 14:00“; 1h: „der Warteraum ist offen“ (er öffnet genau dann). */
  kind: '24h' | '1h';
  clientName: string;
  coachName: string;
  appointment: AppointmentInfo;
  /** „heute“, „morgen“ oder „am Montag, 3. August“ – nach Kalendertag, siehe relativeDayLabel(). */
  dayLabel: string;
  /** Beginn, z. B. „14:00“. */
  startTimeLabel: string;
  /** Öffnung des Warteraums, z. B. „13:00“ (CALL_OPENS_MINUTES_BEFORE_START vor Beginn). */
  opensTimeLabel: string;
  /** Zugang zum Warteraum; `null` ohne Klienten-Subdomain (Organisation ohne Slug). */
  callUrl: string | null;
  /** Selbstabsage; `null` aus demselben Grund wie callUrl. */
  cancelUrl: string | null;
}

// Erinnerung an den Klienten, 24 Stunden und 1 Stunde vor dem Termin (BookingReminderService).
// Sie trägt denselben Warteraum-Link wie die Bestätigung – damit muss niemand die alte Mail
// suchen. Die 1-h-Erinnerung geht raus, wenn der Raum öffnet, und lädt deshalb ein, Kamera
// und Mikrofon schon jetzt einzurichten.
export default function BookingReminderEmail(props: BookingReminderEmailProps) {
  const { kind, clientName, coachName, appointment, dayLabel, startTimeLabel, opensTimeLabel, callUrl, cancelUrl } = props;
  const isDayBefore = kind === '24h';
  const preview = isDayBefore
    ? `Erinnerung: ${appointment.offerName} ${dayLabel} um ${startTimeLabel} Uhr`
    : `Der Warteraum ist offen – dein Termin beginnt um ${startTimeLabel} Uhr`;

  return (
    <MailLayout preview={preview}>
      <Greeting>Hallo {clientName},</Greeting>
      {isDayBefore ? (
        <Paragraph>
          {`${capitalize(dayLabel)} um ${startTimeLabel} Uhr hast du deinen Termin bei `}
          {coachName}.
        </Paragraph>
      ) : (
        <Paragraph>
          {`um ${startTimeLabel} Uhr beginnt dein Termin bei `}
          {coachName}. Der Warteraum ist ab jetzt geöffnet.
        </Paragraph>
      )}
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min. · bei ${coachName}`}
      />
      {callUrl ? (
        <>
          <PrimaryButton href={callUrl}>Zum Warteraum</PrimaryButton>
          {isDayBefore ? (
            <Paragraph>
              {`Der Raum öffnet um ${opensTimeLabel} Uhr. Dort kannst du vorab Kamera und Mikrofon einrichten – `}
              {coachName} lässt dich dann herein.
            </Paragraph>
          ) : (
            <Paragraph>
              Komm gern ein paar Minuten früher und richte im Warteraum Kamera und Mikrofon ein – {coachName} lässt dich zum Termin herein.
            </Paragraph>
          )}
        </>
      ) : null}
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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

BookingReminderEmail.PreviewProps = {
  kind: '24h',
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '14:00 – 15:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  dayLabel: 'morgen',
  startTimeLabel: '14:00',
  opensTimeLabel: '13:00',
  callUrl: 'https://anna.hxroom.de/call/b-123?token=abc',
  cancelUrl: 'https://anna.hxroom.de/cancel/b-123?token=abc',
} satisfies BookingReminderEmailProps;

export async function renderBookingReminderEmail(props: BookingReminderEmailProps): Promise<string> {
  return renderEmail(<BookingReminderEmail {...props} />);
}
