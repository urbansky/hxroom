export default defineNuxtRouteMiddleware(async () => {
  const { public: { authUrl } } = useRuntimeConfig()
  const data = await $fetch<{ session: unknown } | null>(
    `${authUrl}/api/auth/get-session`,
    { credentials: 'include' },
  ).catch(() => null)

  if (!data?.session) return navigateTo('/auth/login')
})
