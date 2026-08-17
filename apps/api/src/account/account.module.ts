import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AccountController } from './account.controller';
import { AccountDeletionService } from './account-deletion.service';
import { DeletionCronService } from './deletion-cron.service';
import { DeletionExecutorService } from './deletion-executor.service';

// DRIZZLE, AUTH und S3Service kommen aus globalen Modulen, MailModule muss importiert werden.
// DeletionExecutorService wird exportiert, damit die noch fehlende Betreiber-Löschung
// (doc/funktionen/backoffice-betreiber.md 1.06) denselben Ablauf nutzen kann statt ihn zu
// kopieren.
@Module({
  imports: [MailModule],
  controllers: [AccountController],
  providers: [AccountDeletionService, DeletionExecutorService, DeletionCronService],
  exports: [DeletionExecutorService],
})
export class AccountModule {}
