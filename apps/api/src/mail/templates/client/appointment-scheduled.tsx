import { Link, Text } from 'react-email';
import { MailLayout, type MailLegalLinks } from '../layout';
import { AppointmentBlock, type AppointmentInfo } from '../_components/appointment';
import { Footnote, Greeting, Paragraph, PrimaryButton } from '../_components/blocks';
import { colors, link } from '../_components/styles';
import { renderEmail } from '../../render';

export interface ScheduledAppointment {
  appointment: AppointmentInfo;
  callUrl: string;
  cancelUrl: string;
  /** Beginnt der Termin so bald, dass der Warteraum beim Eintreffen der Mail schon offen ist? */
  roomAlreadyOpen: boolean;
}

interface AppointmentScheduledEmailProps {
  /** `null`, wenn der Coach nur eine E-Mail-Adresse eingeladen hat – dann „Hallo,“. */
  clientName: string | null;
  coachName: string;
  /** Ein Termin oder mehrere aus einem Vorgang, in zeitlicher Folge. */
  appointments: ScheduledAppointment[];
  callOpensMinutesBefore: number;
  legalLinks: MailLegalLinks;
}

// Vom Coach angelegte Termine (doc/produkt/funktionen/manuelle-termine.md §4): Der Termin ist
// abgesprochen und steht fest – die Mail teilt ihn mit, statt um eine Bestätigung zu bitten.
// Sie trägt alles, was der Klient bis zum Termin braucht: den Link zum Warteraum, den
// Kalendereintrag und die Absage.
//
// Bei mehreren Terminen eine Mail statt vieler. Jeder Termin hat dann seine eigenen Links,
// weil jeder seinen eigenen Zugang hat; die Erinnerungen vor jedem Termin wiederholen sie.
export default function AppointmentScheduledEmail({ clientName, coachName, appointments, callOpensMinutesBefore, legalLinks }: AppointmentScheduledEmailProps) {
  const [first] = appointments;
  const single = appointments.length === 1;

  return (
    <MailLayout
      preview={single
        ? `Dein Termin bei ${coachName}: ${first.appointment.dayLabel}, ${first.appointment.timeRangeLabel}`
        : `Deine ${appointments.length} Termine bei ${coachName}`}
      legalLinks={legalLinks}
    >
      <Greeting>{clientName ? `Hallo ${clientName},` : 'Hallo,'}</Greeting>

      {single ? (
        <>
          <Paragraph>{coachName} hat einen Termin für dich eingetragen.</Paragraph>
          <AppointmentBlock
            appointment={first.appointment}
            title={first.appointment.offerName}
            meta={`${first.appointment.durationMinutes} Min. · bei ${coachName}`}
          />
          <PrimaryButton href={first.callUrl}>Zum Warteraum</PrimaryButton>
          <Paragraph>
            {first.roomAlreadyOpen
              ? `Der Raum ist bereits geöffnet. Du landest zuerst im Warteraum, und `
              : `Der Raum öffnet ${callOpensMinutesBefore} Minuten vor Beginn. Bewahre diese E-Mail auf – der Link führt dich zum Termin, und `}
            {coachName} lässt dich dann herein.
          </Paragraph>
          <Paragraph style={{ margin: 0 }}>
            Im Anhang dieser E-Mail findest du den Termin als Kalendereintrag – ein Klick, und er steht in deinem Kalender.
          </Paragraph>
          <Footnote>
            Du kannst den Termin nicht wahrnehmen?{' '}
            <Link href={first.cancelUrl} style={link}>
              Termin absagen
            </Link>
            . Bei allen anderen Fragen antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
          </Footnote>
        </>
      ) : (
        <>
          <Paragraph>{`${coachName} hat ${appointments.length} Termine für dich eingetragen.`}</Paragraph>
          {appointments.map((item) => (
            <AppointmentBlock
              key={item.callUrl}
              appointment={item.appointment}
              title={item.appointment.offerName}
              meta={`${item.appointment.durationMinutes} Min. · bei ${coachName}`}
              footer={
                <Text style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: colors.muted }}>
                  <Link href={item.callUrl} style={link}>Zum Warteraum</Link>
                  {' · '}
                  <Link href={item.cancelUrl} style={link}>Absagen</Link>
                </Text>
              }
            />
          ))}
          <Paragraph>
            Vor jedem Termin bekommst du eine Erinnerung mit dem Link zum Warteraum. Der Raum öffnet jeweils {callOpensMinutesBefore} Minuten vor Beginn, und {coachName} lässt dich dann herein.
          </Paragraph>
          <Paragraph style={{ margin: 0 }}>
            Im Anhang dieser E-Mail findest du alle Termine als Kalendereinträge, jeden mit seinem Link zum Warteraum.
          </Paragraph>
          <Footnote>
            Du hast eine Frage? Antworte einfach auf diese E-Mail – sie geht direkt an {coachName}.
          </Footnote>
        </>
      )}
    </MailLayout>
  );
}

AppointmentScheduledEmail.PreviewProps = {
  clientName: 'Max Mustermann',
  coachName: 'Anna Bergmann',
  appointments: [
    {
      appointment: { dayLabel: 'Dienstag, 17. November', timeRangeLabel: '10:00 – 11:00', offerId: 'offer-1', offerName: 'Coaching-Sitzung', durationMinutes: 60 },
      callUrl: 'https://anna.hxroom.de/call/b-1?token=abc',
      cancelUrl: 'https://anna.hxroom.de/cancel/b-1?token=abc',
      roomAlreadyOpen: false,
    },
    {
      appointment: { dayLabel: 'Dienstag, 24. November', timeRangeLabel: '10:00 – 11:00', offerId: 'offer-1', offerName: 'Coaching-Sitzung', durationMinutes: 60 },
      callUrl: 'https://anna.hxroom.de/call/b-2?token=def',
      cancelUrl: 'https://anna.hxroom.de/cancel/b-2?token=def',
      roomAlreadyOpen: false,
    },
  ],
  callOpensMinutesBefore: 60,
  legalLinks: { imprintUrl: 'https://anna.hxroom.de/impressum', privacyUrl: 'https://anna.hxroom.de/datenschutz' },
} satisfies AppointmentScheduledEmailProps;

export async function renderAppointmentScheduledEmail(props: AppointmentScheduledEmailProps): Promise<string> {
  return renderEmail(<AppointmentScheduledEmail {...props} />);
}
