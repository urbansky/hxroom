import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173', // coach (dev)
        'http://localhost:5174', // room (dev)
        'http://localhost:5175', // admin (dev)
        'http://localhost:5176', // landing (dev)
      ];

  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
}
bootstrap();
