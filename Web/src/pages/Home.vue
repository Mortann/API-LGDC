<template>
  <div>
    <div class="home-hero">
      <h1>Lueur d'Espoir | RP LGDC</h1>
      <p>Gestion du RP — Territoires, Personnages, Chasse</p>
    </div>
    <div class="home-grid">
      <router-link to="/carte" class="home-card">
        <div class="home-card-icon">🗺️</div>
        <h3>Carte Interactive</h3>
        <p>Explorer les territoires et gérer les zones</p>
      </router-link>
      <router-link to="/ocs" class="home-card">
        <div class="home-card-icon">🐱</div>
        <h3>Personnages (OC)</h3>
        <p>Fiches, stats et compétences</p>
      </router-link>
      <router-link to="/chasse" class="home-card">
        <div class="home-card-icon">🎯</div>
        <h3>Chasse</h3>
        <p>Tester la chasse et voir les stats</p>
      </router-link>
      <router-link to="/organisations" class="home-card">
        <div class="home-card-icon">⚔️</div>
        <h3>Organisations</h3>
        <p>Clans, Factions, Alliances</p>
      </router-link>
      <router-link to="/proies" class="home-card">
        <div class="home-card-icon">🐿️</div>
        <h3>Proies</h3>
        <p>Gibier, spawns et raretés</p>
      </router-link>
      <router-link to="/joueurs" class="home-card">
        <div class="home-card-icon">👤</div>
        <h3>Joueurs</h3>
        <p>Utilisateurs et leurs OC</p>
      </router-link>
      <router-link to="/pnjs" class="home-card">
        <div class="home-card-icon">🎭</div>
        <h3>PNJ</h3>
        <p>Personnages non-joueurs</p>
      </router-link>
      <router-link to="/temps" class="home-card">
        <div class="home-card-icon">🌦️</div>
        <h3>Temps / Météo</h3>
        <p>Difficulté et conditions</p>
      </router-link>
      <router-link to="/messages" class="home-card">
        <div class="home-card-icon">💬</div>
        <h3>Messages RP</h3>
        <p>Messages de chasse personnalisés</p>
      </router-link>
      <router-link to="/discord" class="home-card">
        <div class="home-card-icon">🤖</div>
        <h3>Discord</h3>
        <p>Gérer le serveur, membres, messages</p>
      </router-link>
    </div>
  </div>
</template>

<script setup>
</script>
