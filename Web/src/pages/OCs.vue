<template>
  <div>
    <div class="page-header">
      <h1>Personnages (OC)</h1>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" @click="resetAll">🔄 Reset quotidien</button>
        <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
      </div>
    </div>

    <!-- Filtre rapide -->
    <div class="flex gap flex-wrap mb-2">
      <button class="btn btn-sm" :class="filter === '' ? 'btn-primary' : 'btn-secondary'" @click="filter = ''">Tous</button>
      <button v-for="o in orgas" :key="o.id_Organisation" class="btn btn-sm" :class="filter === o.id_Organisation ? 'btn-primary' : 'btn-secondary'" @click="filter = o.id_Organisation">
        {{ o.nom_Organisation }}
      </button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="filteredItems.length === 0" class="empty">
      <div class="empty-icon">🐱</div>
      <p>Aucun OC enregistré</p>
    </div>
    <div v-else class="card-grid">
      <div class="oc-card" v-for="oc in filteredItems" :key="oc.id_OC">
        <div class="oc-card-header">
          <img v-if="oc.pp_OC && oc.pp_OC.startsWith('http')" :src="oc.pp_OC" :alt="oc.nom_OC" class="oc-avatar" />
          <div v-else class="oc-avatar-placeholder">🐱</div>
          <div style="min-width:0;flex:1;">
            <div class="flex items-center gap-sm flex-wrap">
              <strong class="truncate">{{ oc.nom_OC }}</strong>
              <span class="badge" :class="getBadgeClass(oc.nom_Organisation)">{{ oc.nom_Organisation }}</span>
            </div>
            <div class="text-sm text-muted">{{ oc.nom_Emplacement }}</div>
          </div>
        </div>
        <div class="oc-card-body">
          <div class="stat-bar" v-for="s in stats" :key="s.key">
            <span class="stat-bar-label">{{ s.label }}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" :style="{ width: (oc[s.key] / 10 * 100) + '%', background: s.color }"></div>
            </div>
            <span class="stat-bar-value">{{ oc[s.key] }}</span>
          </div>
          <div class="flex justify-between mt-1 text-sm">
            <span class="text-muted">Prises: {{ oc.nbr_Prise_Jour }}/3</span>
            <span class="text-muted">Tentatives: {{ oc.nbr_Tentative }}/6</span>
          </div>
        </div>
        <div class="oc-card-actions">
          <button class="btn btn-secondary btn-sm" @click="openModal(oc)" style="flex:1">✏️ Modifier</button>
          <button class="btn btn-secondary btn-sm" @click="resetOne(oc.id_OC)">🔄</button>
          <button class="btn btn-danger btn-sm" @click="remove(oc.id_OC)">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Modal ajout/edition -->
    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouvel' }} OC</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Nom</label>
              <input class="form-control" v-model="form.nom_OC" placeholder="Nom de l'OC" />
            </div>
            <div class="form-group">
              <label>Photo de profil (URL)</label>
              <input class="form-control" v-model="form.pp_OC" placeholder="https://..." />
            </div>
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
          <h4 style="font-family:var(--font-display);color:var(--accent);margin:1rem 0 0.5rem;">Compétences</h4>
          <div class="form-row form-row-3">
            <div class="form-group" v-for="s in stats" :key="s.key">
              <label>{{ s.label }}</label>
              <input class="form-control" type="number" min="0" max="10" v-model.number="form[s.key]" />
            </div>
          </div>
          <div class="text-sm text-muted mt-1">
            Total: {{ totalPoints }}/{{ maxPoints }} points
            <span v-if="totalPoints > maxPoints" style="color:var(--danger)"> (dépassé!)</span>
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
const filter = ref('')
const maxPoints = 50

const stats = [
  { key: 'nv_Chasse', label: 'Chasse', color: '#22c55e' },
  { key: 'nv_Combat', label: 'Combat', color: '#ef4444' },
  { key: 'nv_Vitesse', label: 'Vitesse', color: '#3b82f6' },
  { key: 'nv_Endurance', label: 'Endurance', color: '#f59e0b' },
  { key: 'nv_Memoire', label: 'Mémoire', color: '#a855f7' },
  { key: 'nv_Intimidation', label: 'Intimidation', color: '#ec4899' }
]

const defaultForm = () => ({
  nom_OC: '', pp_OC: '', id_Organisation: null, id_Emplacement: null,
  nv_Chasse: 0, nv_Combat: 0, nv_Vitesse: 0, nv_Endurance: 0, nv_Memoire: 0, nv_Intimidation: 0
})

const form = ref(defaultForm())

const totalPoints = computed(() => stats.reduce((sum, s) => sum + (form.value[s.key] || 0), 0))

const filteredItems = computed(() =>
  filter.value === '' ? items.value : items.value.filter(i => i.id_Organisation === filter.value)
)

function getBadgeClass(nom) {
  if (!nom) return 'badge-neutre'
  const n = nom.toLowerCase()
  if (n.includes('rive')) return 'badge-rive'
  if (n.includes('ombre')) return 'badge-ombre'
  if (n.includes('forêt') || n.includes('foret') || n.includes('alliance')) return 'badge-foret'
  return 'badge-neutre'
}

async function load() {
  loading.value = true
  try {
    const [ocRes, orgaRes, emplRes] = await Promise.all([api.getOCs(), api.getOrganisations(), api.getEmplacements()])
    items.value = ocRes.data
    orgas.value = orgaRes.data
    empls.value = emplRes.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(oc = null) {
  if (oc) {
    editingId.value = oc.id_OC
    form.value = { ...oc }
  } else {
    editingId.value = null
    form.value = defaultForm()
    if (orgas.value.length) form.value.id_Organisation = orgas.value[0].id_Organisation
    if (empls.value.length) form.value.id_Emplacement = empls.value[0].id_Emplacement
  }
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) {
      await api.updateOC(editingId.value, form.value)
      toast('OC modifié')
    } else {
      await api.createOC(form.value)
      toast('OC créé')
    }
    showModal.value = false
    load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer cet OC ?')) return
  try { await api.deleteOC(id); toast('OC supprimé'); load() }
  catch (e) { toast(e.message, 'error') }
}

async function resetOne(id) {
  try { await api.resetDailyOC(id); toast('Compteurs réinitialisés'); load() }
  catch (e) { toast(e.message, 'error') }
}

async function resetAll() {
  if (!confirm('Réinitialiser les compteurs de TOUS les OC ?')) return
  try { await api.resetAllDaily(); toast('Tous les compteurs réinitialisés'); load() }
  catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
