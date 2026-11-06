import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { CalendarImportSyncService } from './calendar-import-sync.service';
import { CalendarImportsController } from './calendar-imports.controller';
import { CalendarImportsService } from './calendar-imports.service';

// Externe Kalender (doc/produkt/funktionen/kalenderabgleich.md §3). Bewusst ohne Import von
// OrganizationModule: Das braucht umgekehrt diese Dienste für die Slot-Berechnung.
@Module({
  imports: [MailModule],
  controllers: [CalendarImportsController],
  providers: [CalendarImportsService, CalendarImportSyncService],
  exports: [CalendarImportsService, CalendarImportSyncService],
})
export class CalendarImportModule {}
