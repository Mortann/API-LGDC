<template>
  <div>
    <div class="page-header">
      <h1>Discord</h1>
      <div class="flex items-center gap-sm">
        <span class="badge" :class="connected ? 'badge-success' : 'badge-danger'">
          {{ connected ? '🟢 Bot connecté' : '🔴 Bot déconnecté' }}
        </span>
        <button class="btn btn-secondary btn-sm" @click="checkStatus">↻</button>
      </div>
    </div>

    <div v-if="!connected" class="card">
      <h3 class="card-title">Configuration requise</h3>
      <p class="text-muted text-sm mb-1">Pour connecter le bot Discord, remplis le fichier <code>.env</code> de l'API :</p>
      <div class="card" style="background:var(--bg-input);font-family:monospace;font-size:0.82rem;padding:1rem;">
        DISCORD_BOT_TOKEN=ton_token_ici<br/>
        DISCORD_GUILD_ID=id_du_serveur
      </div>
      <div class="mt-2 text-sm">
        <strong>Comment obtenir un token :</strong>
        <ol style="padding-left:1.2rem;margin-top:0.5rem;line-height:1.8;">
          <li>Va sur <a href="https://discord.com/developers/applications" target="_blank" style="color:var(--accent);">Discord Developer Portal</a></li>
          <li>Crée une application → Section "Bot" → "Add Bot"</li>
          <li>Copie le token</li>
          <li>Active les intents : <em>Server Members</em>, <em>Message Content</em></li>
          <li>Invite le bot avec les permissions : Manage Roles, Send Messages, Read Message History</li>
        </ol>
      </div>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-sm mb-2 flex-wrap">
        <button v-for="t in tabs" :key="t.id" class="btn btn-sm" :class="tab === t.id ? 'btn-primary' : 'btn-secondary'" @click="tab = t.id">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- Channels -->
      <div v-if="tab === 'channels'">
        <div class="form-group mb-2">
          <input class="form-control" v-model="channelSearch" placeholder="Rechercher un salon..." />
        </div>
        <div v-if="loadingChannels" class="loading"><div class="spinner"></div></div>
        <div v-else class="card-grid">
          <div class="card" v-for="c in filteredChannels" :key="c.id">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm" style="font-weight:600;">#{{ c.name }}</div>
                <div class="text-sm text-muted">{{ c.category || 'Sans catégorie' }}</div>
              </div>
              <button class="btn btn-secondary btn-sm" @click="openSendModal(c)" title="Envoyer un message">💬</button>
            </div>
            <div class="text-sm text-muted mt-1" style="font-family:monospace;">{{ c.id }}</div>
          </div>
        </div>
      </div>

      <!-- Members -->
      <div v-if="tab === 'members'">
        <div class="form-group mb-2">
          <input class="form-control" v-model="memberSearch" placeholder="🔍 Rechercher un membre..." />
        </div>
        <div v-if="loadingMembers" class="loading"><div class="spinner"></div></div>
        <div v-else class="card-grid">
          <div class="card" v-for="m in filteredMembers" :key="m.id">
            <div class="flex items-center gap-sm">
              <img :src="m.avatar" class="discord-avatar" alt="" />
              <div>
                <div class="text-sm" style="font-weight:600;">{{ m.displayName }}</div>
                <div class="text-sm text-muted">@{{ m.username }}</div>
              </div>
            </div>
            <div class="flex gap-sm mt-1 flex-wrap">
              <span v-for="r in m.roles.slice(0, 4)" :key="r.id" class="badge" :style="{ background: r.color + '22', color: r.color, border: '1px solid ' + r.color + '44' }">{{ r.name }}</span>
              <span v-if="m.roles.length > 4" class="text-muted text-sm">+{{ m.roles.length - 4 }}</span>
            </div>
            <div class="text-sm text-muted mt-1" style="font-family:monospace;">{{ m.id }}</div>
          </div>
        </div>
      </div>

      <!-- Roles -->
      <div v-if="tab === 'roles'">
        <div class="form-group mb-2">
          <input class="form-control" v-model="roleSearch" placeholder="Rechercher un rôle..." />
        </div>
        <div v-if="loadingRoles" class="loading"><div class="spinner"></div></div>
        <div v-else class="card-grid">
          <div class="card" v-for="r in filteredRoles" :key="r.id">
            <div class="flex items-center gap-sm">
              <div class="role-dot" :style="{ background: r.color }"></div>
              <div>
                <div class="text-sm" style="font-weight:600;">{{ r.name }}</div>
                <div class="text-sm text-muted">{{ r.memberCount }} membres</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Send message -->
      <div v-if="tab === 'send'">
        <div class="card">
          <h3 class="card-title">Envoyer un message</h3>
          <div class="form-group">
            <label>Salon</label>
            <select class="form-control" v-model="sendForm.channelId">
              <option v-for="c in channels" :key="c.id" :value="c.id">#{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea class="form-control" v-model="sendForm.content" rows="4" placeholder="Contenu du message..."></textarea>
          </div>
          <button class="btn btn-primary" @click="sendMessage" :disabled="!sendForm.channelId || !sendForm.content">📤 Envoyer</button>
        </div>
      </div>
    </template>

    <!-- Send modal -->
    <div class="modal-overlay" v-if="showSendModal" @click="showSendModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Envoyer dans #{{ sendModalChannel?.name }}</h2>
          <button class="modal-close" @click="showSendModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Message</label>
            <textarea class="form-control" v-model="sendForm.content" rows="4" placeholder="Message..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSendModal = false">Annuler</button>
          <button class="btn btn-primary" @click="sendMessage(); showSendModal = false">📤 Envoyer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const connected = ref(false)
