<template>
  <div>
    <div class="page-header">
      <h1>PNJ</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">🎭</div>
      <p>Aucun PNJ enregistré</p>
    </div>
    <template v-else>
      <!-- Filters -->
      <div class="flex gap flex-wrap mb-2">
        <div class="form-group" style="flex:1;min-width:150px;">
          <select class="form-control" v-model="filterOrga">
            <option value="">Toutes les organisations</option>
            <option v-for="o in orgaOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:150px;">
          <input class="form-control" v-model="searchQuery" placeholder="Rechercher un PNJ..." />
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="empty"><p>Aucun résultat</p></div>
      <div v-else class="card-grid">
        <div class="oc-card" v-for="pnj in filteredItems" :key="pnj.id_PNJ">
          <div class="oc-card-header">
            <img v-if="pnj.pp_PNJ?.startsWith('http')" :src="pnj.pp_PNJ" :alt="pnj.nom_PNJ" class="oc-avatar" />
            <div v-else class="oc-avatar-placeholder">🎭</div>
            <div style="min-width:0;flex:1;">
              <strong class="truncate">{{ pnj.nom_PNJ }}</strong>
              <div class="text-sm text-muted">{{ pnj.nom_Organisation }} — {{ pnj.nom_Emplacement }}</div>
            </div>
          </div>
          <div class="oc-card-actions">
            <button class="btn btn-secondary btn-sm" style="flex:1" @click="openModal(pnj)">✏️ Modifier</button>
            <button class="btn btn-danger btn-sm" @click="remove(pnj.id_PNJ)">🗑️</button>
          </div>
        </div>
      </div>
    </template>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouveau' }} PNJ</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>Nom</label><input class="form-control" v-model="form.nom_PNJ" /></div>
            <div class="form-group"><label>Photo (URL)</label><input class="form-control" v-model="form.pp_PNJ" /></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Organisation</label>
              <select class="form-control" v-model="form.id_Organisation">
                <option v-for="o in orgas" :key="o.id_Organisation" :value="o.id_Organisation">{{ o.nom_Organisation }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Emplacement</label>
              <select class="form-control" v-model="form.id_Emplacement">
                <option v-for="e in empls" :key="e.id_Emplacement" :value="e.id_Emplacement">{{ e.nom_Emplacement }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group" v-for="s in statKeys" :key="s.key">
              <label>{{ s.label }}</label>
              <input class="form-control" type="number" min="0" max="10" v-model.number="form[s.key]" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Annuler</button>
          <button class="btn btn-primary" @click="save">{{ editingId ? 'Modifier' : 'Créer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const items = ref([])
const orgas = ref([])
const empls = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingId = ref(null)

// Filters
const filterOrga = ref('')
const searchQuery = ref('')

const orgaOptions = computed(() => {
  const names = new Set()
  for (const p of items.value) { if (p.nom_Organisation) names.add(p.nom_Organisation) }
  return [...names].sort()
})

const filteredItems = computed(() => {
  let list = items.value
  if (filterOrga.value) list = list.filter(p => p.nom_Organisation === filterOrga.value)
  const q = searchQuery.value.toLowerCase().trim()
  if (q) list = list.filter(p => p.nom_PNJ.toLowerCase().includes(q) || (p.nom_Emplacement || '').toLowerCase().includes(q))
  // Sort by org then name
  return [...list].sort((a, b) => (a.nom_Organisation || '').localeCompare(b.nom_Organisation || '') || a.nom_PNJ.localeCompare(b.nom_PNJ))
})

const statKeys = [
  { key: 'nv_Chasse', label: 'Chasse' }, { key: 'nv_Combat', label: 'Combat' },
  { key: 'nv_Vitesse', label: 'Vitesse' }, { key: 'nv_Endurance', label: 'Endurance' },
  { key: 'nv_Memoire', label: 'Mémoire' }, { key: 'nv_Intimidation', label: 'Intimidation' }
]

const defaultForm = () => ({
  nom_PNJ: '', pp_PNJ: '', id_Organisation: null, id_Emplacement: null,
  nv_Chasse: 0, nv_Combat: 0, nv_Vitesse: 0, nv_Endurance: 0, nv_Memoire: 0, nv_Intimidation: 0
})
const form = ref(defaultForm())

async function load() {
  loading.value = true
  try {
    const [r1, r2, r3] = await Promise.all([api.getPNJs(), api.getOrganisations(), api.getEmplacements()])
    items.value = r1.data; orgas.value = r2.data; empls.value = r3.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) { editingId.value = item.id_PNJ; form.value = { ...item } }
  else { editingId.value = null; form.value = defaultForm(); if (orgas.value.length) form.value.id_Organisation = orgas.value[0].id_Organisation; if (empls.value.length) form.value.id_Emplacement = empls.value[0].id_Emplacement }
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) { await api.updatePNJ(editingId.value, form.value); toast('PNJ modifié') }
    else { await api.createPNJ(form.value); toast('PNJ créé') }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer ce PNJ ?')) return
  try { await api.deletePNJ(id); toast('PNJ supprimé'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
