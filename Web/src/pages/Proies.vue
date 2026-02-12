<template>
  <div>
    <div class="page-header">
      <h1>Proies</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">🐿️</div>
      <p>Aucune proie enregistrée</p>
    </div>
    <div v-else class="card-grid">
      <div class="card" v-for="p in items" :key="p.id_Proie">
        <div class="flex items-center gap mb-1">
          <img v-if="p.pp_Proie?.startsWith('http')" :src="p.pp_Proie" class="oc-avatar" style="width:40px;height:40px;" />
          <div v-else class="oc-avatar-placeholder" style="width:40px;height:40px;font-size:1rem;">🐿️</div>
          <div style="flex:1;min-width:0;">
            <div class="flex items-center justify-between">
              <strong class="truncate">{{ p.nom_Proie }}</strong>
              <div class="btn-group">
                <button class="btn btn-secondary btn-sm btn-icon" @click="openModal(p)">✏️</button>
                <button class="btn btn-danger btn-sm btn-icon" @click="remove(p.id_Proie)">🗑️</button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap flex-wrap text-sm">
          <span>Vitesse: <strong>{{ p.nv_Vitesse }}</strong></span>
          <span>Endurance: <strong>{{ p.nv_Endurance }}</strong></span>
          <span>Rareté: <strong>{{ p.nv_Rarete }}</strong></span>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouvelle' }} Proie</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>Nom</label><input class="form-control" v-model="form.nom_Proie" placeholder="Ex: Grive" /></div>
            <div class="form-group"><label>Image (URL)</label><input class="form-control" v-model="form.pp_Proie" /></div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group"><label>Vitesse</label><input class="form-control" type="number" min="0" max="10" v-model.number="form.nv_Vitesse" /></div>
            <div class="form-group"><label>Endurance</label><input class="form-control" type="number" min="0" max="10" v-model.number="form.nv_Endurance" /></div>
            <div class="form-group"><label>Rareté</label><input class="form-control" type="number" min="0" max="10" v-model.number="form.nv_Rarete" /></div>
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
import { ref, onMounted, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const items = ref([]); const loading = ref(true)
const showModal = ref(false); const editingId = ref(null)
const form = ref({ nom_Proie: '', pp_Proie: '', nv_Vitesse: 0, nv_Endurance: 0, nv_Rarete: 0 })

async function load() {
  loading.value = true
  try { items.value = (await api.getProies()).data } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) { editingId.value = item.id_Proie; form.value = { ...item } }
  else { editingId.value = null; form.value = { nom_Proie: '', pp_Proie: '', nv_Vitesse: 0, nv_Endurance: 0, nv_Rarete: 0 } }
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) { await api.updateProie(editingId.value, form.value); toast('Proie modifiée') }
    else { await api.createProie(form.value); toast('Proie créée') }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer cette proie ?')) return
  try { await api.deleteProie(id); toast('Proie supprimée'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
