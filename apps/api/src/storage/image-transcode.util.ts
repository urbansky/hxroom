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
export async function stripImageMetadata(source: Buffer, extension: string): Promise<Buffer> {
  const image = sharp(source).rotate();

  switch (extension) {
    case 'png':  return image.png().toBuffer();
    case 'webp': return image.webp({ quality: 90 }).toBuffer();
    default:     return image.jpeg({ quality: 90 }).toBuffer();
  }
}
