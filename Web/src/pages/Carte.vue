<template>
  <div class="map-container" ref="mapContainer">
    <div class="map-image-wrapper" ref="mapWrapper">
      <img src="/map.png" alt="Carte des territoires" ref="mapImage" @load="onMapLoad" draggable="false" />

      <!-- Territory zone overlays (SVG polygons) -->
      <svg class="map-zones-svg" :class="{ hidden: !layers.territoires }" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          v-for="zone in polygonZones"
          :key="'poly-' + zone.id"
          :points="zone.svgPoints"
          :fill="zone.fillColor"
          :stroke="zone.strokeColor"
          stroke-width="0.3"
          :class="{ active: selectedZone?.id === zone.id }"
          class="map-zone-polygon"
          @click.stop="selectZone(zone)"
        />
      </svg>

      <!-- Territory zone overlays (rectangles, fallback) -->
      <div
        v-for="zone in rectZones"
        :key="zone.id"
        class="map-zone"
        :class="{ active: selectedZone?.id === zone.id, hidden: !layers.territoires }"
        :style="zone.style"
        @click.stop="selectZone(zone)"
      >
        <img v-if="zone.logo" :src="zone.logo" class="map-zone-logo" />
        <span class="map-zone-label" :style="{ color: zone.color }">{{ zone.name }}</span>
      </div>

      <!-- Zone labels for polygons (positioned at centroid) -->
      <div
        v-for="zone in polygonZones"
        :key="'label-' + zone.id"
        class="map-zone-label-overlay"
        :class="{ hidden: !layers.territoires }"
        :style="{ left: zone.centroidX + '%', top: zone.centroidY + '%' }"
        @click.stop="selectZone(zone)"
      >
        <img v-if="zone.logo" :src="zone.logo" class="map-zone-logo" />
        <span class="map-zone-label" :style="{ color: zone.color }">{{ zone.name }}</span>
      </div>

      <!-- Emplacement markers -->
      <div
        v-for="empl in positionedEmplacements"
        :key="'empl-' + empl.id_Emplacement"
        class="map-marker"
        :class="{ hidden: !layers.emplacements, active: selectedEmpl?.id_Emplacement === empl.id_Emplacement }"
        :style="{ left: empl.pos_x + '%', top: empl.pos_y + '%' }"
        @click.stop="selectEmplacement(empl)"
      >
        <div class="map-marker-dot" :style="{ background: getEmplColor(empl) }"></div>
        <span class="map-marker-label" v-if="layers.labels">{{ empl.nom_Emplacement }}</span>
      </div>

      <!-- OC markers -->
      <div
        v-for="oc in positionedOCs"
        :key="'oc-' + oc.id_OC"
        class="map-oc-marker"
        :class="{ hidden: !layers.ocs }"
        :style="{ left: oc._mapX + '%', top: oc._mapY + '%' }"
        @click.stop="selectOC(oc)"
      >
        <img v-if="oc.pp_OC && !oc._imgError" :src="oc.pp_OC" @error="oc._imgError = true" class="map-oc-avatar" />
        <div v-else class="map-oc-avatar-placeholder">🐱</div>
        <span class="map-oc-name" v-if="layers.labels">{{ oc.nom_OC }}</span>
      </div>

      <!-- PNJ markers -->
      <div
        v-for="pnj in positionedPNJs"
        :key="'pnj-' + pnj.id_PNJ"
        class="map-oc-marker map-pnj-marker"
        :class="{ hidden: !layers.pnjs }"
        :style="{ left: pnj._mapX + '%', top: pnj._mapY + '%' }"
        @click.stop="selectPNJ(pnj)"
      >
        <div class="map-oc-avatar-placeholder" style="border-color:var(--warning);">🎭</div>
        <span class="map-oc-name" v-if="layers.labels">{{ pnj.nom_PNJ }}</span>
      </div>

      <!-- Add mode click target -->
      <div v-if="false" class="map-add-overlay"></div>
    </div>

    <!-- Layer controls (top-left) -->
    <div class="map-layers">
      <div class="map-layers-title" @click="layersOpen = !layersOpen">
        🗂️ Calques <span>{{ layersOpen ? '▾' : '▸' }}</span>
      </div>
      <div class="map-layers-list" v-if="layersOpen">
        <label><input type="checkbox" v-model="layers.territoires" /> Territoires</label>
        <label><input type="checkbox" v-model="layers.emplacements" /> Emplacements</label>
        <label><input type="checkbox" v-model="layers.ocs" /> OC</label>
        <label><input type="checkbox" v-model="layers.pnjs" /> PNJ</label>
        <label><input type="checkbox" v-model="layers.labels" /> Noms</label>
      </div>
    </div>

    <!-- Search bar -->
    <div class="map-search">
      <input
        type="text"
        v-model="search"
        placeholder="🔍 Rechercher..."
        class="form-control"
        @focus="showSearchResults = true"
        @blur="hideSearchDelayed"
      />
      <div class="map-search-results" v-if="showSearchResults && searchResults.length > 0">
        <div
          v-for="r in searchResults"
          :key="r.type + r.id"
          class="map-search-item"
          @mousedown.prevent="goToResult(r)"
        >
          <span class="map-search-icon">{{ r.icon }}</span>
          <div>
            <div class="text-sm" style="font-weight:600;">{{ r.name }}</div>
            <div class="text-sm text-muted">{{ r.sub }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action buttons removed -->

    <!-- Panneau latéral / bas (mobile) -->
    <transition name="panel">
      <div class="map-panel" v-if="panelContent" @click.stop>
        <div class="map-panel-header">
          <div>
            <h3 style="font-family: var(--font-display); color: var(--accent);">{{ panelTitle }}</h3>
            <span v-if="panelBadge" class="badge" :class="panelBadge.cls">{{ panelBadge.text }}</span>
          </div>
          <button class="modal-close" @click="closePanel">&times;</button>
        </div>
        <div class="map-panel-body">
          <!-- Zone panel -->
          <template v-if="panelContent === 'zone'">
            <div v-if="panelLoading" class="loading"><div class="spinner"></div></div>
            <template v-else>
              <h4 class="section-title">📍 Emplacements</h4>
              <div v-if="zoneEmpls.length === 0" class="text-muted text-sm">Aucun emplacement</div>
              <div v-for="empl in zoneEmpls" :key="empl.id_Emplacement" class="panel-item" @click="selectEmplacement(empl)">
                <div class="flex items-center justify-between">
                  <strong>{{ empl.nom_Emplacement }}</strong>
                  <span class="text-muted text-sm" v-if="empl.pos_x == null">⚠️ Non placé</span>
                </div>
                <div v-if="empl.proies && empl.proies.length > 0" class="mt-1">
                  <div v-for="p in empl.proies" :key="p.id_Proie" class="flex items-center justify-between text-sm" style="padding:0.15rem 0;">
                    <span>{{ p.nom_Proie }}</span>
                    <span class="badge" :class="p.quantite_disponible > 0 ? 'badge-success' : 'badge-danger'">{{ p.quantite_disponible }}</span>
                  </div>
                </div>
              </div>

              <h4 class="section-title mt-2">🐱 OC présents</h4>
              <div v-if="zoneOCs.length === 0" class="text-muted text-sm">Aucun OC</div>
              <div v-for="oc in zoneOCs" :key="oc.id_OC" class="panel-oc" @click="selectOC(oc)">
                <div class="map-oc-avatar-placeholder" style="width:28px;height:28px;font-size:0.7rem;">🐱</div>
                <div>
                  <div class="text-sm" style="font-weight:600;">{{ oc.nom_OC }}</div>
                  <div class="text-sm text-muted">Chasse: {{ oc.nv_Chasse }}/10</div>
                </div>
              </div>
            </template>
          </template>

          <!-- Emplacement detail panel -->
          <template v-if="panelContent === 'emplacement'">
            <div class="panel-detail">
              <div class="text-sm text-muted" v-if="selectedEmpl.id_SalonDiscord">💬 Salon Discord: {{ selectedEmpl.id_SalonDiscord }}</div>
              <h4 class="section-title mt-2">🦊 Proies disponibles</h4>
              <div v-if="emplProies.length === 0" class="text-muted text-sm">Aucune proie ici</div>
              <div v-for="p in emplProies" :key="p.id_Proie" class="flex items-center justify-between text-sm" style="padding:0.35rem 0;border-bottom:1px solid var(--border);">
                <span>{{ p.nom_Proie }} <span class="text-muted">(rareté: {{ p.nv_Rarete }})</span></span>
                <span class="badge" :class="p.quantite_disponible > 0 ? 'badge-success' : 'badge-danger'">{{ p.quantite_disponible }}</span>
              </div>

              <h4 class="section-title mt-2">🐱 OC ici</h4>
              <div v-if="emplOCs.length === 0" class="text-muted text-sm">Aucun OC</div>
              <div v-for="oc in emplOCs" :key="oc.id_OC" class="panel-oc" @click="selectOC(oc)">
                <div class="map-oc-avatar-placeholder" style="width:28px;height:28px;font-size:0.7rem;">🐱</div>
                <div>
                  <div class="text-sm" style="font-weight:600;">{{ oc.nom_OC }}</div>
                  <div class="text-sm text-muted">Chasse: {{ oc.nv_Chasse }} | Combat: {{ oc.nv_Combat }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- OC detail panel -->
          <template v-if="panelContent === 'oc'">
            <div class="panel-detail">
              <div class="text-sm text-muted mb-1">📍 {{ selectedOCDetail.nom_Emplacement || '?' }} — {{ selectedOCDetail.nom_Organisation || '?' }}</div>
              <div class="stat-bars-mini">
                <div v-for="s in ocStats" :key="s.label" class="stat-row-mini">
                  <span class="text-sm" style="width:75px;">{{ s.label }}</span>
                  <div class="stat-bar-mini">
                    <div class="stat-bar-fill-mini" :style="{ width: (s.val/10*100) + '%', background: s.color }"></div>
                  </div>
                  <span class="text-sm" style="width:22px;text-align:right;font-weight:600;">{{ s.val }}</span>
                </div>
              </div>
              <div class="flex gap-sm mt-2 text-sm flex-wrap">
                <span>🎯 Prises: {{ selectedOCDetail.nbr_Prise_Jour }}/3</span>
                <span>⚡ Essais: {{ selectedOCDetail.nbr_Tentative }}/6</span>
              </div>
            </div>
          </template>

          <!-- PNJ detail panel -->
          <template v-if="panelContent === 'pnj'">
            <div class="panel-detail">
              <div class="text-sm text-muted mb-1">📍 {{ selectedPNJDetail.nom_Emplacement || '?' }} — {{ selectedPNJDetail.nom_Organisation || '?' }}</div>
              <div class="stat-bars-mini">
                <div v-for="s in pnjStats" :key="s.label" class="stat-row-mini">
                  <span class="text-sm" style="width:75px;">{{ s.label }}</span>
                  <div class="stat-bar-mini">
                    <div class="stat-bar-fill-mini" :style="{ width: (s.val/10*100) + '%', background: s.color }"></div>
                  </div>
                  <span class="text-sm" style="width:22px;text-align:right;font-weight:600;">{{ s.val }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- Zoom controls -->
    <div class="map-zoom" v-if="!panelContent">
      <button class="btn btn-secondary btn-icon" @click="zoomIn">+</button>
      <button class="btn btn-secondary btn-icon" @click="zoomOut">-</button>
      <button class="btn btn-secondary btn-icon" @click="resetZoom" title="Recentrer">⌂</button>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'
import panzoom from 'panzoom'
import api from '../services/api.js'

const toast = inject('toast')
const mapContainer = ref(null)
const mapWrapper = ref(null)
const mapImage = ref(null)
let pz = null
let searchTimeout = null

// Data
const allEmpls = ref([])
const allOCs = ref([])
const allPNJs = ref([])
const allOrgas = ref([])

// Layers — restore from localStorage if available
const defaultLayers = { territoires: true, emplacements: true, ocs: true, pnjs: false, labels: true }
function loadSavedLayers() {
  try {
    const saved = localStorage.getItem('carte_layers')
    if (saved) return { ...defaultLayers, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return { ...defaultLayers }
}
const layers = reactive(loadSavedLayers())
watch(layers, (val) => {
  try { localStorage.setItem('carte_layers', JSON.stringify({ ...val })) } catch { /* ignore */ }
}, { deep: true })
const layersOpen = ref(false)

// Search
const search = ref('')
const showSearchResults = ref(false)
function hideSearchDelayed() { searchTimeout = setTimeout(() => { showSearchResults.value = false }, 200) }

// Panel state
const panelContent = ref(null)
const panelLoading = ref(false)
const selectedZone = ref(null)
const selectedEmpl = ref(null)
const selectedOCDetail = ref(null)
const selectedPNJDetail = ref(null)
const zoneEmpls = ref([])
const zoneOCs = ref([])
const emplProies = ref([])
const emplOCs = ref([])

// Add mode
const addMode = ref(false)
const addPreview = ref(null)
const showAddModal = ref(false)
const addForm = ref({ nom_Emplacement: '', id_Organisation: null, id_SalonDiscord: '', pos_x: null, pos_y: null })

// Zones — built dynamically from allOrgas
const zones = computed(() => {
  return allOrgas.value
    .filter(o => o.zone_points || (o.zone_x != null && o.zone_y != null && o.zone_w != null && o.zone_h != null))
    .map(o => {
      const color = o.couleur_Zone || '#c9a84c'
      const r = parseInt(color.slice(1, 3), 16) || 200
      const g = parseInt(color.slice(3, 5), 16) || 168
      const b = parseInt(color.slice(5, 7), 16) || 76

      let points = null
      if (o.zone_points) {
        try {
          points = typeof o.zone_points === 'string' ? JSON.parse(o.zone_points) : o.zone_points
        } catch { points = null }
      }

      return {
        id: o.id_Organisation,
        name: o.nom_Organisation,
        orgaName: o.nom_Organisation,
        orgaId: o.id_Organisation,
        color: color,
        logo: o.logo_url || null,
        badgeClass: getBadgeForOrga(o.nom_Organisation),
        isPolygon: !!points,
        points: points,
        style: !points ? {
          left: o.zone_x + '%',
          top: o.zone_y + '%',
          width: o.zone_w + '%',
          height: o.zone_h + '%',
          background: `rgba(${r},${g},${b},0.12)`,
          borderColor: `rgba(${r},${g},${b},0.35)`
        } : null,
        fillColor: `rgba(${r},${g},${b},0.15)`,
        strokeColor: `rgba(${r},${g},${b},0.5)`,
        svgPoints: points ? points.map(p => `${p[0]},${p[1]}`).join(' ') : '',
        centroidX: points ? points.reduce((s, p) => s + p[0], 0) / points.length : null,
        centroidY: points ? points.reduce((s, p) => s + p[1], 0) / points.length : null
      }
    })
})

// Polygon zones only
const polygonZones = computed(() => zones.value.filter(z => z.isPolygon))
// Rect zones only (fallback)
const rectZones = computed(() => zones.value.filter(z => !z.isPolygon))

// ---- Computed ----
const positionedEmplacements = computed(() => allEmpls.value.filter(e => e.pos_x != null && e.pos_y != null))

const positionedOCs = computed(() => {
  return allOCs.value.map(oc => {
    const empl = allEmpls.value.find(e => e.id_Emplacement === oc.id_Emplacement)
    if (!empl || empl.pos_x == null) return null
    const siblings = allOCs.value.filter(o => o.id_Emplacement === oc.id_Emplacement)
    const idx = siblings.indexOf(oc)
    const angle = (idx * 55) * Math.PI / 180
    const offset = 1.8 + idx * 0.3
    return { ...oc, _mapX: empl.pos_x + Math.cos(angle) * offset, _mapY: empl.pos_y + Math.sin(angle) * offset - 1.5, _imgError: false }
  }).filter(Boolean)
})

const positionedPNJs = computed(() => {
  return allPNJs.value.map(pnj => {
    const empl = allEmpls.value.find(e => e.id_Emplacement === pnj.id_Emplacement)
    if (!empl || empl.pos_x == null) return null
    const siblings = allPNJs.value.filter(p => p.id_Emplacement === pnj.id_Emplacement)
    const idx = siblings.indexOf(pnj)
    const angle = (idx * 55 + 30) * Math.PI / 180
    return { ...pnj, _mapX: empl.pos_x + Math.cos(angle) * 2.2, _mapY: empl.pos_y + Math.sin(angle) * 2.2 + 1.5 }
  }).filter(Boolean)
})

const panelTitle = computed(() => {
  if (panelContent.value === 'zone') return selectedZone.value?.name
  if (panelContent.value === 'emplacement') return selectedEmpl.value?.nom_Emplacement
  if (panelContent.value === 'oc') return selectedOCDetail.value?.nom_OC
  if (panelContent.value === 'pnj') return selectedPNJDetail.value?.nom_PNJ
  return ''
})

const panelBadge = computed(() => {
  if (panelContent.value === 'zone' && selectedZone.value) return { text: selectedZone.value.orgaName, cls: selectedZone.value.badgeClass }
  if (panelContent.value === 'emplacement' && selectedEmpl.value) return { text: selectedEmpl.value.nom_Organisation || 'Neutre', cls: getBadgeForOrga(selectedEmpl.value.nom_Organisation) }
  if (panelContent.value === 'oc' && selectedOCDetail.value) return { text: selectedOCDetail.value.nom_Organisation || '?', cls: getBadgeForOrga(selectedOCDetail.value.nom_Organisation) }
  if (panelContent.value === 'pnj' && selectedPNJDetail.value) return { text: selectedPNJDetail.value.nom_Organisation || '?', cls: getBadgeForOrga(selectedPNJDetail.value.nom_Organisation) }
  return null
})

const ocStats = computed(() => {
  const o = selectedOCDetail.value
  if (!o) return []
  return [
    { label: 'Chasse', val: o.nv_Chasse, color: '#5bbf6a' },
    { label: 'Combat', val: o.nv_Combat, color: '#d46a6a' },
    { label: 'Vitesse', val: o.nv_Vitesse, color: '#5b9bd5' },
    { label: 'Endurance', val: o.nv_Endurance, color: '#f59e0b' },
    { label: 'Mémoire', val: o.nv_Memoire, color: '#a78bfa' },
    { label: 'Intimidation', val: o.nv_Intimidation, color: '#ef4444' }
  ]
})

const pnjStats = computed(() => {
  const p = selectedPNJDetail.value
  if (!p) return []
  return [
    { label: 'Chasse', val: p.nv_Chasse, color: '#5bbf6a' },
    { label: 'Combat', val: p.nv_Combat, color: '#d46a6a' },
    { label: 'Vitesse', val: p.nv_Vitesse, color: '#5b9bd5' },
    { label: 'Endurance', val: p.nv_Endurance, color: '#f59e0b' },
    { label: 'Mémoire', val: p.nv_Memoire, color: '#a78bfa' },
    { label: 'Intimidation', val: p.nv_Intimidation, color: '#ef4444' }
  ]
})

const searchResults = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return []
  const results = []
  for (const e of allEmpls.value) {
    if (e.nom_Emplacement.toLowerCase().includes(q))
      results.push({ type: 'empl', id: e.id_Emplacement, name: e.nom_Emplacement, sub: e.nom_Organisation || 'Neutre', icon: '📍', data: e })
  }
  for (const oc of allOCs.value) {
    if (oc.nom_OC.toLowerCase().includes(q))
      results.push({ type: 'oc', id: oc.id_OC, name: oc.nom_OC, sub: oc.nom_Organisation || '?', icon: '🐱', data: oc })
  }
  for (const pnj of allPNJs.value) {
    if (pnj.nom_PNJ.toLowerCase().includes(q))
      results.push({ type: 'pnj', id: pnj.id_PNJ, name: pnj.nom_PNJ, sub: pnj.nom_Organisation || '?', icon: '🎭', data: pnj })
  }
  return results.slice(0, 8)
})

// ---- Methods ----
function getBadgeForOrga(nom) {
  if (!nom) return 'badge-neutre'
  const n = nom.toLowerCase()
  if (n.includes('rive')) return 'badge-rive'
  if (n.includes('ombre')) return 'badge-ombre'
  if (n.includes('forêt') || n.includes('foret') || n.includes('alliance')) return 'badge-foret'
  return 'badge-neutre'
}

function getEmplColor(empl) {
  const n = (empl.nom_Organisation || '').toLowerCase()
  if (n.includes('rive')) return 'var(--clan-rive)'
  if (n.includes('ombre')) return 'var(--faction-ombre)'
  if (n.includes('forêt') || n.includes('foret') || n.includes('alliance')) return 'var(--alliance-foret)'
  return 'var(--accent)'
}

function closePanel() {
  panelContent.value = null
  selectedZone.value = null
  selectedEmpl.value = null
  selectedOCDetail.value = null
  selectedPNJDetail.value = null
}

async function selectZone(zone) {
  closePanel()
  selectedZone.value = zone
  panelContent.value = 'zone'
  panelLoading.value = true
  zoneEmpls.value = []
  zoneOCs.value = []

  try {
    if (zone.orgaId) {
      const emplRes = await api.getEmplacementsByOrga(zone.orgaId)
      zoneEmpls.value = emplRes.data || []
      for (const empl of zoneEmpls.value) {
        try {
          const proiesRes = await api.getProiesDisponibles(empl.id_Emplacement)
          empl.proies = proiesRes.data || []
        } catch { empl.proies = [] }
      }
      try {
        const ocsRes = await api.getOCsByOrga(zone.orgaId)
        zoneOCs.value = ocsRes.data || []
      } catch { zoneOCs.value = [] }
    }
  } catch (e) { console.error(e) }
  panelLoading.value = false
}

async function selectEmplacement(empl) {
  closePanel()
  selectedEmpl.value = empl
  panelContent.value = 'emplacement'
  emplProies.value = []
  emplOCs.value = []

  if (empl.pos_x != null) centerOn(empl.pos_x, empl.pos_y)

  try {
    const proiesRes = await api.getProiesDisponibles(empl.id_Emplacement)
    emplProies.value = proiesRes.data || []
  } catch { emplProies.value = [] }
  emplOCs.value = allOCs.value.filter(oc => oc.id_Emplacement === empl.id_Emplacement)
}

function selectOC(oc) {
  closePanel()
  selectedOCDetail.value = oc
  panelContent.value = 'oc'
  const empl = allEmpls.value.find(e => e.id_Emplacement === oc.id_Emplacement)
  if (empl?.pos_x != null) centerOn(empl.pos_x, empl.pos_y)
}

function selectPNJ(pnj) {
  closePanel()
  selectedPNJDetail.value = pnj
  panelContent.value = 'pnj'
  const empl = allEmpls.value.find(e => e.id_Emplacement === pnj.id_Emplacement)
  if (empl?.pos_x != null) centerOn(empl.pos_x, empl.pos_y)
}

function goToResult(r) {
  search.value = ''
  showSearchResults.value = false
  if (r.type === 'empl') selectEmplacement(r.data)
  else if (r.type === 'oc') selectOC(r.data)
  else if (r.type === 'pnj') selectPNJ(r.data)
}

function centerOn(pxPercent, pyPercent) {
  if (!pz || !mapContainer.value || !mapImage.value) return
  const cw = mapContainer.value.clientWidth
  const ch = mapContainer.value.clientHeight
  const iw = mapImage.value.naturalWidth || mapImage.value.width
  const ih = mapImage.value.naturalHeight || mapImage.value.height
  const t = pz.getTransform()
  const scale = t.scale || 1
  const targetX = (pxPercent / 100) * iw * scale
  const targetY = (pyPercent / 100) * ih * scale
  pz.moveTo(cw / 2 - targetX, ch / 2 - targetY)
}

// Add mode
function toggleAddMode() {
  addMode.value = !addMode.value
  addPreview.value = null
  if (addMode.value) closePanel()
}

function placeNewEmplacement(e) {
  const img = mapImage.value
  if (!img) return
  const rect = img.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  addPreview.value = { x, y }
  addForm.value = { nom_Emplacement: '', id_Organisation: null, id_SalonDiscord: '', pos_x: x, pos_y: y }
  showAddModal.value = true
}

async function createEmplacement() {
  if (!addForm.value.nom_Emplacement) { toast('Nom requis', 'error'); return }
  try {
    await api.createEmplacement(addForm.value)
    toast('Emplacement créé sur la carte !')
    showAddModal.value = false
    addMode.value = false
    addPreview.value = null
    loadData()
  } catch (e) { toast(e.message, 'error') }
}

// Map controls
function onMapLoad() { nextTick(() => initPanZoom()) }

function initPanZoom() {
  if (pz) pz.dispose()
  if (!mapWrapper.value) return
  pz = panzoom(mapWrapper.value, {
    maxZoom: 5, minZoom: 0.3, bounds: true, boundsPadding: 0.1,
    smoothScroll: true, pinchSpeed: 1.5
  })
  resetZoom()
}

function zoomIn() { if (pz) pz.smoothZoom(innerWidth / 2, innerHeight / 2, 1.3) }
function zoomOut() { if (pz) pz.smoothZoom(innerWidth / 2, innerHeight / 2, 0.7) }

function resetZoom() {
  if (!pz || !mapContainer.value || !mapImage.value) return
  const cw = mapContainer.value.clientWidth
  const ch = mapContainer.value.clientHeight
  const iw = mapImage.value.naturalWidth || mapImage.value.width
  const ih = mapImage.value.naturalHeight || mapImage.value.height
  const scale = Math.min(cw / iw, ch / ih, 1)
  const x = (cw - iw * scale) / 2
  const y = (ch - ih * scale) / 2
  pz.moveTo(x, y)
  pz.zoomAbs(0, 0, scale)
}

// Data loading
async function loadData() {
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      api.getEmplacements(), api.getOCs(), api.getOrganisations(), api.getPNJs()
    ])
    allEmpls.value = r1.data || []
    allOCs.value = (r2.data || []).map(o => ({ ...o, _imgError: false }))
    allOrgas.value = r3.data || []
    allPNJs.value = r4.data || []
  } catch (e) { console.warn('Erreur chargement carte:', e) }
}

