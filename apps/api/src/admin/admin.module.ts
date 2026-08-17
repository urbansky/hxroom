import { Module } from '@nestjs/common';
import { AdminCoachesController } from './admin-coaches.controller';
import { AdminCoachesService } from './admin-coaches.service';

/**
 * Betreiber-Backoffice (admin.hxroom.de).
 *
 * Ein Modul für alle Admin-Bereiche mit je einem Controller/Service-Paar, nicht ein Modul
 * pro Bereich: Das gemeinsame Merkmal ist der AdminGuard und das Fehlen jeder
 * Organisations-Scopierung – das ist die Modulgrenze. Vorbild ist BookingsModule, das
 * seine drei Controller ebenfalls nach Zugriffskontext bündelt. Subscriptions, Umsatz und
 * Metriken kommen später als weitere Paare daneben.
 *
 * Keine imports: DbModule und AuthModule sind @Global(). Auch der AdminGuard braucht
 * keine Registrierung – Nest instanziiert klassenreferenzierte Guards selbst.
 */
@Module({
  controllers: [AdminCoachesController],
  providers: [AdminCoachesService],
})
export class AdminModule {}
