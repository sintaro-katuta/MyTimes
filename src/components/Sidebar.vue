<script setup>
import Icon from './Icon.vue'
import Button from './Button.vue'

import { Settings } from '@lucide/vue'

const emit = defineEmits(['open-settings', 'open-new-note'])

const openSettings = () => {
  emit('open-settings')
}

const openNewNote = () => {
  emit('open-new-note')
}
</script>

<template>
  <div class="sidebar">
    <div class="rail">
      <div class="icons">
        <Icon src="/example1.jpg" width="48" height="48" class="selected" />
        <Icon src="/example1.jpg" width="48" height="48" />
        <Icon src="/example1.jpg" width="48" height="48" />
      </div>
    </div>
    <div class="panel">
      <div class="header">
        <h1 class="heading">デイリー分報</h1>
        <div class="actions">
          <button type="button" class="icon-button" aria-label="設定" @click="openSettings">
            <Settings />
          </button>
        </div>
      </div>
      <hr class="divider" />
      <div class="notes">
        <div class="note">
          <p class="title">2026-01-01.md</p>
        </div>
        <div class="note">
          <p class="title">2026-01-01.md</p>
        </div>
      </div>
      <div class="footer">
        <Button color="primary" @click="openNewNote">新しいノート</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
}

.rail {
  width: 72px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--bg-base-1);
}

.icons {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
}

.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-base-2);
  cursor: pointer;
}

.divider {
  margin: 0 8px;
}

.selected {
  border: 1px solid white;
  border-radius: 12px;
  padding: 4px;
}

.panel {
  width: 300px;
  height: calc(100vh - 32px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-base-2);
  border-radius: 16px;
  padding: 16px;
}

.heading {
  font-size: 16px;
  color: var(--text-base-2);
  width: 100%;
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer {
  margin-top: auto;
}

.note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 8px;
}

.note:hover {
  background-color: var(--bg-base-3);
}

</style>
