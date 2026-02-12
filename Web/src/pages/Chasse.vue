<template>
  <div>
    <div class="page-header">
      <h1>Chasse</h1>
    </div>

    <div class="card mb-2">
      <h3 class="card-title">Tenter une chasse</h3>
      
      <div class="form-row">
        <!-- Sélection de l'OC -->
        <div class="form-group">
          <label>Personnage (OC)</label>
          <select class="form-control" v-model="chasseForm.id_OC" @change="loadStats">
            <option :value="null" disabled>Choisir un OC...</option>
            <option v-for="oc in ocs" :key="oc.id_OC" :value="oc.id_OC">
              {{ oc.nom_OC }} (Chasse: {{ oc.nv_Chasse }}/10)
            </option>
          </select>
        </div>

        <!-- Sélection de l'emplacement -->
        <div class="form-group">
          <label>Lieu de chasse</label>
          <select class="form-control" v-model="chasseForm.id_Emplacement" @change="loadProiesDispo">
            <option :value="null" disabled>Choisir un lieu...</option>
            <option v-for="e in empls" :key="e.id_Emplacement" :value="e.id_Emplacement">{{ e.nom_Emplacement }}</option>
          </select>
        </div>
      </div>

      <!-- Sélection de la proie -->
      <div class="form-group">
        <label>Proie ciblée</label>
        <div v-if="loadingProies" class="text-sm text-muted">Chargement...</div>
        <div v-else-if="proiesDispo.length === 0 && chasseForm.id_Emplacement" class="text-sm text-muted">Aucune proie disponible dans cette zone</div>
        <select v-else class="form-control" v-model="chasseForm.id_Proie">
          <option :value="null" disabled>Choisir une proie...</option>
          <option v-for="p in proiesDispo" :key="p.id_Proie" :value="p.id_Proie">
            {{ p.nom_Proie }} — {{ p.quantite_disponible }} dispo (rareté: {{ p.nv_Rarete }})
          </option>
        </select>
      </div>

      <!-- Stats de l'OC sélectionné -->
      <div v-if="statsOC" class="card mt-1" style="background:var(--bg-input);">
        <div class="flex items-center justify-between flex-wrap gap-sm mb-1">
          <strong>{{ statsOC.nom_OC }}</strong>
          <span class="badge" :class="statsOC.peut_chasser ? 'badge-success' : 'badge-danger'">
            {{ statsOC.peut_chasser ? 'Peut chasser' : 'Ne peut plus chasser' }}
          </span>
        </div>
        <div class="flex gap flex-wrap text-sm">
          <span>Taux base: <strong>{{ statsOC.taux_base }}%</strong></span>
          <span>Prises: <strong>{{ statsOC.nbr_Prise_Jour }}/3</strong></span>
          <span>Essais: <strong>{{ statsOC.nbr_Tentative }}/6</strong></span>
        </div>
      </div>

      <!-- Bouton simuler / chasser -->
      <div class="flex gap mt-2 flex-wrap">
        <button class="btn btn-secondary" @click="simuler" :disabled="!canChasse">🔮 Simuler (preview)</button>
        <button class="btn btn-primary" @click="tenter" :disabled="!canChasse || hunting" style="flex:1;">
          {{ hunting ? '⏳ Chasse en cours...' : '🎯 Lancer la chasse !' }}
        </button>
      </div>
    </div>

    <!-- Résultat de simulation -->
    <div v-if="simResult" class="card mb-2">
      <h3 class="card-title">🔮 Simulation</h3>
      <div class="flex gap flex-wrap text-sm">
        <span>Taux de base: <strong>{{ simResult.taux_base }}%</strong></span>
        <span>→ Taux final: <strong class="text-accent">{{ simResult.taux_final }}%</strong></span>
      </div>
      <div class="text-sm text-muted mt-1">
        Modificateurs : Météo -{{ simResult.modificateurs.difficulte_temps * 5 }}%, 
        Rareté -{{ simResult.modificateurs.rarete_proie * 3 }}%, 
        Vitesse -{{ simResult.modificateurs.diff_vitesse * 2 }}%
      </div>
    </div>

    <!-- Résultat de chasse -->
    <div v-if="chasseResult" class="chasse-result" :class="resultClass">
      <div class="chasse-result-icon">{{ resultIcon }}</div>
      <h3>{{ resultTitle }}</h3>
      <p>{{ chasseResult.message }}</p>
      <div class="flex gap flex-wrap justify-between mt-2 text-sm" style="justify-content: center;">
        <span v-if="chasseResult.taux_reussite">Taux: {{ chasseResult.taux_reussite }}%</span>
        <span v-if="chasseResult.jet !== undefined">Jet: {{ chasseResult.jet }}</span>
        <span v-if="chasseResult.oc">Prises restantes: {{ chasseResult.oc.prises_restantes }}</span>
        <span v-if="chasseResult.oc">Essais restants: {{ chasseResult.oc.tentatives_restantes }}</span>
      </div>
    </div>

    <!-- Historique rapide -->
    <div v-if="history.length > 0" class="card mt-2">
      <h3 class="card-title">Historique de session</h3>
      <div v-for="(h, i) in history" :key="i" class="flex items-center gap-sm text-sm" style="padding:0.3rem 0;border-bottom:1px solid var(--border);">
        <span>{{ h.icon }}</span>
        <span class="truncate" style="flex:1;">{{ h.msg }}</span>
        <span class="text-muted">{{ h.taux }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const ocs = ref([]); const empls = ref([])
const proiesDispo = ref([]); const loadingProies = ref(false)
const statsOC = ref(null)
const simResult = ref(null)
const chasseResult = ref(null)
const hunting = ref(false)
const history = ref([])

const chasseForm = ref({ id_OC: null, id_Emplacement: null, id_Proie: null })

const canChasse = computed(() => chasseForm.value.id_OC && chasseForm.value.id_Proie)

const resultClass = computed(() => {
  if (!chasseResult.value) return ''
  const r = chasseResult.value.resultat
  if (r === 'CAPTURE') return 'chasse-result-capture'
  if (r === 'ECHEC') return 'chasse-result-echec'
  return 'chasse-result-limite'
})

const resultIcon = computed(() => {
  if (!chasseResult.value) return ''
  const r = chasseResult.value.resultat
  if (r === 'CAPTURE') return '🎉'
  if (r === 'ECHEC') return '💨'
  if (r === 'LIMITE_PRISES') return '📦'
  return '⚡'
})

const resultTitle = computed(() => {
  if (!chasseResult.value) return ''
  const r = chasseResult.value.resultat
  if (r === 'CAPTURE') return 'Capture réussie !'
  if (r === 'ECHEC') return 'Échec...'
  if (r === 'LIMITE_PRISES') return 'Réserve pleine'
  return 'Limite atteinte'
})

async function loadStats() {
  if (!chasseForm.value.id_OC) return
  try {
    const res = await api.getStatsChasse(chasseForm.value.id_OC)
    statsOC.value = res.data
  } catch (e) { console.error(e) }

  // Auto-select emplacement de l'OC
  const oc = ocs.value.find(o => o.id_OC === chasseForm.value.id_OC)
  if (oc) {
    chasseForm.value.id_Emplacement = oc.id_Emplacement
    loadProiesDispo()
  }
}

async function loadProiesDispo() {
  if (!chasseForm.value.id_Emplacement) return
  loadingProies.value = true
  chasseForm.value.id_Proie = null
  try {
    const res = await api.getProiesDisponibles(chasseForm.value.id_Emplacement)
    proiesDispo.value = res.data
  } catch (e) { proiesDispo.value = [] }
  loadingProies.value = false
}

async function simuler() {
  if (!canChasse.value) return
  try {
    const res = await api.simulerChasse({
      id_OC: chasseForm.value.id_OC,
      id_Proie: chasseForm.value.id_Proie,
      id_Emplacement: chasseForm.value.id_Emplacement
    })
    simResult.value = res.data
  } catch (e) { toast(e.message, 'error') }
}

async function tenter() {
  if (!canChasse.value || hunting.value) return
  hunting.value = true
  chasseResult.value = null
  simResult.value = null

  try {
    const res = await api.tenterChasse(chasseForm.value)
    chasseResult.value = res.data

    // Ajouter à l'historique
    history.value.unshift({
      icon: res.data.resultat === 'CAPTURE' ? '✅' : res.data.resultat === 'ECHEC' ? '❌' : '⚠️',
      msg: res.data.message.substring(0, 80) + (res.data.message.length > 80 ? '...' : ''),
      taux: res.data.taux_reussite || 0
    })

    // Rafraîchir les stats
    loadStats()
    loadProiesDispo()
  } catch (e) { toast(e.message, 'error') }

  hunting.value = false
}

onMounted(async () => {
  try {
    const [r1, r2] = await Promise.all([api.getOCs(), api.getEmplacements()])
    ocs.value = r1.data; empls.value = r2.data
  } catch (e) { toast(e.message, 'error') }
})
</script>
