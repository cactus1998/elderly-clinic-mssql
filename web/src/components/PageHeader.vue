<script setup lang="ts">
/** Page title (the page's only h1), optional description, and the page's main actions. */
const { title = '', description } = defineProps<{ title?: string; description?: string }>()
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <slot name="breadcrumb" />
      <h1 class="flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
