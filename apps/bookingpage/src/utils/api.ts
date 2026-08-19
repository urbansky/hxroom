/**
 * Basis-URL der API und der Coach-Slug – beide werden von allen Composables und Views
 * gebraucht. Der Slug steckt im Hostname der Klienten-Subdomain (anna.hxroom.de).
 */
export const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost';

export function orgSlug(): string {
  return window.location.hostname.split('.')[0]!;
}
