import { MailLayout } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface BookingConfirmationEmailProps {
  clientName: string;
  appointment: AppointmentInfo;
  confirmUrl: string;
  /** Gültigkeitsdauer des Links – kommt aus CONFIRMATION_TTL_MINUTES, damit Text und
   *  tatsächliche Prüfung nicht auseinanderlaufen. */
  ttlMinutes: number;
}

export default function BookingConfirmationEmail({ clientName, appointment, confirmUrl, ttlMinutes }: BookingConfirmationEmailProps) {
  return (
    <MailLayout preview={`Bitte bestätige deinen Termin: ${appointment.offerName}, ${appointment.dayLabel}, ${appointment.timeRangeLabel}`}>
      <Greeting>Hallo {clientName},</Greeting>
      <Paragraph>bitte bestätige deinen Termin – erst dann ist er für dich reserviert.</Paragraph>
      <AppointmentBlock
        appointment={appointment}
        title={appointment.offerName}
        meta={`${appointment.durationMinutes} Min.`}
      />
      <PrimaryButton href={confirmUrl}>Termin bestätigen</PrimaryButton>
      <Footnote>
        {`Der Link ist ${ttlMinutes} Minuten gültig. Ohne Bestätigung wird der Termin automatisch wieder freigegeben.`}
        <br />
        Falls du diesen Termin nicht angefragt hast, kannst du diese E-Mail ignorieren.
      </Footnote>
    </MailLayout>
  );
}

BookingConfirmationEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  appointment: {
    dayLabel: 'Montag, 3. August',
    timeRangeLabel: '09:00 – 10:00',
    offerId: 'offer-1',
    offerName: 'Coaching-Sitzung',
    durationMinutes: 60,
  },
  confirmUrl: 'https://anna.hxroom.de/confirm/preview?token=preview',
  ttlMinutes: 30,
} satisfies BookingConfirmationEmailProps;

export async function renderBookingConfirmationEmail(props: BookingConfirmationEmailProps): Promise<string> {
  return renderEmail(<BookingConfirmationEmail {...props} />);
}
