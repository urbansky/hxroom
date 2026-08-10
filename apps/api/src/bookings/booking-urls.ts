import type { ConfigService } from '@nestjs/config';

// Die öffentliche Buchungsseite eines Coachs liegt auf seiner eigenen Subdomain.
// ROOT_DOMAIN_HTTPS trennt lokale Entwicklung (hxroom.localhost, http) vom Betrieb.
function buildOrigin(config: ConfigService, slug: string): string {
  const rootDomain = config.getOrThrow<string>('ROOT_DOMAIN');
  const https = config.get<string>('ROOT_DOMAIN_HTTPS') === 'true';
  return `${https ? 'https' : 'http'}://${slug}.${rootDomain}`;
}

export function buildBookingPageUrl(config: ConfigService, slug: string): string {
  return buildOrigin(config, slug);
}

export function buildConfirmUrl(config: ConfigService, slug: string, bookingId: string, token: string): string {
  return `${buildOrigin(config, slug)}/confirm/${bookingId}?token=${token}`;
}
