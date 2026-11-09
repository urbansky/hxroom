import { Module } from '@nestjs/common';
import { CalendarFeedController, CalendarFeedPublicController } from './calendar-feed.controller';
import { CalendarFeedService } from './calendar-feed.service';

// Kalender-Abo des Coachs (doc/produkt/funktionen/kalenderabgleich.md §4). Exportiert für die
// Buchungs-Mails und den Download auf der Terminseite, die dieselbe Darstellung nutzen.
@Module({
  controllers: [CalendarFeedController, CalendarFeedPublicController],
  providers: [CalendarFeedService],
  exports: [CalendarFeedService],
})
export class CalendarFeedModule {}
