<template>
  <div>
    <div class="page-header">
      <h1>Joueurs</h1>
      <button class="btn btn-primary" @click="openModal()">+ Ajouter</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="items.length === 0" class="empty">
      <div class="empty-icon">👤</div>
      <p>Aucun joueur enregistré</p>
    </div>
    <div v-else class="card-grid">
      <div class="card" v-for="j in items" :key="j.id_Utilisateur">
        <div class="flex items-center justify-between mb-1">
          <div class="card-title" style="margin:0">Joueur #{{ j.id_Utilisateur }}</div>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" @click="openModal(j)">✏️</button>
            <button class="btn btn-danger btn-sm" @click="remove(j.id_Utilisateur)">🗑️</button>
          </div>
        </div>
        <div class="text-sm text-muted mb-1" v-if="j.id_UtilisateurDiscord">Discord: <strong style="color:var(--text);">{{ getMemberName(j.id_UtilisateurDiscord) }}</strong></div>
        <div class="text-sm">OC 1: <strong>{{ j.nom_OC_1 || '—' }}</strong></div>
        <div class="text-sm text-muted">OC 2: {{ j.nom_OC_2 || '—' }} | OC 3: {{ j.nom_OC_3 || '—' }}</div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showModal" @click="showModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier' : 'Nouveau' }} Joueur</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Utilisateur Discord</label>
            <div class="member-selector">
              <div v-if="form.id_UtilisateurDiscord" class="member-selected">
                <img v-if="getSelectedMember()?.avatar" :src="getSelectedMember().avatar" class="member-avatar" />
                <span>{{ getSelectedMember()?.displayName || form.id_UtilisateurDiscord }}</span>
                <button class="btn btn-danger btn-sm" style="padding:0.1rem 0.4rem;" @click="form.id_UtilisateurDiscord = ''">✕</button>
              </div>
              <template v-else>
                <input class="form-control" v-model="memberSearch" @focus="showMemberDropdown = true" @blur="hideMemberDropdown" placeholder="Rechercher un utilisateur..." />
                <div class="member-dropdown" v-if="showMemberDropdown && filteredMembers.length > 0">
                  <div class="member-option" v-for="m in filteredMembers" :key="m.id" @mousedown.prevent="selectMember(m)">
                    <img v-if="m.avatar" :src="m.avatar" class="member-avatar" />
                    <div>
                      <div class="text-sm" style="font-weight:600;">{{ m.displayName }}</div>
                      <div class="text-sm text-muted">@{{ m.username }}</div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div class="form-group">
            <label>OC Principal (obligatoire)</label>
            <select class="form-control" v-model="form.id_OC_1">
              <option v-for="o in availableOCs(1)" :key="o.id_OC" :value="o.id_OC">{{ o.nom_OC }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>OC 2 (optionnel)</label>
            <select class="form-control" v-model="form.id_OC_2">
              <option :value="null">— Aucun —</option>
              <option v-for="o in availableOCs(2)" :key="o.id_OC" :value="o.id_OC">{{ o.nom_OC }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>OC 3 (optionnel)</label>
            <select class="form-control" v-model="form.id_OC_3">
              <option :value="null">— Aucun —</option>
              <option v-for="o in availableOCs(3)" :key="o.id_OC" :value="o.id_OC">{{ o.nom_OC }}</option>
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
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const items = ref([]); const ocs = ref([]); const loading = ref(true)
const showModal = ref(false); const editingId = ref(null)
const form = ref({ id_UtilisateurDiscord: '', id_OC_1: null, id_OC_2: null, id_OC_3: null })

// Compute which OC IDs are already assigned to OTHER joueurs
const assignedOCIds = computed(() => {
  const ids = new Set()
  for (const j of items.value) {
    // Skip the currently editing joueur
    if (editingId.value && j.id_Utilisateur === editingId.value) continue
    if (j.id_OC_1) ids.add(j.id_OC_1)
    if (j.id_OC_2) ids.add(j.id_OC_2)
    if (j.id_OC_3) ids.add(j.id_OC_3)
  }
  return ids
})

// Available OCs for a slot: exclude already-assigned + already picked in other slots of this form
function availableOCs(slot) {
  const currentSlots = {
    1: form.value.id_OC_1,
    2: form.value.id_OC_2,
    3: form.value.id_OC_3
  }
  return ocs.value.filter(o => {
    // Always show the currently selected OC for this slot
    if (o.id_OC === currentSlots[slot]) return true
    // Hide if assigned to another joueur
    if (assignedOCIds.value.has(o.id_OC)) return false
    // Hide if already selected in another slot of this form
    for (const [s, id] of Object.entries(currentSlots)) {
      if (Number(s) !== slot && id === o.id_OC) return false
    }
    return true
  })
}

// Discord members
const discordMembers = ref([])
const memberSearch = ref('')
const showMemberDropdown = ref(false)
let memberDropdownTimeout = null

const filteredMembers = computed(() => {
  const q = memberSearch.value.toLowerCase().trim()
  if (!q) return discordMembers.value.slice(0, 20)
  return discordMembers.value.filter(m =>
    m.displayName.toLowerCase().includes(q) ||
    m.username.toLowerCase().includes(q)
  ).slice(0, 20)
})

function getMemberName(id) {
  const m = discordMembers.value.find(m => m.id === id)
  return m ? m.displayName : id
}

function getSelectedMember() {
  return discordMembers.value.find(m => m.id === form.value.id_UtilisateurDiscord) || null
}

function selectMember(m) {
  form.value.id_UtilisateurDiscord = m.id
  memberSearch.value = ''
  showMemberDropdown.value = false
}

function hideMemberDropdown() {
  memberDropdownTimeout = setTimeout(() => { showMemberDropdown.value = false }, 200)
}

async function loadMembers() {
  try {
    const res = await api.getDiscordMembers()
    discordMembers.value = res.data || []
  } catch { discordMembers.value = [] }
}

async function load() {
  loading.value = true
  try {
    const [r1, r2] = await Promise.all([api.getJoueurs(), api.getOCs()])
    items.value = r1.data; ocs.value = r2.data
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

function openModal(item = null) {
  if (item) { editingId.value = item.id_Utilisateur; form.value = { id_UtilisateurDiscord: item.id_UtilisateurDiscord || '', id_OC_1: item.id_OC_1, id_OC_2: item.id_OC_2, id_OC_3: item.id_OC_3 } }
  else { editingId.value = null; form.value = { id_UtilisateurDiscord: '', id_OC_1: ocs.value[0]?.id_OC || null, id_OC_2: null, id_OC_3: null } }
  memberSearch.value = ''
  showMemberDropdown.value = false
  showModal.value = true
}

async function save() {
  try {
    if (editingId.value) { await api.updateJoueur(editingId.value, form.value); toast('Joueur modifié') }
    else { await api.createJoueur(form.value); toast('Joueur créé') }
    showModal.value = false; load()
  } catch (e) { toast(e.message, 'error') }
}

async function remove(id) {
  if (!confirm('Supprimer ce joueur ?')) return
  try { await api.deleteJoueur(id); toast('Joueur supprimé'); load() } catch (e) { toast(e.message, 'error') }
}

onMounted(() => { load(); loadMembers() })
onBeforeUnmount(() => { if (memberDropdownTimeout) clearTimeout(memberDropdownTimeout) })
</script>

<style scoped>
.member-selector { position: relative; }
.member-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
}
.member-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.member-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  max-height: 250px;
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.member-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
  transition: background 0.15s;
}
.member-option:hover { background: rgba(255,255,255,0.05); }
</style>
