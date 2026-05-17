<script setup>
import Modal from './components/Modal.vue'
import Sidebar from './components/Sidebar.vue'
import SendMessage from './components/SendMessage.vue'
import Message from './components/Message.vue'
import Input from './components/Input.vue'
import DatabaseStatus from './components/DatabaseStatus.vue'

import { ref } from 'vue'

const isModalOpen = ref(false)
const modalMode = ref('settings')

const openSettingsModal = () => {
  modalMode.value = 'settings'
  isModalOpen.value = true
}

const openNewNoteModal = () => {
  modalMode.value = 'new-note'
  isModalOpen.value = true
}
</script>

<template>
  <div class="container">
    <div class="layout">
      <Sidebar @open-settings="openSettingsModal" @open-new-note="openNewNoteModal" />
      <main class="content">
        <div class="header">
          <Input />
          <DatabaseStatus />
        </div>
        <div class="messages">
          <Message name="name" date="2026-04-02" message="test" />
          <Message name="name" date="2026-04-02" message="えへへ" />
          <Message name="name" date="2026-04-02" message="test" />
          <Message name="name" date="2026-04-02" message="test" />
          <Message name="name" date="2026-04-02" message="test" />
          <Message name="name" date="2026-04-02" message="test" />
          <Message name="name" date="2026-04-02" message="test" />
        </div>
        <SendMessage />
      </main>
    </div>
    <Modal v-model="isModalOpen">
      <template #header>
        <h2 class="modal-title">{{ modalMode === 'settings' ? '設定' : '新しいノート' }}</h2>
      </template>
      <template #body>
        <p class="modal-text">
          {{ modalMode === 'settings' ? '設定項目はここに追加します。' : '新しいノートの入力項目はここに追加します。' }}
        </p>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.container {
  padding: 16px;
}

.layout {
  display: flex;
  gap: 16px;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: calc(100vh - 32px);
  min-width: 0;
  min-height: 0;
}

.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.modal-title,
.modal-text {
  margin: 0;
}

.messages {
  flex: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;
  margin-bottom: 16px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.messages::-webkit-scrollbar {
  display: none;
}
</style>
