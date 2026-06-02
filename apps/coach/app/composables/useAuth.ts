export const useAuth = () => {
  const { $authClient } = useNuxtApp()
  const session = $authClient.useSession()

  async function signOut() {
    await $authClient.signOut()
    await navigateTo('/auth/login')
  }

  return { session, signOut }
}
