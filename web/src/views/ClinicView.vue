<script setup lang="ts">
import { onMounted } from 'vue'
import ClinicList from '@/components/ClinicList.vue'
import PageHeader from '@/components/PageHeader.vue'
import VitalsPanel from '@/components/VitalsPanel.vue'
import { useClinicStore } from '@/stores/clinic'
import { useVitalsStore } from '@/stores/vitals'

const clinic = useClinicStore()
const vitals = useVitalsStore()

// The vitals store is shared with the patient detail page. Coming back here,
// make sure the panel shows the patient selected in the clinic list, not the last one viewed elsewhere.
onMounted(() => {
  const selected = clinic.selected
  if (selected && vitals.patientId !== selected.patientId) vitals.open(selected.patientId)
})
</script>

<template>
  <PageHeader title="門診作業" description="查詢門診清單、幫病人報到，並查看病人的生命徵象。" />
  <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
    <ClinicList />
    <VitalsPanel />
  </div>
</template>
