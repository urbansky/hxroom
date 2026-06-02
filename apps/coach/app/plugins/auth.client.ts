import { createAuthClient } from 'better-auth/vue'

export default defineNuxtPlugin(() => {
  const { public: { authUrl } } = useRuntimeConfig()
  const authClient = createAuthClient({
    baseURL: authUrl,
    fetchOptions: { credentials: 'include' },
  })
  return { provide: { authClient } }
})
