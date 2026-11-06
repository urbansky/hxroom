import { CALENDAR_IMPORT_ERROR_TEXTS, type CalendarImportError } from '@hxroom/shared';
import { MailLayout } from '../layout';
import { Footnote, Greeting, InfoBox, InfoText, Paragraph, PrimaryButton } from '../_components/blocks';
import { renderEmail } from '../../render';

interface CalendarImportFailingEmailProps {
  name: string;
  calendarName: string;
  reason: CalendarImportError;
  lastSuccessAt: Date | null;
  settingsUrl: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
});

// Ein externer Kalender lässt sich seit sechs Stunden nicht abrufen
// (doc/produkt/funktionen/kalenderabgleich.md §3.4). Die zuletzt bekannten belegten Zeiten
// gelten weiter – neue private Termine aber nicht, und genau das muss der Coach wissen.
export default function CalendarImportFailingEmail({ name, calendarName, reason, lastSuccessAt, settingsUrl }: CalendarImportFailingEmailProps) {
  return (
    <MailLayout preview={`Dein Kalender „${calendarName}“ lässt sich nicht mehr abgleichen.`}>
      <Greeting>Hallo {name},</Greeting>
      <Paragraph>
        HxRoom kann deinen Kalender „{calendarName}“ seit einigen Stunden nicht mehr abrufen.
        Termine, die du dort neu einträgst, blockieren deine Buchungsseite deshalb noch nicht.
      </Paragraph>
      <InfoBox>
        <InfoText>
          {CALENDAR_IMPORT_ERROR_TEXTS[reason]}
          {lastSuccessAt && (
            <>
              <br />
              Zuletzt abgeglichen am <strong>{dateTimeFormatter.format(lastSuccessAt)} Uhr</strong>
            </>
          )}
        </InfoText>
      </InfoBox>
      <Paragraph>
        Die zuletzt bekannten Termine bleiben blockiert. Prüfe die Adresse in deinen Einstellungen;
        hat sich die iCal-Adresse geändert, entferne den Kalender und füge ihn mit der neuen Adresse hinzu.
      </Paragraph>
      <PrimaryButton href={settingsUrl}>Kalender prüfen</PrimaryButton>
      <Footnote>
        Du bekommst diese Mail einmal. Sobald der Abgleich wieder klappt, ist alles wie vorher.
      </Footnote>
    </MailLayout>
  );
}

CalendarImportFailingEmail.PreviewProps = {
  name: 'Anna Bergmann',
  calendarName: 'Privat',
  reason: 'forbidden',
  lastSuccessAt: new Date('2026-11-06T08:15:00Z'),
  settingsUrl: 'https://app.hxroom.de/bookings/availability?tab=calendar',
} satisfies CalendarImportFailingEmailProps;

export async function renderCalendarImportFailingEmail(props: CalendarImportFailingEmailProps): Promise<string> {
  return renderEmail(<CalendarImportFailingEmail {...props} />);
}
