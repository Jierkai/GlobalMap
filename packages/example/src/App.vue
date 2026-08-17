<script setup lang="ts">
import { demos } from './demos'
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <header class="brand">
        <h1>GlobalMap</h1>
        <p>Examples · 编译产物冒烟</p>
      </header>
      <nav class="nav">
        <RouterLink
          v-for="demo in demos"
          :key="demo.name"
          :to="`/demos/${demo.name}`"
          class="nav-item"
        >
          <span class="nav-title">{{ demo.title }}</span>
          <span v-if="demo.description" class="nav-desc">{{ demo.description }}</span>
        </RouterLink>
      </nav>
      <footer class="sidebar-footer">1.0 后按功能域逐个填充 demo</footer>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
.layout {
  display: flex;
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 248px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
}

.brand {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #eef0f3;
}

.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #111827;
}

.brand p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.nav-item {
  display: block;
  padding: 9px 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  text-decoration: none;
}

.nav-item + .nav-item {
  margin-top: 2px;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.router-link-active {
  background: #ecf5f3;
  border-left-color: #0f766e;
}

.nav-title {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #1f2937;
}

.nav-desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

.sidebar-footer {
  padding: 12px 20px;
  border-top: 1px solid #eef0f3;
  font-size: 12px;
  color: #9ca3af;
}

.content {
  flex: 1;
  min-width: 0;
  position: relative;
  background: #f7f8fa;
}
</style>
