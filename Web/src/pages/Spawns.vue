<template>
  <div>
    <div class="page-header">
      <h1>Spawns de Proies</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">🌿</div>
      <p>Aucun spawn configuré</p>
    </div>
    <template v-else>
      <!-- Filters & Sort -->
      <div class="flex gap flex-wrap mb-2">
        <div class="form-group" style="flex:1;min-width:150px;">
          <select class="form-control" v-model="filterOrga">
            <option value="">Toutes les organisations</option>
            <option v-for="o in orgaOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:150px;">
          <select class="form-control" v-model="filterEmpl">
            <option value="">Tous les emplacements</option>
            <option v-for="e in emplOptions" :key="e.id_Emplacement" :value="e.id_Emplacement">{{ e.nom_Emplacement }}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:120px;">
          <select class="form-control" v-model="sortBy">
            <option value="emplacement">Tri: Emplacement</option>
            <option value="proie">Tri: Proie</option>
            <option value="difficulte">Tri: Difficulté</option>
            <option value="quantite">Tri: Quantité</option>
          </select>
        </div>
      </div>
      <div v-if="sorted.length === 0" class="empty"><p>Aucun résultat</p></div>
      <div v-else class="card-grid">
        <div class="card" v-for="s in sorted" :key="s.id_Spawn">
          <div class="flex items-center justify-between mb-1">
            <div>
              <strong>{{ s.nom_Proie }}</strong>
              <div class="text-sm text-muted">📍 {{ s.nom_Emplacement }} <span v-if="s.nom_Organisation">— {{ s.nom_Organisation }}</span></div>
            </div>
            <div class="btn-group">
              <button class="btn btn-secondary btn-sm" @click="openModal(s)">✏️</button>
              <button class="btn btn-danger btn-sm" @click="remove(s.id_Spawn)">🗑️</button>
            </div>
          </div>
          <div class="flex gap flex-wrap text-sm mt-1">
            <span class="badge" :class="s.nbr_Proie > 0 ? 'badge-success' : 'badge-danger'">{{ s.nbr_Proie }} / {{ s.limite_Proie }}</span>
            <span class="text-muted">Difficulté: {{ s.nv_difficulte }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouveau' }} Spawn</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Proie</label>
              <select class="form-control" v-model="form.id_Proie">
                <option v-for="p in proies" :key="p.id_Proie" :value="p.id_Proie">{{ p.nom_Proie }}</option>
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
            <div class="form-group"><label>Nombre actuel</label><input class="form-control" type="number" min="0" v-model.number="form.nbr_Proie" /></div>
            <div class="form-group"><label>Limite max</label><input class="form-control" type="number" min="1" v-model.number="form.limite_Proie" /></div>
            <div class="form-group">
              <label>Temps</label>
              <select class="form-control" v-model="form.id_Temps">
                <option v-for="t in temps" :key="t.id_Temps" :value="t.id_Temps">Temps #{{ t.id_Temps }} (diff: {{ t.nv_difficulte }})</option>
              </select>
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
const items = ref([]); const proies = ref([]); const empls = ref([]); const temps = ref([])
const loading = ref(true); const showModal = ref(false); const editingId = ref(null)
const form = ref({ id_Proie: null, id_Emplacement: null, nbr_Proie: 5, limite_Proie: 10, id_Temps: null })

// Filters & Sort
const filterOrga = ref('')
const filterEmpl = ref('')
const sortBy = ref('emplacement')

const orgaOptions = computed(() => {
  const names = new Set()
  for (const e of empls.value) { if (e.nom_Organisation) names.add(e.nom_Organisation) }
  return [...names].sort()
})

const emplOptions = computed(() => {
  if (!filterOrga.value) return empls.value
  return empls.value.filter(e => e.nom_Organisation === filterOrga.value)
})

const sorted = computed(() => {
  let list = items.value
  // Enrich with org info from emplacements
  list = list.map(s => {
    const empl = empls.value.find(e => e.id_Emplacement === s.id_Emplacement)
    return { ...s, nom_Organisation: empl?.nom_Organisation || '' }
  })
  // Filter by org
  if (filterOrga.value) list = list.filter(s => s.nom_Organisation === filterOrga.value)
  // Filter by emplacement
  if (filterEmpl.value) list = list.filter(s => s.id_Emplacement === filterEmpl.value)
  // Sort
  const cmp = (a, b) => {
    if (sortBy.value === 'proie') return (a.nom_Proie || '').localeCompare(b.nom_Proie || '')
    if (sortBy.value === 'difficulte') return (b.nv_difficulte || 0) - (a.nv_difficulte || 0)
    if (sortBy.value === 'quantite') return (b.nbr_Proie || 0) - (a.nbr_Proie || 0)
    return (a.nom_Emplacement || '').localeCompare(b.nom_Emplacement || '')
  }
  return [...list].sort(cmp)
})

async function load() {
  loading.value = true
  try {
    const [r1, r2, r3, r4] = await Promise.all([api.getSpawns(), api.getProies(), api.getEmplacements(), api.getTemps()])
    items.value = r1.data; proies.value = r2.data; empls.value = r3.data; temps.value = r4.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) {
    editingId.value = item.id_Spawn
    form.value = { id_Proie: item.id_Proie, id_Emplacement: item.id_Emplacement, nbr_Proie: item.nbr_Proie, limite_Proie: item.limite_Proie, id_Temps: item.id_Temps }
  } else {
    editingId.value = null
    form.value = {
      id_Proie: proies.value[0]?.id_Proie || null,
      id_Emplacement: empls.value[0]?.id_Emplacement || null,
      nbr_Proie: 5, limite_Proie: 10,
      id_Temps: temps.value[0]?.id_Temps || null
    }
  }
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) { await api.updateSpawn(editingId.value, form.value); toast('Spawn modifié') }
    else { await api.createSpawn(form.value); toast('Spawn créé') }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer ce spawn ?')) return
  try { await api.deleteSpawn(id); toast('Spawn supprimé'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
