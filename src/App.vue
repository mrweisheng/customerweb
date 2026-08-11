<template>
  <div id="app" :class="{ 'app-pc': isDesktop, 'app-mobile': !isDesktop }">
    <Sidebar v-if="isDesktop && showShell" />
    <main class="app-main" :class="{ 'with-sidebar': isDesktop && showShell }">
      <router-view />
    </main>
    <TabBar v-if="!isDesktop && showTabbar" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useDevice } from './composables/useDevice'

const route = useRoute()
const { isDesktop } = useDevice()

const showTabbar = computed(() => route.meta.showTabbar)
const showShell = computed(() => route.meta.showTabbar)
</script>

<style>
#app {
  min-height: 100vh;
}

#app.app-pc {
  background: #F2F3F5;
  display: block;
}

#app.app-mobile {
  background: var(--bg-primary);
}

.app-main {
  min-height: 100vh;
}

.app-main.with-sidebar {
  margin-left: 232px;
  min-height: 100vh;
  background: transparent;
}
</style>
