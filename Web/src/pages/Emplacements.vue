<template>
  <div>
    <div class="page-header">
      <h1>Emplacements</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div class="flex gap flex-wrap mb-2" v-if="!loading && items.length > 0">
      <div class="form-group" style="flex:2;min-width:180px;">
        <input class="form-control" v-model="searchQuery" placeholder="Rechercher un emplacement..." />
      </div>
      <div class="form-group" style="flex:1;min-width:150px;">
        <select class="form-control" v-model="filterOrga">
          <option value="">Toutes les organisations</option>
          <option v-for="o in orgaFilterOptions" :key="o" :value="o">{{ o }}</option>
        </select>
      </div>
      <div class="form-group" style="flex:1;min-width:130px;">
        <select class="form-control" v-model="sortBy">
          <option value="org">Tri: Organisation</option>
          <option value="nom">Tri: Nom A-Z</option>
          <option value="salon">Tri: Avec salon</option>
          <option value="position">Tri: Avec position</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="groupedItems.length === 0" class="empty">
      <div class="empty-icon">📍</div>
      <p>Aucun emplacement trouvé</p>
    </div>
    <div v-else class="card-grid-grouped">
      <div v-for="group in groupedItems" :key="group.orgName" class="org-group">
        <h3 class="org-group-title">
          <span class="badge" :class="getBadgeClass(group.orgName)">{{ group.orgName }}</span>
          <span class="text-sm text-muted">({{ group.items.length }})</span>
        </h3>
        <div class="card-grid">
          <div class="card" v-for="item in group.items" :key="item.id_Emplacement">
            <div class="flex items-center justify-between mb-1">
              <div class="card-title" style="margin:0">{{ item.nom_Emplacement }}</div>
              <div class="btn-group">
                <button class="btn btn-secondary btn-sm" @click="openModal(item)">✏️</button>
                <button class="btn btn-danger btn-sm" @click="remove(item.id_Emplacement)">🗑️</button>
              </div>
            </div>
            <div class="text-sm text-muted mt-1" v-if="item.id_SalonDiscord">Salon: #{{ getChannelName(item.id_SalonDiscord) }}</div>
            <div class="text-sm text-muted" v-if="item.pos_x != null">Position: {{ item.pos_x.toFixed(1) }}%, {{ item.pos_y.toFixed(1) }}%</div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editing ? 'Modifier' : 'Nouvel' }} Emplacement</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom de l'emplacement</label>
            <input class="form-control" v-model="form.nom_Emplacement" placeholder="Ex: Rivière du sud" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Organisation (optionnel)</label>
              <select class="form-control" v-model="form.id_Organisation">
                <option :value="null">— Aucune —</option>
                <option v-for="o in orgas" :key="o.id_Organisation" :value="o.id_Organisation">{{ o.nom_Organisation }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Salon Discord (optionnel)</label>
              <div class="channel-selector" v-if="discordChannels.length > 0">
                <div v-if="form.id_SalonDiscord" class="channel-selected">
                  <span># {{ getChannelName(form.id_SalonDiscord) }}</span>
                  <button class="btn btn-danger btn-sm" style="padding:0.1rem 0.4rem;" @click="form.id_SalonDiscord = ''">✕</button>
                </div>
                <template v-else>
                  <input class="form-control" v-model="channelSearch" @focus="showChannelDropdown = true" @blur="hideChannelDropdown" placeholder="Rechercher un salon..." />
                  <div class="channel-dropdown" v-if="showChannelDropdown && filteredChannels.length > 0">
                    <div class="channel-option" v-for="c in filteredChannels" :key="c.id" @mousedown.prevent="selectChannel(c)">
                      <span class="text-muted">#</span> {{ c.name }} <span class="text-sm text-muted" v-if="c.category">({{ c.category }})</span>
                    </div>
                  </div>
                </template>
              </div>
              <input v-else class="form-control" v-model="form.id_SalonDiscord" placeholder="ID du salon (bot non connecté)" />
            </div>
          </div>
          <div class="form-group">
            <label>Position sur la carte</label>
            <div class="flex items-center gap-sm flex-wrap">
              <button class="btn btn-secondary" type="button" @click="openMapModal">
                {{ form.pos_x != null ? 'Modifier la position' : 'Placer sur la carte' }}
              </button>
              <span v-if="form.pos_x != null" class="flex items-center gap-sm">
                <span class="text-sm text-muted">X: {{ form.pos_x.toFixed(1) }}% — Y: {{ form.pos_y.toFixed(1) }}%</span>
                <button class="btn btn-danger btn-sm" style="padding:0.15rem 0.5rem;" @click="form.pos_x = null; form.pos_y = null">✕</button>
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Annuler</button>
          <button class="btn btn-primary" @click="save">{{ editing ? 'Modifier' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- Map picker modal -->
    <div class="modal-overlay" v-if="showMapModal" @click.self="closeMapModal" style="z-index:200;">
      <div class="map-modal" @click.stop>
        <div class="map-modal-header">
          <div>
            <h2>Placer sur la carte</h2>
            <span class="text-sm text-muted">Cliquez pour placer — Molette pour zoomer — Glisser pour déplacer</span>
          </div>
          <button class="modal-close" @click="closeMapModal">&times;</button>
        </div>
        <div class="map-modal-body" ref="mapModalContainer">
          <div ref="mapModalWrapper" class="map-modal-wrapper">
            <img src="/map.png" ref="mapModalImage" draggable="false" @click="pickMapPosition" />
            <div v-if="tempMapPos" class="map-picker-marker" :style="{ left: tempMapPos.x + '%', top: tempMapPos.y + '%' }">
              <div class="map-picker-dot"></div>
              <span class="map-picker-label">{{ form.nom_Emplacement || '?' }}</span>
            </div>
          </div>
        </div>
        <div class="map-modal-footer">
          <span class="text-sm text-muted" v-if="tempMapPos">Position: {{ tempMapPos.x.toFixed(1) }}%, {{ tempMapPos.y.toFixed(1) }}%</span>
          <div class="flex gap-sm" style="margin-left:auto;">
            <button class="btn btn-secondary" @click="closeMapModal">Annuler</button>
            <button class="btn btn-primary" @click="confirmMapPosition" :disabled="!tempMapPos">Confirmer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'
import panzoom from 'panzoom'
import api from '../services/api.js'

const toast = inject('toast')
const items = ref([])
const orgas = ref([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref(null)
const form = ref({ nom_Emplacement: '', id_Organisation: null, id_SalonDiscord: '', pos_x: null, pos_y: null })

// Search & Filters
const searchQuery = ref('')
const filterOrga = ref('')
const sortBy = ref('org')

const orgaFilterOptions = computed(() => {
  const names = new Set()
  for (const i of items.value) { if (i.nom_Organisation) names.add(i.nom_Organisation) }
  return [...names].sort()
})

const filteredItems = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let list = items.value
  if (q) list = list.filter(i =>
    i.nom_Emplacement.toLowerCase().includes(q) ||
    (i.nom_Organisation || '').toLowerCase().includes(q)
  )
  if (filterOrga.value) list = list.filter(i => (i.nom_Organisation || 'Neutre') === filterOrga.value)
  // Sort
  if (sortBy.value === 'nom') {
    list = [...list].sort((a, b) => a.nom_Emplacement.localeCompare(b.nom_Emplacement))
  } else if (sortBy.value === 'salon') {
    list = [...list].sort((a, b) => (b.id_SalonDiscord ? 1 : 0) - (a.id_SalonDiscord ? 1 : 0))
  } else if (sortBy.value === 'position') {
    list = [...list].sort((a, b) => (b.pos_x != null ? 1 : 0) - (a.pos_x != null ? 1 : 0))
  }
  return list
})

// Group filtered items by organisation
const groupedItems = computed(() => {
  const groups = {}
  for (const item of filteredItems.value) {
    const orgName = item.nom_Organisation || 'Neutre'
    if (!groups[orgName]) groups[orgName] = []
    groups[orgName].push(item)
  }
  // Sort: named orgs first (alphabetical), 'Neutre' last
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Neutre') return 1
    if (b === 'Neutre') return -1
    return a.localeCompare(b)
  })
  return keys.map(orgName => ({ orgName, items: groups[orgName] }))
})

// Discord channels
const discordChannels = ref([])
const channelSearch = ref('')
const showChannelDropdown = ref(false)
let channelDropdownTimeout = null

const filteredChannels = computed(() => {
  const q = channelSearch.value.toLowerCase().trim()
  if (!q) return discordChannels.value
  return discordChannels.value.filter(c => c.name.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q))
})

