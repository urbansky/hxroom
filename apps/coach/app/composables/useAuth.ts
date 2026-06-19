export const useAuth = () => {
  const { $authClient } = useNuxtApp()
  const session = $authClient.useSession()
  const activeOrganization = $authClient.useActiveOrganization()

  async function signOut() {
    await $authClient.signOut()
    await navigateTo('/auth/login')
  }

  return { session, activeOrganization, signOut }
}