onMounted(loadData)
onBeforeUnmount(() => {
  if (pz) pz.dispose()
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<style scoped>
.hidden { display: none !important; }

/* ---- Markers ---- */
.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 3;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.15s;
}
.map-marker:hover { transform: translate(-50%, -50%) scale(1.3); z-index: 6; }
.map-marker.active { z-index: 7; }
.map-marker.active .map-marker-dot { box-shadow: 0 0 12px 4px rgba(201,168,76,0.8); }

.map-marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.9);
  box-shadow: 0 0 6px rgba(0,0,0,0.5);
}

.map-marker-label {
  margin-top: 2px;
  font-size: 0.6rem;
  font-weight: 600;
  background: rgba(0,0,0,0.75);
  color: #fff;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}

/* ---- OC / PNJ markers ---- */
.map-oc-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 4;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.15s;
}
.map-oc-marker:hover { transform: translate(-50%, -50%) scale(1.2); z-index: 6; }

.map-oc-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.map-oc-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.map-oc-name {
  margin-top: 1px;
  font-size: 0.55rem;
  font-weight: 700;
  background: rgba(0,0,0,0.75);
  color: var(--accent);
  padding: 0px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}

/* ---- Layer controls ---- */
.map-layers {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 8;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  min-width: 140px;
}

