import { Column, Row, Text } from '@react-email/components';
import { offerColor } from '@hxroom/shared';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { colors } from './styles';

/** Alles, was eine Terminzeile in einer Mail anzeigt – gebaut aus toAppointmentInfo(). */
export interface AppointmentInfo {
  /** "Dienstag, 25. August" */
  dayLabel: string;
  /** "09:20 – 09:40" */
  timeRangeLabel: string;
  /** Bestimmt die Balkenfarbe. `null` bei Terminen ohne Angebot (vom Coach selbst angelegt). */
  offerId: string | null;
  offerName: string;
  durationMinutes: number;
}

interface AppointmentBlockProps {
  appointment: AppointmentInfo;
  /** Zeile unter der Uhrzeit. Klienten-Mails zeigen das Angebot, Coach-Mails den Klienten. */
  title: string;
  /** Meta-Zeile darunter, z. B. "20 Min. · Kennenlern-Gespräch". */
  meta: string;
  /** Abgesagter Termin: durchgestrichen und gedämpft, wie in der Agenda der Coach-App. */
  cancelled?: boolean;
}

const dayHeadingStyle: CSSProperties = { margin: '0 0 6px', fontSize: 14, lineHeight: 1.4, color: colors.muted };
const timeStyle: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.4, fontWeight: 500, fontVariantNumeric: 'tabular-nums' };
const titleStyle: CSSProperties = { margin: '4px 0 0', fontSize: 16, lineHeight: 1.4, fontWeight: 500 };
const metaStyle: CSSProperties = { margin: '2px 0 0', fontSize: 14, lineHeight: 1.5, color: colors.muted };

// React DOM gibt das veraltete bgcolor-Attribut unverändert aus, die React-Typen kennen
// es nicht – daher dieser eine Cast statt eines `any` an der Zelle selbst.
type CellProps = ComponentPropsWithoutRef<'td'> & { bgcolor?: string };

// Wiedererkennungsmerkmal aus dem Coach-Dashboard (BookingAgenda.vue): 4px breiter,
// farbiger Balken links, daneben Uhrzeit, Titel und Meta-Zeile; die Tagesüberschrift
// darüber wie in der Agenda-Gruppierung.
//
// Der Balken ist eine Tabellenzelle, kein border-left: nur so steht er in jedem Client –
// inklusive der Word-Engine von Outlook – zuverlässig auf voller Zeilenhöhe. bgcolor
// zusätzlich zum Style, weil Outlook.com td-Styles in eigene Klassen umschreibt; das
// Zero-Width-Space verhindert, dass Outlook die inhaltslose Zelle einklappt. Den Radius
// lässt Word weg – bei 4px Breite ist der Unterschied vernachlässigbar, VML wäre dafür
// unverhältnismäßig.
export function AppointmentBlock({ appointment, title, meta, cancelled = false }: AppointmentBlockProps) {
  const barColor = appointment.offerId ? offerColor(appointment.offerId) : colors.barFallback;
  const emphasis: CSSProperties = cancelled
    ? { color: colors.muted, textDecoration: 'line-through' }
    : { color: colors.heading };

  return (
    <Row style={{ borderCollapse: 'separate' }}>
      <Column style={{ paddingBottom: 24 }}>
        <Text style={dayHeadingStyle}>{appointment.dayLabel}</Text>
        <Row style={{ borderCollapse: 'separate' }}>
          <Column
            {...({ width: 4, bgcolor: barColor } as CellProps)}
            style={{ width: '4px', minWidth: '4px', backgroundColor: barColor, borderRadius: '2px', fontSize: '1px', lineHeight: '1px' }}
          >
            &#8203;
          </Column>
          {/* Abstand zum Balken als Zellen-Padding, nicht als eigene Spacer-Spalte: die
              Inhaltszelle beansprucht die Restbreite und würde eine leere Spalte auf 0
              zusammendrücken. Padding auf einer <td> hält dagegen jeder Client. */}
          <Column valign="top" style={{ width: '100%', verticalAlign: 'top', paddingLeft: 12 }}>
            <Text style={{ ...timeStyle, ...emphasis }}>{appointment.timeRangeLabel}</Text>
            <Text style={{ ...titleStyle, ...emphasis }}>{title}</Text>
            <Text style={metaStyle}>{meta}</Text>
          </Column>
        </Row>
      </Column>
    </Row>
  );
}
