<template>
  <div>
    <div class="page-header">
      <h1>Organisations</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">⚔️</div>
      <p>Aucune organisation enregistrée</p>
    </div>
    <div v-else class="card-grid">
      <div class="card" v-for="item in items" :key="item.id_Organisation">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-sm">
            <img v-if="item.logo_url" :src="item.logo_url" class="org-logo" />
            <div class="card-title">{{ item.nom_Organisation }}</div>
          </div>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" @click="openModal(item)">✏️</button>
            <button class="btn btn-danger btn-sm" @click="remove(item.id_Organisation)">🗑️</button>
          </div>
        </div>
        <div class="flex items-center gap-sm mt-1 flex-wrap">
          <div class="text-sm text-muted">ID: {{ item.id_Organisation }}</div>
          <div v-if="item.couleur_Zone" class="text-sm flex items-center gap-sm">
            <span class="color-dot" :style="{ background: item.couleur_Zone }"></span>
            {{ item.couleur_Zone }}
          </div>
          <div v-if="item.zone_x != null && !item.zone_points" class="text-sm text-muted">Zone: {{ item.zone_x }}%, {{ item.zone_y }}% → {{ item.zone_w }}% × {{ item.zone_h }}%</div>
          <div v-if="item.zone_points" class="text-sm text-muted">Zone polygone ({{ getPointCount(item.zone_points) }} pts)</div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editing ? 'Modifier' : 'Nouvelle' }} Organisation</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nom de l'organisation</label>
            <input class="form-control" v-model="form.nom_Organisation" placeholder="Ex: Clan de la Rive" />
          </div>
          <div class="form-group">
            <label>Logo (URL image)</label>
            <input class="form-control" v-model="form.logo_url" placeholder="https://example.com/logo.png" />
            <img v-if="form.logo_url" :src="form.logo_url" class="org-logo-preview" @error="form.logo_url = ''" />
          </div>
          <div class="form-group">
            <label>Couleur de zone</label>
            <div class="flex items-center gap-sm">
              <input type="color" v-model="form.couleur_Zone" style="width:40px;height:32px;border:none;cursor:pointer;" />
              <input class="form-control" v-model="form.couleur_Zone" placeholder="Ex: #5b9bd5" style="flex:1;" />
            </div>
          </div>

          <!-- Zone polygon editor -->
          <div class="form-group">
            <label>Zone sur la carte (polygone)</label>
            <div class="flex items-center gap-sm flex-wrap">
              <button type="button" class="btn btn-secondary" @click="openZoneModal">
                {{ polygonPoints.length >= 3 ? `Modifier la zone (${polygonPoints.length} pts)` : 'Dessiner la zone' }}
              </button>
              <button type="button" class="btn btn-danger btn-sm" v-if="polygonPoints.length > 0" @click="clearPolygon">Effacer zone</button>
            </div>
          </div>

          <!-- Fallback: old rect fields (hidden if polygon has points) -->
          <div class="form-group" v-if="polygonPoints.length === 0">
            <label>Zone rectangulaire (ancien mode, en %)</label>
            <div class="form-row">
              <div class="form-group">
                <label class="text-sm text-muted">X</label>
                <input class="form-control" type="number" v-model.number="form.zone_x" step="0.1" min="0" max="100" placeholder="%" />
              </div>
              <div class="form-group">
                <label class="text-sm text-muted">Y</label>
                <input class="form-control" type="number" v-model.number="form.zone_y" step="0.1" min="0" max="100" placeholder="%" />
              </div>
              <div class="form-group">
                <label class="text-sm text-muted">Largeur</label>
                <input class="form-control" type="number" v-model.number="form.zone_w" step="0.1" min="0" max="100" placeholder="%" />
              </div>
              <div class="form-group">
                <label class="text-sm text-muted">Hauteur</label>
                <input class="form-control" type="number" v-model.number="form.zone_h" step="0.1" min="0" max="100" placeholder="%" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Annuler</button>
          <button class="btn btn-primary" @click="save">{{ editing ? 'Modifier' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- Zone editor modal (zoomable / pannable) -->
    <div class="modal-overlay" v-if="showZoneModal" @click.self="cancelZoneModal" style="z-index:200;">
      <div class="map-modal" @click.stop>
        <div class="map-modal-header">
          <div>
            <h2>Dessiner la zone</h2>
            <span class="text-sm text-muted">Cliquez pour ajouter des points — Molette pour zoomer — Glisser pour déplacer — Clic sur un point pour le supprimer</span>
          </div>
          <button class="modal-close" @click="cancelZoneModal">&times;</button>
        </div>
        <div class="map-modal-body" ref="zoneModalContainer">
          <div ref="zoneModalWrapper" class="map-modal-wrapper">
            <img src="/map.png" ref="zoneModalImage" draggable="false" @click="addPolygonPointModal" />
            <svg class="zone-modal-svg" :viewBox="`0 0 ${zoneImgW} ${zoneImgH}`" v-if="zoneImgW > 0">
              <polygon
                v-if="tempPolygonPoints.length >= 3"
                :points="tempPolygonPointsPx"
                :fill="hexToRgba(form.couleur_Zone || '#c9a84c', 0.2)"
                :stroke="form.couleur_Zone || '#c9a84c'"
                stroke-width="2"
              />
              <line
                v-for="(_, i) in tempPolygonPoints.slice(0, -1)"
                :key="'zl-'+i"
                :x1="tempPolygonPoints[i][0]/100*zoneImgW" :y1="tempPolygonPoints[i][1]/100*zoneImgH"
                :x2="tempPolygonPoints[i+1][0]/100*zoneImgW" :y2="tempPolygonPoints[i+1][1]/100*zoneImgH"
                :stroke="form.couleur_Zone || '#c9a84c'"
                stroke-width="2"
              />
              <circle
                v-for="(pt, i) in tempPolygonPoints"
                :key="'zp-'+i"
                :cx="pt[0]/100*zoneImgW" :cy="pt[1]/100*zoneImgH" r="6"
                :fill="form.couleur_Zone || '#c9a84c'"
                stroke="#fff" stroke-width="2"
                class="zone-editor-point"
                @click.stop="removeTempPoint(i)"
                @mousedown.stop="startDragTempPoint(i, $event)"
              />
            </svg>
          </div>
        </div>
        <div class="map-modal-footer">
          <span class="text-sm text-muted">{{ tempPolygonPoints.length }} points</span>
          <div class="flex gap-sm" style="margin-left:auto;">
            <button class="btn btn-danger btn-sm" @click="tempPolygonPoints = []">Effacer</button>
            <button class="btn btn-secondary" @click="cancelZoneModal">Annuler</button>
            <button class="btn btn-primary" @click="confirmZoneModal">Confirmer</button>
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
const loading = ref(true)
const showModal = ref(false)
const editing = ref(null)
const form = ref({ nom_Organisation: '', logo_url: '', couleur_Zone: '', zone_x: null, zone_y: null, zone_w: null, zone_h: null })
const polygonPoints = ref([])

// Zone modal state
const showZoneModal = ref(false)
const zoneModalContainer = ref(null)
const zoneModalWrapper = ref(null)
const zoneModalImage = ref(null)
const tempPolygonPoints = ref([])
const zoneImgW = ref(0)
const zoneImgH = ref(0)
let zonePz = null
let draggingPoint = -1

const polygonPointsStr = computed(() => polygonPoints.value.map(p => `${p[0]},${p[1]}`).join(' '))
const tempPolygonPointsPx = computed(() => tempPolygonPoints.value.map(p => `${p[0]/100*zoneImgW.value},${p[1]/100*zoneImgH.value}`).join(' '))

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16) || 200
  const g = parseInt(hex.slice(3, 5), 16) || 168
  const b = parseInt(hex.slice(5, 7), 16) || 76
  return `rgba(${r},${g},${b},${alpha})`
}

