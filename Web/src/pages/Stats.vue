<template>
  <div>
    <div class="page-header">
      <h1>Statistiques Joueurs</h1>
    </div>

    <!-- Leaderboard selector -->
    <div class="flex gap-sm mb-2 flex-wrap">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="btn btn-sm"
        :class="activeCategory === cat.key ? 'btn-primary' : 'btn-secondary'"
        @click="activeCategory = cat.key; loadLeaderboard()"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div> Chargement...</div>
    <div v-else-if="stats.length === 0" class="empty">
      <div class="empty-icon">📊</div>
      <p>Aucune statistique enregistrée</p>
    </div>

    <!-- Leaderboard table -->
    <div v-else class="table-responsive">
      <table class="stats-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th>Joueur</th>
            <th v-for="col in visibleColumns" :key="col.key" class="text-right">{{ col.icon }} {{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(stat, idx) in stats"
            :key="stat.id_UtilisateurDiscord"
            :class="{ 'stats-gold': idx === 0, 'stats-silver': idx === 1, 'stats-bronze': idx === 2 }"
            @click="openDetail(stat)"
            style="cursor:pointer;"
          >
            <td class="text-center">
              <span v-if="idx === 0" class="rank-medal">🥇</span>
              <span v-else-if="idx === 1" class="rank-medal">🥈</span>
              <span v-else-if="idx === 2" class="rank-medal">🥉</span>
              <span v-else class="text-muted">{{ idx + 1 }}</span>
            </td>
            <td>
              <div class="flex items-center gap-sm">
                <img v-if="discordAvatars[stat.id_UtilisateurDiscord]" :src="discordAvatars[stat.id_UtilisateurDiscord]" class="stats-avatar" />
                <div v-else class="stats-avatar-placeholder">👤</div>
                <div>
                  <div style="font-weight:600;">{{ discordNames[stat.id_UtilisateurDiscord] || stat.id_UtilisateurDiscord }}</div>
                  <div class="text-sm text-muted">{{ stat.nbr_ocs }} OC(s)</div>
                </div>
              </div>
            </td>
            <td v-for="col in visibleColumns" :key="col.key" class="text-right">
              <span class="stat-value">{{ formatStat(stat[col.key], col.format) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Détail joueur modal -->
    <div class="modal-overlay" v-if="showDetail" @click="showDetail = false">
      <div class="modal" @click.stop style="max-width:600px;">
        <div class="modal-header">
          <h2>📊 {{ detailName }}</h2>
          <button class="modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="modal-body" v-if="detailStat">
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-card-icon">💬</div>
              <div class="stat-card-value">{{ detailStat.nbr_messages_total }}</div>
              <div class="stat-card-label">Messages</div>
              <div class="stat-card-sub">{{ detailStat.nbr_messages_aujourd_hui }} aujourd'hui</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">🏹</div>
              <div class="stat-card-value">{{ detailStat.nbr_chasses_total }}</div>
              <div class="stat-card-label">Chasses</div>
              <div class="stat-card-sub">{{ detailStat.nbr_chasses_aujourd_hui }} aujourd'hui</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">🎯</div>
              <div class="stat-card-value">{{ detailStat.nbr_captures_total }}</div>
              <div class="stat-card-label">Captures</div>
              <div class="stat-card-sub">{{ detailStat.nbr_captures_aujourd_hui }} aujourd'hui</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📈</div>
              <div class="stat-card-value">{{ tauxReussite }}%</div>
              <div class="stat-card-label">Taux réussite</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">🔥</div>
              <div class="stat-card-value">{{ detailStat.meilleur_serie_captures }}</div>
              <div class="stat-card-label">Meilleure série</div>
              <div class="stat-card-sub">Actuelle: {{ detailStat.serie_captures_actuelle }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">❌</div>
              <div class="stat-card-value">{{ detailStat.nbr_echecs_chasse_total }}</div>
              <div class="stat-card-label">Échecs</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">🗺️</div>
              <div class="stat-card-value">{{ detailStat.nbr_deplacements_total }}</div>
              <div class="stat-card-label">Déplacements</div>
              <div class="stat-card-sub">{{ detailStat.nbr_deplacements_aujourd_hui }} aujourd'hui</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">⚡</div>
              <div class="stat-card-value">{{ detailStat.nbr_commandes_total }}</div>
              <div class="stat-card-label">Commandes</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📅</div>
              <div class="stat-card-value">{{ detailStat.nbr_jours_actifs }}</div>
              <div class="stat-card-label">Jours actifs</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">🐱</div>
              <div class="stat-card-value">{{ detailStat.nbr_ocs }}</div>
              <div class="stat-card-label">OCs</div>
            </div>
          </div>

          <div class="mt-2" v-if="detailStat.date_derniere_activite">
            <div class="text-sm text-muted">Dernière activité : {{ formatDate(detailStat.date_derniere_activite) }}</div>
            <div class="text-sm text-muted" v-if="detailStat.date_premiere_activite">Inscrit depuis : {{ formatDate(detailStat.date_premiere_activite) }}</div>
          </div>

          <!-- Historique des captures -->
          <h3 class="mt-2" style="font-size:0.9rem;color:var(--accent);">🎯 Dernières captures</h3>
          <div v-if="detailCaptures.length === 0" class="text-sm text-muted">Aucune capture enregistrée</div>
          <div v-else class="captures-list">
            <div v-for="c in detailCaptures" :key="c.id_Capture" class="capture-item">
              <div class="flex items-center justify-between">
                <span style="font-weight:600;">{{ c.nom_Proie }}</span>
                <span class="text-sm text-muted">{{ formatDate(c.date_capture) }}</span>
              </div>
              <div class="text-sm text-muted">
                par {{ c.nom_OC }} à {{ c.nom_Emplacement }} — {{ c.taux_reussite }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../services/api.js'

const toast = inject('toast')
const stats = ref([])
const loading = ref(true)
const activeCategory = ref('messages')
const showDetail = ref(false)
const detailStat = ref(null)
const detailName = ref('')
const detailCaptures = ref([])
const discordNames = ref({})
const discordAvatars = ref({})

const categories = [
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'captures', label: 'Captures', icon: '🎯' },
  { key: 'chasses', label: 'Chasses', icon: '🏹' },
  { key: 'deplacements', label: 'Déplacements', icon: '🗺️' },
  { key: 'activite', label: 'Activité', icon: '📅' }
]

const columnSets = {
  messages: [
    { key: 'nbr_messages_total', label: 'Total', icon: '💬' },
    { key: 'nbr_messages_aujourd_hui', label: "Auj.", icon: '📅' },
    { key: 'nbr_commandes_total', label: 'Cmds', icon: '⚡' },
    { key: 'nbr_jours_actifs', label: 'Jours', icon: '📅' }
  ],
  captures: [
    { key: 'nbr_captures_total', label: 'Captures', icon: '🎯' },
    { key: 'nbr_chasses_total', label: 'Chasses', icon: '🏹' },
    { key: 'nbr_echecs_chasse_total', label: 'Échecs', icon: '❌' },
    { key: 'meilleur_serie_captures', label: 'Série', icon: '🔥' }
  ],
  chasses: [
    { key: 'nbr_chasses_total', label: 'Total', icon: '🏹' },
    { key: 'nbr_captures_total', label: 'Captures', icon: '🎯' },
    { key: 'nbr_echecs_chasse_total', label: 'Échecs', icon: '❌' },
    { key: 'nbr_chasses_aujourd_hui', label: "Auj.", icon: '📅' }
  ],
  deplacements: [
    { key: 'nbr_deplacements_total', label: 'Total', icon: '🗺️' },
    { key: 'nbr_deplacements_aujourd_hui', label: "Auj.", icon: '📅' },
    { key: 'nbr_commandes_total', label: 'Cmds', icon: '⚡' }
  ],
  activite: [
    { key: 'nbr_jours_actifs', label: 'Jours', icon: '📅' },
    { key: 'nbr_messages_total', label: 'Msgs', icon: '💬' },
    { key: 'nbr_commandes_total', label: 'Cmds', icon: '⚡' },
    { key: 'nbr_chasses_total', label: 'Chasses', icon: '🏹' }
  ]
}

const visibleColumns = computed(() => columnSets[activeCategory.value] || columnSets.messages)

const tauxReussite = computed(() => {
  if (!detailStat.value || detailStat.value.nbr_chasses_total === 0) return 0
  return Math.round((detailStat.value.nbr_captures_total / detailStat.value.nbr_chasses_total) * 100)
})

function formatStat(val, format) {
  if (val == null) return '0'
  if (format === 'percent') return val + '%'
  return String(val)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function loadLeaderboard() {
  loading.value = true
  try {
    const res = await api.getStatsLeaderboard(activeCategory.value)
    stats.value = res.data || []
  } catch (e) { toast(e.message, 'error') }
  loading.value = false
}

async function loadDiscordInfo() {
  try {
    const res = await api.getDiscordMembers()
    const members = res.data || res
    if (Array.isArray(members)) {
      for (const m of members) {
        const id = m.user?.id || m.id
        if (id) {
          discordNames.value[id] = m.displayName || m.user?.globalName || m.user?.username || id
          const avatar = m.user?.avatar
            ? `https://cdn.discordapp.com/avatars/${id}/${m.user.avatar}.png?size=64`
            : null
          if (avatar) discordAvatars.value[id] = avatar
        }
      }
    }
  } catch { /* silencieux */ }
}

async function openDetail(stat) {
  detailStat.value = stat
  detailName.value = discordNames.value[stat.id_UtilisateurDiscord] || stat.id_UtilisateurDiscord
  detailCaptures.value = []
  showDetail.value = true

  try {
    const res = await api.getCaptures(stat.id_UtilisateurDiscord)
    detailCaptures.value = res.data || []
  } catch { /* silencieux */ }
}

onMounted(async () => {
  await Promise.all([loadLeaderboard(), loadDiscordInfo()])
})
</script>

<style scoped>
.table-responsive { overflow-x: auto; }

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.stats-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border);
}
.stats-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.stats-table tr:hover { background: var(--bg-card-hover, rgba(255,255,255,0.03)); }
.stats-gold td:first-child { border-left: 3px solid #ffd700; }
.stats-silver td:first-child { border-left: 3px solid #c0c0c0; }
.stats-bronze td:first-child { border-left: 3px solid #cd7f32; }
.text-right { text-align: right; }
.text-center { text-align: center; }

.rank-medal { font-size: 1.1rem; }
.stat-value { font-weight: 600; font-variant-numeric: tabular-nums; }

.stats-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}
.stats-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  border: 2px solid var(--border);
}

/* Stat cards grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
.stat-card {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  text-align: center;
}
.stat-card-icon { font-size: 1.3rem; margin-bottom: 0.25rem; }
.stat-card-value { font-size: 1.4rem; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.stat-card-label { font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.03em; }
.stat-card-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem; }

/* Captures list */
.captures-list { max-height: 200px; overflow-y: auto; }
.capture-item {
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}
</style>