const tab = ref('channels')
const tabs = [
  { id: 'channels', icon: '#', label: 'Salons' },
  { id: 'members', icon: '👥', label: 'Membres' },
  { id: 'roles', icon: '🏷️', label: 'Rôles' },
  { id: 'send', icon: '💬', label: 'Envoyer' }
]

const channels = ref([]); const loadingChannels = ref(false)
const members = ref([]); const loadingMembers = ref(false)
const roles = ref([]); const loadingRoles = ref(false)
const memberSearch = ref('')
const channelSearch = ref('')
const roleSearch = ref('')
const showSendModal = ref(false); const sendModalChannel = ref(null)
const sendForm = ref({ channelId: '', content: '' })

const filteredMembers = computed(() => {
  const q = memberSearch.value.toLowerCase()
  if (!q) return members.value
  return members.value.filter(m => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
})

const filteredChannels = computed(() => {
  const q = channelSearch.value.toLowerCase()
  if (!q) return channels.value
  return channels.value.filter(c => c.name.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q))
})

const filteredRoles = computed(() => {
  const q = roleSearch.value.toLowerCase()
  if (!q) return roles.value
  return roles.value.filter(r => r.name.toLowerCase().includes(q))
})

async function checkStatus() {
  try {
    const res = await api.getDiscordStatus()
    connected.value = res.data.connected
    if (connected.value) loadAll()
  } catch { connected.value = false }
}

async function loadAll() {
  loadChannels(); loadMembers(); loadRoles()
}

async function loadChannels() {
  loadingChannels.value = true
  try { const res = await api.getDiscordChannels(); channels.value = res.data } catch { channels.value = [] }
  loadingChannels.value = false
}

async function loadMembers() {
  loadingMembers.value = true
  try { const res = await api.getDiscordMembers(); members.value = res.data } catch { members.value = [] }
  loadingMembers.value = false
}

async function loadRoles() {
  loadingRoles.value = true
  try { const res = await api.getDiscordRoles(); roles.value = res.data } catch { roles.value = [] }
  loadingRoles.value = false
}

function openSendModal(channel) {
  sendModalChannel.value = channel
  sendForm.value = { channelId: channel.id, content: '' }
  showSendModal.value = true
}

async function sendMessage() {
  if (!sendForm.value.channelId || !sendForm.value.content) return
  try {
    await api.sendDiscordMessage(sendForm.value)
    toast('Message envoyé !')
    sendForm.value.content = ''
  } catch (e) { toast(e.message, 'error') }
}

onMounted(checkStatus)
</script>

<style scoped>
.discord-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
.role-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}
code {
  background: var(--bg-input);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.85em;
}
</style>
