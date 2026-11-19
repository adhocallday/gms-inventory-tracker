import { sniffMediaType, isPageMediaType, type PageMediaType } from './document-input';

export class UnsupportedImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

/**
 * Bring an uploaded image to a type Claude reads (JPEG, PNG or WebP).
 * HEIC from iPhone and iPad cameras is converted to JPEG with sharp. The
 * prebuilt sharp binaries may lack an HEVC decoder; then this throws a clear
 * error and the client has to send JPEG (the MerchFlow iPad app does).
 */
export async function toClaudeImage(buffer: Buffer): Promise<{ buffer: Buffer; mediaType: PageMediaType }> {
  const sniffed = sniffMediaType(buffer);
  if (isPageMediaType(sniffed)) return { buffer, mediaType: sniffed };
  if (sniffed !== 'image/heic') {
    throw new UnsupportedImageError('Unsupported image type. Use JPEG, PNG or WebP.');
  }
  try {
    const sharp = (await import('sharp')).default;
    const jpeg = await sharp(buffer)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buffer: jpeg, mediaType: 'image/jpeg' };
  } catch {
    throw new UnsupportedImageError('HEIC photos cannot be converted on this server. Send the photo as JPEG.');
  }
}