.map-layers-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.map-layers-list {
  padding: 0.25rem 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.map-layers-list label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  cursor: pointer;
  color: var(--text-muted);
}

.map-layers-list input[type="checkbox"] { accent-color: var(--accent); }

/* ---- Search ---- */
.map-search {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  width: min(280px, calc(100% - 200px));
}

.map-search .form-control {
  font-size: 0.82rem;
  padding: 0.45rem 0.7rem;
  background: var(--bg-card);
  border-color: var(--border);
  box-shadow: var(--shadow);
}

.map-search-results {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  max-height: 250px;
  overflow-y: auto;
  box-shadow: var(--shadow);
}

.map-search-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.map-search-item:hover { background: var(--bg-card-hover); }
.map-search-icon { font-size: 1.1rem; }

/* ---- Actions ---- */
/* (Removed - add mode disabled) */

/* ---- Add overlay ---- */
/* (Removed - add mode disabled) */

/* ---- Zoom ---- */
.map-zoom {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  z-index: 5;
}

/* ---- Panel content ---- */
.section-title {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}

.panel-item {
  padding: 0.6rem;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.panel-item:hover { border-color: var(--accent); }

.panel-oc {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  cursor: pointer;
}
.panel-oc:hover { opacity: 0.8; }

.panel-detail { padding: 0.25rem 0; }

/* ---- Mini stat bars ---- */
.stat-bars-mini { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem; }
.stat-row-mini { display: flex; align-items: center; gap: 0.4rem; }
.stat-bar-mini { flex: 1; height: 6px; background: var(--bg-input); border-radius: 3px; overflow: hidden; }
.stat-bar-fill-mini { height: 100%; border-radius: 3px; transition: width 0.3s; }

/* ---- Transitions ---- */
.panel-enter-active, .panel-leave-active { transition: transform 0.3s ease; }
.panel-enter-from, .panel-leave-to { transform: translateY(100%); }
@media (min-width: 768px) {
  .panel-enter-from, .panel-leave-to { transform: translateX(100%); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.7; }
}

/* ---- Zone logo ---- */
.map-zone-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.3);
  margin-bottom: 2px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

