import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import * as schema from '../db/schema';

export const AUTH = Symbol('AUTH');
export type Auth = ReturnType<typeof betterAuth>;

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, ConfigService],
      useFactory: (db: DrizzleDb, config: ConfigService) =>
        betterAuth({
          database: drizzleAdapter(db, {
            provider: 'pg',
            schema: { ...schema },
          }),
          plugins: [organization()],
          emailAndPassword: { enabled: true },
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL', 'http://localhost:3000'),
        }),
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}
