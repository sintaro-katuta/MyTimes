<script setup>
import { open } from '@tauri-apps/plugin-dialog'
import Modal from './components/Modal.vue'
import Sidebar from './components/Sidebar.vue'
import SendMessage from './components/SendMessage.vue'
import Message from './components/Message.vue'
import Input from './components/Input.vue'
import {
  createMessage,
  exportMessagesToMarkdown,
  loadMarkdownExportPath,
  loadMessages,
  saveMarkdownExportPath,
} from './lib/messages'

import { computed, onMounted, ref } from 'vue'

const isModalOpen = ref(false)
const modalMode = ref('settings')
const messages = ref([])
const isSaving = ref(false)
const isBrowsing = ref(false)
const exportStatus = ref('')
const markdownExportPath = ref('')
const settingsStatus = ref('')

const displayedMessages = computed(() =>
  messages.value.map((message) => ({
    ...message,
    displayDate: formatMessageDate(message.created_at),
  })),
)

const openSettingsModal = () => {
  modalMode.value = 'settings'
  settingsStatus.value = ''
  isModalOpen.value = true
}

const openNewNoteModal = () => {
  modalMode.value = 'new-note'
  isModalOpen.value = true
}

const refreshMessages = async () => {
  messages.value = await loadMessages()
}

const refreshMarkdownExportPath = async () => {
  markdownExportPath.value = await loadMarkdownExportPath()
}

const handleSendMessage = async (content) => {
  isSaving.value = true
  exportStatus.value = ''

  try {
    await createMessage(content)
    await refreshMessages()
    const result = await exportMessagesToMarkdown(messages.value, markdownExportPath.value)
    exportStatus.value = `${result.exported_count}件を書き出しました`
  } catch (error) {
    exportStatus.value = error instanceof Error ? error.message : '保存に失敗しました'
  } finally {
    isSaving.value = false
  }
}

const handleSaveSettings = async (close) => {
  isSaving.value = true
  settingsStatus.value = ''

  try {
    await saveMarkdownExportPath(markdownExportPath.value)
    await refreshMarkdownExportPath()
    settingsStatus.value = '保存しました'
    close()
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : '設定の保存に失敗しました'
  } finally {
    isSaving.value = false
  }
}

const handleBrowseMarkdownExportPath = async () => {
  isBrowsing.value = true
  settingsStatus.value = ''

  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      defaultPath: markdownExportPath.value || undefined,
      title: 'Markdown保存先を選択',
    })

    if (typeof selectedPath === 'string') {
      markdownExportPath.value = selectedPath
    }
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : '保存先の選択に失敗しました'
  } finally {
    isBrowsing.value = false
  }
}

const formatMessageDate = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(() => {
  refreshMessages().catch((error) => {
    exportStatus.value = error instanceof Error ? error.message : 'メッセージの読み込みに失敗しました'
  })
  refreshMarkdownExportPath().catch((error) => {
    exportStatus.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
})
</script>

<template>
  <div class="container">
    <div class="layout">
      <Sidebar @open-settings="openSettingsModal" @open-new-note="openNewNoteModal" />
      <main class="content">
        <div class="header">
          <Input />
        </div>
        <p v-if="exportStatus" class="export-status">{{ exportStatus }}</p>
        <div class="messages">
          <Message
            v-for="message in displayedMessages"
            :key="message.id"
            name="MyTimes"
            :date="message.displayDate"
            :message="message.content"
          />
        </div>
        <SendMessage :disabled="isSaving" @send="handleSendMessage" />
      </main>
    </div>
    <Modal v-model="isModalOpen">
      <template #header>
        <h2 class="modal-title">{{ modalMode === 'settings' ? '設定' : '新しいノート' }}</h2>
      </template>
      <template #body>
        <form v-if="modalMode === 'settings'" class="settings-form" @submit.prevent>
          <label class="field-label" for="markdown-export-path">Markdown保存先</label>
          <div class="path-field">
            <input
              id="markdown-export-path"
              v-model="markdownExportPath"
              class="path-input"
              type="text"
              placeholder="/Users/sintaro/Documents/MyTimes/entries"
            />
            <button
              type="button"
              class="secondary-button browse-button"
              :disabled="isBrowsing || isSaving"
              @click="handleBrowseMarkdownExportPath"
            >
              参照
            </button>
          </div>
          <p v-if="settingsStatus" class="settings-status">{{ settingsStatus }}</p>
        </form>
        <p v-else class="modal-text">新しいノートの入力項目はここに追加します。</p>
      </template>
      <template v-if="modalMode === 'settings'" #footer="{ close }">
        <button type="button" class="secondary-button" @click="close">キャンセル</button>
        <button type="button" class="primary-button" :disabled="isSaving" @click="handleSaveSettings(close)">保存</button>
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
  margin-bottom: 16px;
}

.export-status {
  margin: -6px 0 12px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.modal-title,
.modal-text {
  margin: 0;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.path-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input {
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 0 12px;
  background: var(--surface-input);
  color: var(--text-primary);
  font-size: 14px;
}

.path-input:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.settings-status {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.primary-button,
.secondary-button {
  height: 36px;
  border-radius: 8px;
  padding: 0 14px;
  cursor: pointer;
  font-size: 14px;
}

.primary-button {
  border: none;
  background: var(--bg-primary);
  color: var(--text-inverse);
}

.primary-button:hover {
  background: var(--bg-primary-hover);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.secondary-button {
  border: 1px solid var(--border-default);
  background: var(--surface-panel);
  color: var(--text-secondary);
}

.secondary-button:hover {
  background: var(--surface-card);
  color: var(--text-primary);
}

.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.browse-button {
  flex: 0 0 auto;
  min-width: 72px;
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
