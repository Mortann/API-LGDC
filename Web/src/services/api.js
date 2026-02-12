const API_BASE = '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('lgdc_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: getAuthHeaders(),
    ...options
  }
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }
  const res = await fetch(url, config)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Erreur API')
  return data
}

export default {
  // Organisations
  getOrganisations: () => request('/organisations'),
  getOrganisation: (id) => request(`/organisations/${id}`),
  createOrganisation: (body) => request('/organisations', { method: 'POST', body }),
  updateOrganisation: (id, body) => request(`/organisations/${id}`, { method: 'PUT', body }),
  deleteOrganisation: (id) => request(`/organisations/${id}`, { method: 'DELETE' }),

  // Emplacements
  getEmplacements: () => request('/emplacements'),
  getEmplacement: (id) => request(`/emplacements/${id}`),
  getEmplacementsByOrga: (id) => request(`/emplacements/organisation/${id}`),
  createEmplacement: (body) => request('/emplacements', { method: 'POST', body }),
  updateEmplacement: (id, body) => request(`/emplacements/${id}`, { method: 'PUT', body }),
  deleteEmplacement: (id) => request(`/emplacements/${id}`, { method: 'DELETE' }),

  // OC
  getOCs: () => request('/ocs'),
  getOC: (id) => request(`/ocs/${id}`),
  getOCsByOrga: (id) => request(`/ocs/organisation/${id}`),
  createOC: (body) => request('/ocs', { method: 'POST', body }),
  updateOC: (id, body) => request(`/ocs/${id}`, { method: 'PUT', body }),
  deleteOC: (id) => request(`/ocs/${id}`, { method: 'DELETE' }),
  deplacerOC: (id, body) => request(`/ocs/${id}/deplacement`, { method: 'PUT', body }),
  resetDailyOC: (id) => request(`/ocs/${id}/reset-daily`, { method: 'PUT' }),
  resetAllDaily: () => request('/ocs/reset-all-daily', { method: 'PUT' }),

  // PNJ
  getPNJs: () => request('/pnjs'),
  getPNJ: (id) => request(`/pnjs/${id}`),
  createPNJ: (body) => request('/pnjs', { method: 'POST', body }),
  updatePNJ: (id, body) => request(`/pnjs/${id}`, { method: 'PUT', body }),
  deletePNJ: (id) => request(`/pnjs/${id}`, { method: 'DELETE' }),

  // Joueurs
  getJoueurs: () => request('/joueurs'),
  getJoueur: (id) => request(`/joueurs/${id}`),
  getJoueurOCs: (id) => request(`/joueurs/${id}/ocs`),
  getJoueurByDiscordId: (discordId) => request(`/joueurs/discord/${discordId}`),
  getJoueurOCsByDiscordId: (discordId) => request(`/joueurs/discord/${discordId}/ocs`),
  createJoueur: (body) => request('/joueurs', { method: 'POST', body }),
  updateJoueur: (id, body) => request(`/joueurs/${id}`, { method: 'PUT', body }),
  deleteJoueur: (id) => request(`/joueurs/${id}`, { method: 'DELETE' }),

  // Proies
  getProies: () => request('/proies'),
  getProie: (id) => request(`/proies/${id}`),
  getProieMessages: (id) => request(`/proies/${id}/messages`),
  createProie: (body) => request('/proies', { method: 'POST', body }),
  updateProie: (id, body) => request(`/proies/${id}`, { method: 'PUT', body }),
  deleteProie: (id) => request(`/proies/${id}`, { method: 'DELETE' }),

  // Temps
  getTemps: () => request('/temps'),
  createTemps: (body) => request('/temps', { method: 'POST', body }),
  updateTemps: (id, body) => request(`/temps/${id}`, { method: 'PUT', body }),
  deleteTemps: (id) => request(`/temps/${id}`, { method: 'DELETE' }),

  // Spawn Proies
  getSpawns: () => request('/spawn-proies'),
  getSpawnsByEmplacement: (id) => request(`/spawn-proies/emplacement/${id}`),
  createSpawn: (body) => request('/spawn-proies', { method: 'POST', body }),
  updateSpawn: (id, body) => request(`/spawn-proies/${id}`, { method: 'PUT', body }),
  deleteSpawn: (id) => request(`/spawn-proies/${id}`, { method: 'DELETE' }),

  // Messages
  getMessages: (type) => request(`/messages${type ? `?type=${type}` : ''}`),
  createMessage: (body) => request('/messages', { method: 'POST', body }),
  updateMessage: (id, body) => request(`/messages/${id}`, { method: 'PUT', body }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE' }),
  linkMessageProie: (msgId, proieId) => request(`/messages/${msgId}/proie/${proieId}`, { method: 'POST' }),
  unlinkMessageProie: (msgId, proieId) => request(`/messages/${msgId}/proie/${proieId}`, { method: 'DELETE' }),

  // Chasse
  tenterChasse: (body) => request('/chasse/tenter', { method: 'POST', body }),
  getProiesDisponibles: (idEmpl) => request(`/chasse/proies-disponibles/${idEmpl}`),
  getStatsChasse: (idOC) => request(`/chasse/stats/${idOC}`),
  simulerChasse: (params) => request(`/chasse/simuler?${new URLSearchParams(params)}`),

  // Stats Joueurs
  getAllStats: () => request('/stats'),
  getStatsByDiscordId: (discordId) => request(`/stats/discord/${discordId}`),
  getStatsLeaderboard: (type) => request(`/stats/leaderboard?type=${type || 'messages'}`),
  getCaptures: (discordId) => request(`/stats/captures/${discordId}`),

  // Discord
  getDiscordStatus: () => request('/discord/status'),
  getDiscordChannels: () => request('/discord/channels'),
  getDiscordMembers: () => request('/discord/members'),
  getDiscordMember: (id) => request(`/discord/members/${id}`),
  getDiscordRoles: () => request('/discord/roles'),
  sendDiscordMessage: (body) => request('/discord/send', { method: 'POST', body }),
  addDiscordRole: (userId, roleId) => request(`/discord/roles/${userId}/${roleId}`, { method: 'POST' }),
  removeDiscordRole: (userId, roleId) => request(`/discord/roles/${userId}/${roleId}`, { method: 'DELETE' }),

  // Auth
  getAuthUrl: () => request('/auth/login'),
  authCallback: (code) => request('/auth/callback', { method: 'POST', body: { code } }),
  getMe: () => request('/auth/me')
}
