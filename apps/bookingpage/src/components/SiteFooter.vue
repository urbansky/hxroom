<template>
  <!-- Links auf Impressum, Datenschutzerklärung und AGB des Coachs folgen mit den
       Rechtstexten (Phase 5, Schritt 3.1); bis dahin keine Links ins Leere. -->
  <UFooter :ui="{ container: 'max-w-[900px] px-6 lg:px-10' }">
    <template #left>
      <span class="text-xs text-dimmed">
        Gebrandeter HxRoom von
        <a href="https://hxroom.de" target="_blank" class="text-muted hover:text-default transition-colors no-underline">hxroom.de</a>&nbsp;·&nbsp;Server in Deutschland
      </span>
    </template>
  </UFooter>
</template>
