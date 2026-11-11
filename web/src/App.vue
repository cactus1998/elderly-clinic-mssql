<script setup lang="ts">
import ClinicList from '@/components/ClinicList.vue'
import VitalsPanel from '@/components/VitalsPanel.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header class="bg-sky-700 px-6 py-3 text-white">
      <h1 class="text-lg font-semibold">樂齡門診掛號與健康追蹤</h1>
    </header>
    <main class="grid gap-4 p-4 lg:grid-cols-[3fr_2fr]">
      <ClinicList />
      <VitalsPanel />
    </main>
  </div>
</template>
