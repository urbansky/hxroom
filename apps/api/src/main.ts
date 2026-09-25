import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { AUTH, type Auth } from './auth/auth.module';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  await runMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const auth = app.get<Auth>(AUTH);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173', // coach (dev)
        'http://localhost:5174', // bookingpage (dev)
        'http://localhost:5175', // admin (dev)
        'http://localhost:5176', // landing (dev)
      ];

  const corsPatterns: (string | RegExp)[] = [
    ...allowedOrigins,
    /^http:\/\/[a-z0-9-]+\.hxroom\.localhost$/,
    /^https:\/\/[a-z0-9-]+\.hxroom\.de$/,
  ];

  // CORS muss vor better-auth registriert werden, da /api/auth den NestJS-Pipeline umgeht
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = !origin || corsPatterns.some((p) =>
        typeof p === 'string' ? p === origin : p.test(origin),
      );
      callback(null, allowed);
    },
    credentials: true,
  });
  app.use('/api/auth', toNodeHandler(auth));
  // LiveKit-Webhooks (B6): Die Signatur gilt für die Bytes, wie LiveKit sie geschickt hat.
  // Deshalb der unveränderte Body für genau den Typ, den nur LiveKit setzt
  // (`application/webhook+json`) – den erkennt der JSON-Parser von Nest ohnehin nicht.
  //
  // Über Nest und nicht über `express` direkt: express ist keine eigene Abhängigkeit der
  // API. Lokal fand Node es im gemeinsamen node_modules des Monorepos, im Docker-Image nicht
  // – die API startete dort gar nicht erst.
  app.useBodyParser('raw', { type: 'application/webhook+json', limit: '1mb' });
  app.setGlobalPrefix('api/v1');
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} ist bereits belegt. Anderer Prozess läuft noch?`);
      process.exit(1);
    }
    throw err;
  });
  console.log(`API running on http://localhost:${port}/api/v1`);
}
bootstrap();
