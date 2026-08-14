export const ADMIN_ROLE = 'admin'

export const useAuth = () => {
  const { $authClient } = useNuxtApp()
  const session = $authClient.useSession()

  const isAdmin = computed(() => session.value.data?.user?.role === ADMIN_ROLE)

  async function signOut() {
    await $authClient.signOut()
    await navigateTo('/auth/login')
  }

  return { session, isAdmin, signOut }
}
