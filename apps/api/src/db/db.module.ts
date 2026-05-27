import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDb = ReturnType<typeof drizzle>;

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
        const client = postgres({ host, port: Number(port), database: db, user, password });
        return drizzle(client);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule {}
