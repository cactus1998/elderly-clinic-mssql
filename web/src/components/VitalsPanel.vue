<script setup lang="ts">
import VitalsSection from '@/components/VitalsSection.vue'
import { useClinicStore } from '@/stores/clinic'

const clinic = useClinicStore()
</script>

<template>
  <section class="card flex min-w-0 flex-col" aria-label="生命徵象">
    <div v-if="!clinic.selected" class="empty-state my-auto">
      <p class="empty-state-title">尚未選擇病人</p>
      <p>點選門診清單中的病人，查看生命徵象。</p>
      <p>
        也可以到
        <RouterLink to="/patients" class="link-action">病人頁</RouterLink>
        查詢任何病人。
      </p>
    </div>

    <template v-else>
      <div class="card-header">
        <h2 class="card-title">
          <RouterLink :to="`/patients/${clinic.selected.patientId}`" class="hover:text-sky-700 hover:underline">
            {{ clinic.selected.patientName }}
          </RouterLink>
          <span class="ml-2 font-mono text-sm font-normal text-slate-500">{{ clinic.selected.chartNo }}</span>
        </h2>
        <span class="text-sm text-slate-500">生命徵象</span>
      </div>
      <VitalsSection />
    </template>
  </section>
</template>
