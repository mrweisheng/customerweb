<template>
  <div id="app">
    <router-view />
    <TabBar />
  </div>
</template>

<script setup>
import TabBar from './components/TabBar.vue'
</script>

<style>
#app {
  min-height: 100vh;
}
</style>
