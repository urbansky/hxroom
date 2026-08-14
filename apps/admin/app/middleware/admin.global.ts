/**
 * Schützt das gesamte Betreiber-Backoffice – global statt per definePageMeta wie in der
 * Coach-App: hier ist ausnahmslos jede Seite geschützt, und eine globale Datei kann man
 * beim Anlegen neuer Seiten nicht vergessen.
 *
 * Fragt den Endpunkt direkt ab statt useSession() zu lesen, damit die Rolle zum
 * Navigationszeitpunkt garantiert aktuell ist (gleiches Muster wie apps/coach).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/auth/login') return

  const { public: { authUrl } } = useRuntimeConfig()
  const data = await $fetch<{ user?: { role?: string | null } } | null>(
    `${authUrl}/api/auth/get-session`,
    { credentials: 'include' },
  ).catch(() => null)

  if (!data?.user) return navigateTo('/auth/login')

  // Angemeldet, aber kein Betreiber: Session beenden, sonst bliebe ein gültiges Cookie
  // für eine Domain bestehen, die dieser Account nicht nutzen darf.
  if (data.user.role !== ADMIN_ROLE) {
    await useNuxtApp().$authClient.signOut()
    return navigateTo('/auth/login?forbidden=1')
  }
})
