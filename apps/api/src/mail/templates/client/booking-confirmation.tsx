import { Button, Section, Text } from '@react-email/components';
import { MailLayout } from '../layout';
import { renderEmail } from '../../render';

interface BookingConfirmationEmailProps {
  clientName: string;
  offerName: string;
  dayTimeLabel: string;
  confirmUrl: string;
}

export default function BookingConfirmationEmail({ clientName, offerName, dayTimeLabel, confirmUrl }: BookingConfirmationEmailProps) {
  return (
    <MailLayout preview={`Bitte bestätige deinen Termin: ${offerName}, ${dayTimeLabel}`}>
      <Text style={{ margin: '0 0 12px', fontSize: 20, color: '#1a1a1a', fontWeight: 600 }}>
        Hallo {clientName},
      </Text>
      <Text style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.65, fontSize: 15 }}>
        bitte bestätige deinen Termin – erst dann ist er für dich reserviert.
      </Text>
      <Section style={{ backgroundColor: '#f5f5f2', borderRadius: 8, margin: '0 0 28px', padding: '16px 20px' }}>
        <Text style={{ margin: 0, fontSize: 14, color: '#333' }}>
          <strong>{offerName}</strong>
          <br />
          {dayTimeLabel}
        </Text>
      </Section>
      <Button
        href={confirmUrl}
        style={{ backgroundColor: '#8B9E8A', color: '#fff', textDecoration: 'none', padding: '13px 28px', borderRadius: 6, fontWeight: 600, fontSize: 15 }}
      >
        Termin bestätigen
      </Button>
      <Text style={{ margin: '32px 0 0', fontSize: 13, color: '#999', lineHeight: 1.6 }}>
        Der Link ist 30 Minuten gültig. Ohne Bestätigung wird der Termin automatisch wieder freigegeben.
        <br />
        Falls du diesen Termin nicht angefragt hast, kannst du diese E-Mail ignorieren.
      </Text>
    </MailLayout>
  );
}

BookingConfirmationEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  offerName: 'Coaching-Sitzung · 60 Minuten',
  dayTimeLabel: 'Montag, 3. August, 09:00–10:00 Uhr',
  confirmUrl: 'https://anna.hxroom.de/confirm/preview?token=preview',
} satisfies BookingConfirmationEmailProps;

export async function renderBookingConfirmationEmail(props: BookingConfirmationEmailProps): Promise<string> {
  return renderEmail(<BookingConfirmationEmail {...props} />);
}