/* ---- SVG Polygon zones ---- */
.map-zones-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}
.map-zone-polygon {
  pointer-events: all;
  cursor: pointer;
  transition: fill 0.2s, stroke-width 0.2s;
}
.map-zone-polygon:hover {
  stroke-width: 0.5;
}
.map-zone-polygon.active {
  stroke-width: 0.6;
}

.map-zone-label-overlay {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: all;
  cursor: pointer;
}

/* ---- Mobile ---- */
@media (max-width: 600px) {
  .map-search { width: calc(100% - 2rem); left: 1rem; transform: none; top: 0.5rem; }
  .map-layers { top: auto; bottom: 0.5rem; left: 0.5rem; min-width: 120px; }
  .map-layers-title { font-size: 0.72rem; padding: 0.35rem 0.55rem; }
  .map-zoom { bottom: 0.5rem; right: 0.5rem; }
  .map-marker-label { font-size: 0.5rem; }
  .map-oc-name { font-size: 0.45rem; }
  .map-zone-label { font-size: 0.6rem !important; }
  .map-zone-logo { width: 20px; height: 20px; }
  .map-oc-avatar, .map-oc-avatar-placeholder { width: 18px; height: 18px; font-size: 0.5rem; }
}

@media (max-width: 400px) {
  .map-search { width: calc(100% - 1rem); left: 0.5rem; }
  .map-layers { display: none; }
  .map-marker-label, .map-oc-name { display: none; }
  .map-zoom { gap: 0.25rem; }
  .map-zoom .btn { font-size: 0.75rem; padding: 0.25rem 0.4rem; }
}
</style>
