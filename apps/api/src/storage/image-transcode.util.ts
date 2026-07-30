import sharp from 'sharp';

// Kein .keepExif()/.withMetadata() -> sharp verwirft Bild-Metadaten (u. a. GPS-EXIF) standardmäßig.
export async function transcodeAvatar(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer();
}
