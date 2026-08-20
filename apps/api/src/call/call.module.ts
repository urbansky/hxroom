import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module';
import { ClientCallController } from './client-call.controller';
import { CoachCallController } from './coach-call.controller';
import { CallService } from './call.service';

// Eigenes Modul statt einer Erweiterung von BookingsModule: hier kommen in A2 der
// SSE-Kanal und ab B2 die LiveKit-Token-Ausgabe und die Webhooks dazu.
@Module({
  imports: [OrganizationModule],
  controllers: [ClientCallController, CoachCallController],
  providers: [CallService],
})
export class CallModule {}
