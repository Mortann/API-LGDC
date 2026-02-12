<template>
  <div>
    <div class="page-header">
      <h1>Détail OC</h1>
      <router-link to="/ocs" class="btn btn-secondary">← Retour</router-link>
    </div>
    <div v-if="loading" class="loading"><div class="spinner"></div></div>
    <div v-else-if="oc" class="card" style="max-width:600px;">
      <div class="oc-card-header" style="padding:0 0 1rem;">
        <img v-if="oc.pp_OC?.startsWith('http')" :src="oc.pp_OC" class="oc-avatar" style="width:64px;height:64px;" />
        <div v-else class="oc-avatar-placeholder" style="width:64px;height:64px;font-size:1.5rem;">🐱</div>
        <div>
          <h2 style="font-family:var(--font-display);color:var(--accent);">{{ oc.nom_OC }}</h2>
          <span class="badge badge-rive">{{ oc.nom_Organisation }}</span>
          <span class="text-sm text-muted"> — {{ oc.nom_Emplacement }}</span>
        </div>
      </div>
      <div v-for="s in stats" :key="s.key" class="stat-bar">
        <span class="stat-bar-label">{{ s.label }}</span>
        <div class="stat-bar-track"><div class="stat-bar-fill" :style="{ width: (oc[s.key]/10*100)+'%', background: s.color }"></div></div>
        <span class="stat-bar-value">{{ oc[s.key] }}/10</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api.js'

const route = useRoute()
const oc = ref(null)
const loading = ref(true)

const stats = [
  { key: 'nv_Chasse', label: 'Chasse', color: '#22c55e' },
  { key: 'nv_Combat', label: 'Combat', color: '#ef4444' },
  { key: 'nv_Vitesse', label: 'Vitesse', color: '#3b82f6' },
  { key: 'nv_Endurance', label: 'Endurance', color: '#f59e0b' },
  { key: 'nv_Memoire', label: 'Mémoire', color: '#a855f7' },
  { key: 'nv_Intimidation', label: 'Intimidation', color: '#ec4899' }
]

onMounted(async () => {
  try {
    const res = await api.getOC(route.params.id)
    oc.value = res.data
  } catch (e) { console.error(e) }
  loading.value = false
})
</script>
