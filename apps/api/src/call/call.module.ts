import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { ClientCallController } from './client-call.controller';
import { CoachCallController } from './coach-call.controller';
import { CallService } from './call.service';
import { CallEventsService } from './call-events.service';
import { CallChatService } from './call-chat.service';
import { CallClientContextService } from './call-client-context.service';
import { CallPresenceService } from './call-presence.service';
import { LivekitWebhookController } from './livekit-webhook.controller';

// Eigenes Modul statt einer Erweiterung von BookingsModule: hier liegt seit A2 der
// SSE-Kanal (A2) und seit B2 die LiveKit-Token-Ausgabe; die Webhooks kommen in B6 dazu.
//
// CallEventsService wird exportiert, damit auch Zustandswechsel außerhalb dieses Moduls
// gemeldet werden können – etwa die Absage durch den Coach (CoachBookingsService).
@Module({
  imports: [OrganizationModule],
  controllers: [ClientCallController, CoachCallController, LivekitWebhookController],
  providers: [CallService, CallEventsService, CallChatService, CallClientContextService, CallPresenceService],
  exports: [CallEventsService],
})
export class CallModule {}
