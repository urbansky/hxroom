import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { Logger } from '@nestjs/common';
import postgres from 'postgres';
import * as path from 'path';
import * as fs from 'fs';

export async function runMigrations() {
  const logger = new Logger('Migration');

  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD } = process.env;

  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER || !POSTGRES_PASSWORD) {
    throw new Error('Fehlende Postgres-Umgebungsvariablen für Migration');
  }

  const migrationsFolder = path.resolve(process.cwd(), './drizzle');

  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(`Migrations-Ordner nicht gefunden: ${migrationsFolder}`);
  }

  // Separate Verbindung mit max: 1 – Pflicht für postgres-js-Migrator
  const client = postgres({
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT ?? 5432),
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    max: 1,
  });

  try {
    await client`SELECT 1`;
    logger.log('Datenbankverbindung erfolgreich');
  } catch (err) {
    await client.end();
    logger.error('Datenbankverbindung fehlgeschlagen', err);
    throw err;
  }

  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    logger.log('Migrationen erfolgreich abgeschlossen');
  } catch (err) {
    logger.error('Migration fehlgeschlagen', err);
    throw err;
  } finally {
    await client.end();
  }
}
