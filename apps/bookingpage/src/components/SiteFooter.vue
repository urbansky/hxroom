<template>
  <UFooter :ui="{ container: 'max-w-[900px] px-6 lg:px-10' }">
    <template #left>
      <span class="text-xs text-dimmed">
        Gebrandeter HxRoom von
        <a href="https://hxroom.io" target="_blank" class="text-muted hover:text-default transition-colors no-underline">hxroom.io</a>
        &nbsp;·&nbsp;DSGVO-konform&nbsp;·&nbsp;Server Deutschland
      </span>
    </template>
    <template #right>
      <div class="flex items-center gap-5">
        <a href="#" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">Datenschutz</a>
        <a href="#" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">Impressum</a>
        <a href="#" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">AGB</a>
      </div>
    </template>
  </UFooter>
</template>