function getChannelName(id) {
  const ch = discordChannels.value.find(c => c.id === id)
  return ch ? ch.name : id
}

function selectChannel(c) {
  form.value.id_SalonDiscord = c.id
  channelSearch.value = ''
  showChannelDropdown.value = false
}

function hideChannelDropdown() {
  channelDropdownTimeout = setTimeout(() => { showChannelDropdown.value = false }, 200)
}

async function loadChannels() {
  try {
    const res = await api.getDiscordChannels()
    discordChannels.value = res.data || []
  } catch { discordChannels.value = [] }
}

// Map modal
const showMapModal = ref(false)
const mapModalContainer = ref(null)
const mapModalWrapper = ref(null)
const mapModalImage = ref(null)
const tempMapPos = ref(null)
let mapPz = null

function openMapModal() {
  tempMapPos.value = form.value.pos_x != null ? { x: form.value.pos_x, y: form.value.pos_y } : null
  showMapModal.value = true
  nextTick(() => setTimeout(initMapPanZoom, 100))
}

function initMapPanZoom() {
  if (mapPz) mapPz.dispose()
  if (!mapModalWrapper.value) return
  mapPz = panzoom(mapModalWrapper.value, {
    maxZoom: 5, minZoom: 0.3, bounds: true, boundsPadding: 0.1, smoothScroll: true
  })
}

