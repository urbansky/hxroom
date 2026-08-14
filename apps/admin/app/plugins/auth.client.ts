import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

// adminClient statt organizationClient wie in der Coach-App: ein Betreiber ist Mitglied
// keiner Organisation. Das Plugin typisiert user.role/banned und stellt die
// Verwaltungsaufrufe (listUsers, banUser, impersonateUser) unter /api/auth/admin/* bereit.
export default defineNuxtPlugin(() => {
  const { public: { authUrl } } = useRuntimeConfig()
  const authClient = createAuthClient({
    baseURL: authUrl,
    fetchOptions: { credentials: 'include' },
    plugins: [adminClient()],
  })
  return { provide: { authClient } }
})
