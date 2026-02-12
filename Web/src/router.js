import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'login', component: () => import('./pages/Login.vue'), meta: { public: true } },
  { path: '/auth/callback', name: 'auth-callback', component: () => import('./pages/Login.vue'), meta: { public: true } },
  { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
  { path: '/carte', name: 'carte', component: () => import('./pages/Carte.vue') },
  { path: '/organisations', name: 'organisations', component: () => import('./pages/Organisations.vue') },
  { path: '/emplacements', name: 'emplacements', component: () => import('./pages/Emplacements.vue') },
  { path: '/ocs', name: 'ocs', component: () => import('./pages/OCs.vue') },
  { path: '/ocs/:id', name: 'oc-detail', component: () => import('./pages/OCDetail.vue') },
  { path: '/pnjs', name: 'pnjs', component: () => import('./pages/PNJs.vue') },
  { path: '/joueurs', name: 'joueurs', component: () => import('./pages/Joueurs.vue') },
  { path: '/proies', name: 'proies', component: () => import('./pages/Proies.vue') },
  { path: '/chasse', name: 'chasse', component: () => import('./pages/Chasse.vue') },
  { path: '/temps', name: 'temps', component: () => import('./pages/Temps.vue') },
  { path: '/messages', name: 'messages', component: () => import('./pages/Messages.vue') },
  { path: '/spawns', name: 'spawns', component: () => import('./pages/Spawns.vue') },
  { path: '/stats', name: 'stats', component: () => import('./pages/Stats.vue') },
  { path: '/discord', name: 'discord', component: () => import('./pages/Discord.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard
router.beforeEach((to, from, next) => {
  if (to.meta.public) return next()
  const token = localStorage.getItem('lgdc_token')
  if (!token) return next({ name: 'login' })
  next()
})

export default router
