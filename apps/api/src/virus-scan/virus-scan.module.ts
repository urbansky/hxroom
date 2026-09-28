import { Global, Module } from '@nestjs/common';
import { VirusScanService } from './virus-scan.service';

/** Global wie das S3-Modul: Wer Dateien annimmt, soll den Scanner ohne Import-Kette bekommen. */
@Global()
@Module({
  providers: [VirusScanService],
  exports: [VirusScanService],
})
export class VirusScanModule {}
