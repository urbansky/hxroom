export const useApi = () => {
  const { public: { apiUrl } } = useRuntimeConfig()

  const $api = $fetch.create({
    baseURL: apiUrl,
    credentials: 'include',
  })

  return { $api }
}
