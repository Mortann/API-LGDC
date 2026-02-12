<template>
  <div>
    <nav class="navbar" v-if="!isLoginPage">
      <div class="navbar-inner">
        <router-link to="/" class="navbar-brand">Lueur d'Espoir | RP LGDC</router-link>
        <div class="navbar-right">
          <div v-if="currentUser" class="navbar-user">
            <img v-if="currentUser.avatar" :src="currentUser.avatar" class="navbar-avatar" />
            <span class="navbar-username">{{ currentUser.displayName }}</span>
            <button class="btn btn-sm btn-secondary" @click="logout" title="Déconnexion">✕</button>
          </div>
          <button class="navbar-toggle" @click="menuOpen = !menuOpen">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="nav-links" :class="{ open: menuOpen }">
        <router-link to="/carte" @click="menuOpen = false">Carte</router-link>
        <router-link to="/organisations" @click="menuOpen = false">Organisations</router-link>
        <router-link to="/emplacements" @click="menuOpen = false">Emplacements</router-link>
        <router-link to="/ocs" @click="menuOpen = false">OC</router-link>
        <router-link to="/pnjs" @click="menuOpen = false">PNJ</router-link>
        <router-link to="/joueurs" @click="menuOpen = false">Joueurs</router-link>
        <router-link to="/proies" @click="menuOpen = false">Proies</router-link>
        <router-link to="/chasse" @click="menuOpen = false">Chasse</router-link>
        <router-link to="/temps" @click="menuOpen = false">Temps</router-link>
        <router-link to="/spawns" @click="menuOpen = false">Spawns</router-link>
        <router-link to="/messages" @click="menuOpen = false">Messages</router-link>
        <router-link to="/stats" @click="menuOpen = false">Stats</router-link>
        <router-link to="/discord" @click="menuOpen = false">Discord</router-link>
      </div>
    </nav>
    <main class="main-content" v-if="!isLoginPage && $route.name !== 'carte'">
      <router-view />
    </main>
    <router-view v-else />
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" :class="['toast', `toast-${t.type}`]">{{ t.text }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const toasts = ref([])
let toastId = 0

const isLoginPage = computed(() => route.name === 'login' || route.name === 'auth-callback')

const currentUser = computed(() => {
  try {
    const data = localStorage.getItem('lgdc_user')
    return data ? JSON.parse(data) : null
  } catch { return null }
})

function logout() {
  localStorage.removeItem('lgdc_token')
  localStorage.removeItem('lgdc_user')
  router.push('/login')
}

function toast(text, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, text, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

provide('toast', toast)
</script>
