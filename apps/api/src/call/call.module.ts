import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { ClientCallController } from './client-call.controller';
import { CoachCallController } from './coach-call.controller';
import { CallService } from './call.service';
import { CallEventsService } from './call-events.service';

// Eigenes Modul statt einer Erweiterung von BookingsModule: hier liegt seit A2 der
// SSE-Kanal, ab B2 kommen LiveKit-Token-Ausgabe und Webhooks dazu.
//
// CallEventsService wird exportiert, damit auch Zustandswechsel außerhalb dieses Moduls
// gemeldet werden können – etwa die Absage durch den Coach (CoachBookingsService).
@Module({
  imports: [OrganizationModule],
  controllers: [ClientCallController, CoachCallController],
  providers: [CallService, CallEventsService],
  exports: [CallEventsService],
})
export class CallModule {}
