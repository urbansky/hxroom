import { Global, Inject, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = ReturnType<typeof drizzle>;

@Injectable()
class DbHealthService implements OnModuleInit {
  private readonly logger = new Logger(DbHealthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async onModuleInit() {
    try {
      await this.db.execute(sql`SELECT 1`);
      this.logger.log('Datenbankverbindung erfolgreich');
    } catch (err) {
      this.logger.error('Datenbankverbindung fehlgeschlagen', err);
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.getOrThrow<string>('POSTGRES_HOST');
        const port = config.getOrThrow<string>('POSTGRES_PORT');
        const db = config.getOrThrow<string>('POSTGRES_DB');
        const user = config.getOrThrow<string>('POSTGRES_USER');
        const password = config.getOrThrow<string>('POSTGRES_PASSWORD');
        return drizzle({ connection: { host, port: Number(port), database: db, user, password } });
      },
    },
    DbHealthService,
  ],
  exports: [DRIZZLE],
})
export class DbModule {}
