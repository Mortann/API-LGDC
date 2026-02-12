<template>
  <div>
    <div class="page-header">
      <h1>Messages RP</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <!-- Filtres par type -->
    <div class="flex gap flex-wrap mb-2">
      <button class="btn btn-sm" :class="typeFilter === '' ? 'btn-primary' : 'btn-secondary'" @click="typeFilter = ''">Tous</button>
      <button class="btn btn-sm" :class="typeFilter === 'RECHERCHE' ? 'btn-primary' : 'btn-secondary'" @click="typeFilter = 'RECHERCHE'">🔍 Recherche</button>
      <button class="btn btn-sm" :class="typeFilter === 'CAPTURE' ? 'btn-primary' : 'btn-secondary'" @click="typeFilter = 'CAPTURE'">✅ Capture</button>
      <button class="btn btn-sm" :class="typeFilter === 'ECHEC' ? 'btn-primary' : 'btn-secondary'" @click="typeFilter = 'ECHEC'">❌ Échec</button>
      <select class="form-control" v-model="proieFilter" style="max-width:200px;">
        <option value="">Toutes les proies</option>
        <option value="__none__">Sans proie liée</option>
        <option v-for="p in proies" :key="p.id_Proie" :value="String(p.id_Proie)">{{ p.nom_Proie }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="filtered.length === 0" class="empty">
      <div class="empty-icon">💬</div>
      <p>Aucun message</p>
    </div>
    <div v-else>
      <div class="card mb-1" v-for="m in filtered" :key="m.id_Message">
        <div class="flex items-center justify-between mb-1 flex-wrap gap-sm">
          <span class="badge" :class="typeBadge(m.type_Message)">{{ m.type_Message }}</span>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" @click="openModal(m)">✏️</button>
            <button class="btn btn-danger btn-sm" @click="remove(m.id_Message)">🗑️</button>
          </div>
        </div>
        <p class="text-sm" style="font-style:italic;line-height:1.5;">{{ m.contenu_Message }}</p>
        <div class="text-sm text-muted mt-1">
          <span v-if="m.proies_liees">🦊 Proies: {{ m.proies_liees }}</span>
          <span v-else>🦊 Aucune proie liée</span>
          &nbsp;| Placeholders: <code>{nom_OC}</code>, <code>{nom_Proie}</code>, <code>{pp_OC}</code>, <code>{pp_Proie}</code>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouveau' }} Message</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Type</label>
            <select class="form-control" v-model="form.type_Message">
              <option value="RECHERCHE">Recherche</option>
              <option value="CAPTURE">Capture</option>
              <option value="ECHEC">Échec</option>
            </select>
          </div>
          <div class="form-group">
            <label>Contenu du message</label>
            <textarea class="form-control" v-model="form.contenu_Message" rows="4" placeholder="Utilisez {nom_OC} et {nom_Proie} pour les noms dynamiques"></textarea>
          </div>
          <div class="form-group">
            <label>Lier à une proie (optionnel)</label>
            <select class="form-control" v-model="linkProieId">
              <option :value="null">— Aucune —</option>
              <option v-for="p in proies" :key="p.id_Proie" :value="p.id_Proie">{{ p.nom_Proie }}</option>
            </select>
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
const items = ref([]); const proies = ref([])
const loading = ref(true); const showModal = ref(false); const editingId = ref(null)
const typeFilter = ref('')
const proieFilter = ref('')
const form = ref({ contenu_Message: '', type_Message: 'CAPTURE' })
const linkProieId = ref(null)

const filtered = computed(() => {
  let list = items.value
  if (typeFilter.value) list = list.filter(m => m.type_Message === typeFilter.value)
  if (proieFilter.value === '__none__') {
    list = list.filter(m => !m.proies_ids)
  } else if (proieFilter.value) {
    list = list.filter(m => {
      if (!m.proies_ids) return false
      const ids = String(m.proies_ids).split(',')
      return ids.includes(proieFilter.value)
    })
  }
  return list
})

function typeBadge(t) {
  if (t === 'CAPTURE') return 'badge-success'
  if (t === 'ECHEC') return 'badge-danger'
  return 'badge-warning'
}

async function load() {
  loading.value = true
  try {
    const [r1, r2] = await Promise.all([api.getMessages(), api.getProies()])
    items.value = r1.data; proies.value = r2.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) { editingId.value = item.id_Message; form.value = { contenu_Message: item.contenu_Message, type_Message: item.type_Message } }
  else { editingId.value = null; form.value = { contenu_Message: '', type_Message: 'CAPTURE' } }
  linkProieId.value = null
  showModal.value = true
}

async function save() {
  try {
    let msgId = editingId.value
    if (editingId.value) { await api.updateMessage(editingId.value, form.value); toast('Message modifié') }
    else {
      const res = await api.createMessage(form.value)
      msgId = res.data.id_Message
      toast('Message créé')
    }
    if (linkProieId.value && msgId) {
      try { await api.linkMessageProie(msgId, linkProieId.value); toast('Message lié à la proie') }
      catch (e) { toast('Erreur liaison: ' + e.message, 'error') }
    }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer ce message ?')) return
  try { await api.deleteMessage(id); toast('Message supprimé'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
</script>
