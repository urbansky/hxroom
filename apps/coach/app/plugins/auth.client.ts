import { createAuthClient } from 'better-auth/vue'
import { organizationClient } from 'better-auth/client/plugins'

export default defineNuxtPlugin(() => {
  const { public: { authUrl } } = useRuntimeConfig()
  const authClient = createAuthClient({
    baseURL: authUrl,
    fetchOptions: { credentials: 'include' },
    plugins: [organizationClient()],
  })
  return { provide: { authClient } }
})