function pickMapPosition(e) {
  const img = mapModalImage.value
  if (!img) return
  const rect = img.getBoundingClientRect()
  tempMapPos.value = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100
  }
}

function confirmMapPosition() {
  if (tempMapPos.value) {
    form.value.pos_x = tempMapPos.value.x
    form.value.pos_y = tempMapPos.value.y
  }
  closeMapModal()
}

function closeMapModal() {
  showMapModal.value = false
  if (mapPz) { mapPz.dispose(); mapPz = null }
}

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
    const [emplRes, orgaRes] = await Promise.all([api.getEmplacements(), api.getOrganisations()])
    items.value = emplRes.data
    orgas.value = orgaRes.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  editing.value = item ? item.id_Emplacement : null
  form.value = {
    nom_Emplacement: item ? item.nom_Emplacement : '',
    id_Organisation: item ? item.id_Organisation : null,
    id_SalonDiscord: item ? (item.id_SalonDiscord || '') : '',
    pos_x: item ? item.pos_x : null,
    pos_y: item ? item.pos_y : null
  }
  channelSearch.value = ''
  showChannelDropdown.value = false
  showModal.value = true
}

async function save() {
  try {
    if (editing.value) {
      await api.updateEmplacement(editing.value, form.value)
      toast('Emplacement modifié')
    } else {
      await api.createEmplacement(form.value)
      toast('Emplacement créé')
    }
    showModal.value = false
    load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer cet emplacement ?')) return
  try {
    await api.deleteEmplacement(id)
    toast('Emplacement supprimé')
    load()
  } catch (e) { toast(e.message, 'error') }
}

onMounted(() => { load(); loadChannels() })
onBeforeUnmount(() => { if (mapPz) mapPz.dispose(); if (channelDropdownTimeout) clearTimeout(channelDropdownTimeout) })
</script>

<style scoped>
/* Grouped layout */
.card-grid-grouped { display: flex; flex-direction: column; gap: 1.5rem; }
.org-group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-family: var(--font-display);
  font-size: 1rem;
}

/* Channel selector */
.channel-selector { position: relative; }
.channel-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
}
.channel-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  max-height: 200px;
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.channel-option {
  padding: 0.45rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.channel-option:hover { background: rgba(255,255,255,0.05); }

/* Map modal */
.map-modal {
  width: 90vw;
  max-width: 1100px;
  height: 80vh;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--border);
}
.map-modal-header h2 { margin: 0; font-size: 1.1rem; }
.map-modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: crosshair;
  background: var(--bg);
}
.map-modal-wrapper { position: relative; display: inline-block; }
.map-modal-wrapper img { display: block; max-width: none; }
.map-modal-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.2rem;
  border-top: 1px solid var(--border);
}

/* Shared marker styles */
.map-picker-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.map-picker-dot {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(201,168,76,0.6);
  animation: pulse 1.5s infinite;
}
.map-picker-label {
  margin-top: 2px;
  font-size: 0.7rem;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}
</style>
