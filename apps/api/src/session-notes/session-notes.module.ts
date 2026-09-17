import { Module } from '@nestjs/common';
import { SessionNotesController } from './session-notes.controller';
import { SessionNotesService } from './session-notes.service';

// Eigenes Modul statt eines Teils von CallModule: Das Termin-Detail und später die
// Notizen-Chronik im Klientenprofil nutzen dieselben Endpunkte, ganz ohne Call.
@Module({
  controllers: [SessionNotesController],
  providers: [SessionNotesService],
})
export class SessionNotesModule {}
