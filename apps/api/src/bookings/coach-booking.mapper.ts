import { bookings } from '../db/schema';
import type { BookingOrigin, CancelledBy, CoachBookingResponse } from '@hxroom/shared';

// Explizite Spaltenliste statt select(): clientAccessToken darf die API nie verlassen,
// und ein select() ohne Argument würde ihn bei jedem Schema-Wechsel stillschweigend
// wieder mitnehmen.
//
// Bewusst in einer eigenen Datei: sowohl der Kalender (CoachBookingsService) als auch
// die Sitzungshistorie im Klientenprofil (ClientsService) liefern Buchungen an den
// Coach aus. Eine zweite Spaltenliste wäre eine zweite Gelegenheit, den Token zu leaken.
export const coachBookingColumns = {
  id:                 bookings.id,
  startTime:          bookings.startTime,
  endTime:            bookings.endTime,
  offerId:            bookings.offerId,
  offerName:          bookings.offerName,
  durationMinutes:    bookings.durationMinutes,
  status:             bookings.status,
  origin:             bookings.origin,
  clientId:           bookings.clientId,
  clientName:         bookings.clientName,
  clientEmail:        bookings.clientEmail,
  clientPhone:        bookings.clientPhone,
  clientNote:         bookings.clientNote,
  confirmedAt:        bookings.confirmedAt,
  createdAt:          bookings.createdAt,
  cancelledAt:        bookings.cancelledAt,
  cancelledBy:        bookings.cancelledBy,
  cancellationReason: bookings.cancellationReason,
};

export interface CoachBookingRow {
  id: string;
  startTime: Date;
  endTime: Date;
  offerId: string | null;
  offerName: string;
  durationMinutes: number;
  status: CoachBookingResponse['status'];
  origin: BookingOrigin;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientNote: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelledBy: CancelledBy | null;
  cancellationReason: string | null;
}

export function toCoachBookingResponse(row: CoachBookingRow): CoachBookingResponse {
  return {
    id:                 row.id,
    start:              row.startTime.toISOString(),
    end:                row.endTime.toISOString(),
    offerId:            row.offerId,
    offerName:          row.offerName,
    durationMinutes:    row.durationMinutes,
    status:             row.status,
    origin:             row.origin,
    clientId:           row.clientId,
    clientName:         row.clientName,
    clientEmail:        row.clientEmail,
    clientPhone:        row.clientPhone,
    clientNote:         row.clientNote,
    confirmedAt:        row.confirmedAt?.toISOString() ?? null,
    createdAt:          row.createdAt.toISOString(),
    cancelledAt:        row.cancelledAt?.toISOString() ?? null,
    cancelledBy:        row.cancelledBy,
    cancellationReason: row.cancellationReason,
  };
}