// Zone modal methods
function openZoneModal() {
  tempPolygonPoints.value = polygonPoints.value.map(p => [...p])
  showZoneModal.value = true
  nextTick(() => setTimeout(initZonePanZoom, 100))
}

function initZonePanZoom() {
  if (zonePz) zonePz.dispose()
  if (!zoneModalWrapper.value) return
  // Get image natural dimensions
  const img = zoneModalImage.value
  if (img) {
    const checkDims = () => {
      zoneImgW.value = img.naturalWidth || img.width || 1000
      zoneImgH.value = img.naturalHeight || img.height || 600
    }
    if (img.complete) checkDims()
    else img.addEventListener('load', checkDims, { once: true })
    checkDims()
  }
  zonePz = panzoom(zoneModalWrapper.value, {
    maxZoom: 5, minZoom: 0.3, bounds: true, boundsPadding: 0.1, smoothScroll: true
  })
}

function addPolygonPointModal(e) {
  const img = zoneModalImage.value
  if (!img) return
  const rect = img.getBoundingClientRect()
  const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
  const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
  tempPolygonPoints.value.push([Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))])
}

function removeTempPoint(idx) {
  tempPolygonPoints.value.splice(idx, 1)
}

function startDragTempPoint(idx, e) {
  draggingPoint = idx
  const onMove = (ev) => {
    if (draggingPoint < 0) return
    const img = zoneModalImage.value
    if (!img) return
    const rect = img.getBoundingClientRect()
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 1000) / 10
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 1000) / 10
    tempPolygonPoints.value[draggingPoint] = [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))]
  }
  const onUp = () => {
    draggingPoint = -1
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function confirmZoneModal() {
  polygonPoints.value = tempPolygonPoints.value.map(p => [...p])
  closeZoneModal()
}

function cancelZoneModal() {
  closeZoneModal()
}

function closeZoneModal() {
  showZoneModal.value = false
  if (zonePz) { zonePz.dispose(); zonePz = null }
}

function clearPolygon() {
  polygonPoints.value = []
}

function getPointCount(zonePoints) {
  if (!zonePoints) return 0
  try {
    const pts = typeof zonePoints === 'string' ? JSON.parse(zonePoints) : zonePoints
    return Array.isArray(pts) ? pts.length : 0
  } catch { return 0 }
}

async function load() {
  loading.value = true
  try {
    const res = await api.getOrganisations()
    items.value = res.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  editing.value = item ? item.id_Organisation : null
  form.value = {
    nom_Organisation: item ? item.nom_Organisation : '',
    logo_url: item ? (item.logo_url || '') : '',
    couleur_Zone: item ? (item.couleur_Zone || '#c9a84c') : '#c9a84c',
    zone_x: item ? item.zone_x : null,
    zone_y: item ? item.zone_y : null,
    zone_w: item ? item.zone_w : null,
    zone_h: item ? item.zone_h : null
  }
  // Charger les polygon points
  if (item && item.zone_points) {
    try {
      const pts = typeof item.zone_points === 'string' ? JSON.parse(item.zone_points) : item.zone_points
      polygonPoints.value = Array.isArray(pts) ? pts : []
    } catch { polygonPoints.value = [] }
  } else {
    polygonPoints.value = []
  }
  showModal.value = true
}

async function save() {
  try {
    const payload = { ...form.value }
    // Si on a des points de polygone, les envoyer
    if (polygonPoints.value.length >= 3) {
      payload.zone_points = polygonPoints.value
      // Effacer les anciennes valeurs rect
      payload.zone_x = null
      payload.zone_y = null
      payload.zone_w = null
      payload.zone_h = null
    } else {
      payload.zone_points = null
    }
    if (editing.value) {
      await api.updateOrganisation(editing.value, payload)
      toast('Organisation modifiée')
    } else {
      await api.createOrganisation(payload)
      toast('Organisation créée')
    }
    showModal.value = false
    load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer cette organisation ?')) return
  try {
    await api.deleteOrganisation(id)
    toast('Organisation supprimée')
    load()
  } catch (e) { toast(e.message, 'error') }
}

onMounted(load)
onBeforeUnmount(() => { if (zonePz) zonePz.dispose() })
</script>

<style scoped>
.org-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}
.org-logo-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-top: 0.5rem;
  border: 2px solid var(--border);
}
.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: inline-block;
}

/* Zone Editor */
.zone-editor-point {
  pointer-events: all;
  cursor: grab;
  transition: r 0.15s;
}
.zone-editor-point:hover {
  r: 8;
}

/* Zone map modal */
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
.zone-modal-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.map-modal-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.2rem;
  border-top: 1px solid var(--border);
}
</style>
