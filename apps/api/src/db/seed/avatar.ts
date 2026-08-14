/**
 * Lädt ein Demo-Avatarbild in den S3-Bucket (lokal RustFS aus infra/docker-compose.dev.yml).
 *
 * Bewusst fehlertolerant: der Seed soll auch ohne laufenden Object Store durchlaufen.
 * Ein fehlender Avatar kostet nur ein Platzhalterbild, ein Abbruch dagegen die kompletten
 * Testdaten.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from '../../storage/s3.service';
import { coachAvatarKey } from '../../storage/paths';
import { transcodeAvatar } from '../../storage/image-transcode.util';

/**
 * Quellbild: dasselbe, das die Buchungsseite als Platzhalter ausliefert. Ein eigenes
 * Demo-Asset im Repo wäre reine Dublette.
 */
const SOURCE_IMAGE = path.resolve(
  __dirname,
  '../../../../bookingpage/public/coach-example.jpg',
);

/**
 * S3Service ist eine schlichte Klasse – die @Inject-Dekoratoren an ihren
 * Konstruktorparametern sind nur für den Nest-Container relevant und stehen einer direkten
 * Instanziierung nicht im Weg. Die Client-Konfiguration entspricht S3Module.
 */
function createS3Service(): S3Service {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 environment variables are incomplete');
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId, secretAccessKey },
  });

  return new S3Service(client, bucket);
}

/**
 * @returns `null` bei Erfolg, sonst eine kurze Begründung für die Warnung am Ende des Seeds.
 */
export async function uploadDemoAvatar(organizationId: string): Promise<string | null> {
  try {
    const source = await readFile(SOURCE_IMAGE);
    const webp = await transcodeAvatar(source);
    await createS3Service().putObject(coachAvatarKey(organizationId), webp, 'image/webp');
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
