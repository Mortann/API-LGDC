/**
 * Client HTTP pour communiquer avec l'API REST LGDC.
 * Utilise le fetch natif de Node 18+.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || `Erreur API (${res.status})`);
    }
    return data;
}

module.exports = {
    // ── Organisations ──
    getOrganisations: () => request('/organisations'),
    getOrganisation: (id) => request(`/organisations/${id}`),

    // ── Emplacements ──
    getEmplacements: () => request('/emplacements'),
    getEmplacement: (id) => request(`/emplacements/${id}`),
    getEmplacementsByOrga: (id) => request(`/emplacements/organisation/${id}`),
    getEmplacementByChannel: (channelId) => request(`/emplacements/channel/${channelId}`),

    // ── OC ──
    getOCs: () => request('/ocs'),
    getOC: (id) => request(`/ocs/${id}`),
    getOCsByOrga: (id) => request(`/ocs/organisation/${id}`),
    deplacerOC: (id, body) => request(`/ocs/${id}/deplacement`, { method: 'PUT', body }),
    resetDailyOC: (id) => request(`/ocs/${id}/reset-daily`, { method: 'PUT' }),
    resetAllDaily: () => request('/ocs/reset-all-daily', { method: 'PUT' }),

    // ── PNJ ──
    getPNJs: () => request('/pnjs'),
    getPNJ: (id) => request(`/pnjs/${id}`),

    // ── Joueurs ──
    getJoueurs: () => request('/joueurs'),
    getJoueur: (id) => request(`/joueurs/${id}`),
    getJoueurOCs: (id) => request(`/joueurs/${id}/ocs`),
    getJoueurByDiscordId: (discordId) => request(`/joueurs/discord/${discordId}`),
    getJoueurOCsByDiscordId: (discordId) => request(`/joueurs/discord/${discordId}/ocs`),

    // ── Proies ──
    getProies: () => request('/proies'),
    getProie: (id) => request(`/proies/${id}`),

    // ── Temps ──
    getTemps: () => request('/temps'),

    // ── Chasse ──
    tenterChasse: (body) => request('/chasse/tenter', { method: 'POST', body }),
    getProiesDisponibles: (idEmpl) => request(`/chasse/proies-disponibles/${idEmpl}`),
    getStatsChasse: (idOC) => request(`/chasse/stats/${idOC}`),
    simulerChasse: (idOC, idProie, idEmpl) =>
        request(`/chasse/simuler?id_OC=${idOC}&id_Proie=${idProie}${idEmpl ? `&id_Emplacement=${idEmpl}` : ''}`),

    // ── Spawn Proies ──
    getSpawns: () => request('/spawn-proies'),
    getSpawnsByEmplacement: (id) => request(`/spawn-proies/emplacement/${id}`),

    // ── Messages ──
    getMessages: (type) => request(`/messages${type ? `?type=${type}` : ''}`),

    // ── Stats Joueurs ──
    getStats: () => request('/stats'),
    getStatsByDiscordId: (discordId) => request(`/stats/discord/${discordId}`),
    getStatsLeaderboard: (type) => request(`/stats/leaderboard?type=${type || 'messages'}`),
    initStats: (id_UtilisateurDiscord) => request('/stats/init', { method: 'POST', body: { id_UtilisateurDiscord } }),
    incrementStats: (id_UtilisateurDiscord, fields) => request('/stats/increment', { method: 'PUT', body: { id_UtilisateurDiscord, fields } }),
    setStats: (id_UtilisateurDiscord, fields) => request('/stats/set', { method: 'PUT', body: { id_UtilisateurDiscord, fields } }),
    resetDailyStats: () => request('/stats/reset-daily', { method: 'PUT' }),
    addCapture: (body) => request('/stats/capture', { method: 'POST', body }),
    getCaptures: (discordId) => request(`/stats/captures/${discordId}`),
};
