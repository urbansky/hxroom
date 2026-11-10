/**
 * Angebot „Kennenlerngespräch“ auf demo.hxroom.de. „Vorführung buchen“ führt direkt in seine
 * Terminauswahl statt auf die Profilseite. Die ID gilt nur in Produktion; lokal hat das
 * Demo-Angebot eine andere, der Link zeigt dort ins Leere.
 */
const DEMO_OFFER_ID = '8cb945f3-8c0d-4dcb-8106-b514241e757b'

/** Ziele der Aktionen auf der Landingpage, abgeleitet aus der Build-Konfiguration. */
export function useLandingLinks() {
  const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
  const origin = (subdomain: string) => `${rootDomainHttps ? 'https' : 'http'}://${subdomain}.${rootDomain}`

  return {
    demoUrl: `${origin('demo')}/offers/${DEMO_OFFER_ID}`,
    registerUrl: `${origin('app')}/auth/register`,
    loginUrl: `${origin('app')}/auth/login`,
  }
}
