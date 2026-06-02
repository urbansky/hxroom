<script setup lang="ts">
const { session, signOut } = useAuth()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold">HxRoom – Coach-Backoffice</h1>
      </template>

      <div v-if="session.isPending" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
      </div>

      <div v-else-if="session.data" class="space-y-4">
        <div class="space-y-1">
          <p class="text-sm text-muted">Angemeldet als</p>
          <p class="font-medium">{{ session.data.user.name }}</p>
          <p class="text-sm text-muted">{{ session.data.user.email }}</p>
        </div>
        <UButton block color="neutral" variant="outline" @click="signOut">
          Abmelden
        </UButton>
      </div>

      <div v-else class="space-y-3">
        <p class="text-sm text-muted">Du bist nicht angemeldet.</p>
        <UButton block to="/auth/login">
          Anmelden
        </UButton>
        <UButton block color="neutral" variant="ghost" to="/auth/register">
          Registrieren
        </UButton>
      </div>
    </UCard>
  </div>
</template>
