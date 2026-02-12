<template>
  <div>
    <div class="page-header">
      <h1>Temps / Météo</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">🌦️</div>
      <p>Aucune configuration de temps</p>
    </div>
    <div v-else class="card-grid">
      <div class="card" v-for="t in items" :key="t.id_Temps">
        <div class="flex items-center justify-between">
          <div>
            <div class="card-title">Temps #{{ t.id_Temps }}</div>
            <div class="text-sm">Difficulté: <strong :class="t.nv_difficulte > 5 ? 'text-accent' : ''">{{ t.nv_difficulte }}</strong></div>
          </div>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" @click="openModal(t)">✏️</button>
            <button class="btn btn-danger btn-sm" @click="remove(t.id_Temps)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouveau' }} Temps</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Niveau de difficulté</label>
            <input class="form-control" type="number" min="0" max="10" v-model.number="form.nv_difficulte" />
            <div class="text-sm text-muted mt-1">Chaque point retire 5% au taux de réussite de chasse</div>
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
const form = ref({ nv_difficulte: 0 })

async function load() {
  loading.value = true
  try { items.value = (await api.getTemps()).data } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) { editingId.value = item.id_Temps; form.value = { nv_difficulte: item.nv_difficulte } }
  else { editingId.value = null; form.value = { nv_difficulte: 0 } }
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) { await api.updateTemps(editingId.value, form.value); toast('Temps modifié') }
    else { await api.createTemps(form.value); toast('Temps créé') }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer ce temps ?')) return
  try { await api.deleteTemps(id); toast('Temps supprimé'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
