// Seiten, die in der Beta ausgeblendet sind (utils/beta.ts), führen aufs Dashboard – etwa aus
// einem alten Lesezeichen.
export default defineNuxtRouteMiddleware((to) => {
  if (isBetaHidden(to.path)) return navigateTo('/', { replace: true })
})
