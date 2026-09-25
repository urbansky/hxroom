import sharp from 'sharp';

// Kein .keepExif()/.withMetadata() -> sharp verwirft Bild-Metadaten (u. a. GPS-EXIF) standardmäßig.
export async function transcodeAvatar(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer();
}

/**
 * Ein im Call geteiltes Bild (B7) ohne Metadaten, im selben Format und in voller Größe.
 *
 * Grund ist der Aufnahmeort: Ein Handyfoto trägt ihn im EXIF, und wer dem Coach schnell ein
 * Bild schickt, teilt sonst nebenbei seine Adresse. `.rotate()` wertet die Orientierung aus,
 * bevor sie mit den Metadaten verschwindet – ohne das läge das Bild hinterher quer.
 *
 * Nicht verkleinert: Was geteilt wird, ist oft ein abfotografiertes Dokument, und daran
 * entscheidet die Auflösung, ob es lesbar ist.
 */
/** Längste Kante des Vorschaubilds. Reicht für die Chatspalte auch auf hochauflösenden Schirmen. */
const PREVIEW_MAX_EDGE = 480;

/**
 * Vorschaubild für den Chat: WebP, längste Kante höchstens 480 px, ohne Metadaten.
 *
 * Ein Handyfoto hat schnell mehrere Megabyte, und der Chat lädt es mitten im Videocall – auf
 * derselben Leitung wie das Video. Das Vorschaubild bleibt meist unter 50 KB; das Original
 * kommt erst, wenn jemand die Großansicht öffnet.
 *
 * Gibt die Maße mit zurück: Der Chat reserviert damit den Platz, bevor das Bild da ist.
 */
export async function createImagePreview(source: Buffer): Promise<{ body: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(source)
    .rotate()
    .resize(PREVIEW_MAX_EDGE, PREVIEW_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer({ resolveWithObject: true });

  return { body: data, width: info.width, height: info.height };
}

export async function stripImageMetadata(source: Buffer, extension: string): Promise<Buffer> {
  const image = sharp(source).rotate();

  switch (extension) {
    case 'png':  return image.png().toBuffer();
    case 'webp': return image.webp({ quality: 90 }).toBuffer();
    default:     return image.jpeg({ quality: 90 }).toBuffer();
  }
}
