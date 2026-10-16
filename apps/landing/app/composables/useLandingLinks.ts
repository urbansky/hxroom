/** Ziele der Aktionen auf der Landingpage, abgeleitet aus der Build-Konfiguration. */
export function useLandingLinks() {
  const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
  const origin = (subdomain: string) => `${rootDomainHttps ? 'https' : 'http'}://${subdomain}.${rootDomain}`

  return {
    demoUrl: origin('demo'),
    registerUrl: `${origin('app')}/auth/register`,
    loginUrl: `${origin('app')}/auth/login`,
  }
}
