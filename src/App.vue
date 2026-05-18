<script setup>
import Database from '@tauri-apps/plugin-sql'
import { nextTick, onMounted, ref } from 'vue'
import Modal from './components/Modal.vue'
import Sidebar from './components/Sidebar.vue'
import SendMessage from './components/SendMessage.vue'
import Message from './components/Message.vue'
import Input from './components/Input.vue'

const isModalOpen = ref(false)
const modalMode = ref('settings')
const db = ref(null)
const messages = ref([])
const draftMessage = ref('')
const messagesRef = ref(null)
const isLoadingMessages = ref(true)
const isSendingMessage = ref(false)
const loadMessageError = ref('')
const sendMessageError = ref('')

const openSettingsModal = () => {
  modalMode.value = 'settings'
  isModalOpen.value = true
}

const openNewNoteModal = () => {
  modalMode.value = 'new-note'
  isModalOpen.value = true
}

const getDatabase = async () => {
  if (!db.value) {
    db.value = await Database.load('sqlite:mytimes.db')
  }

  return db.value
}

const formatMessageDate = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const scrollMessagesToBottom = async () => {
  await nextTick()

  if (!messagesRef.value) return

  messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

const loadMessages = async () => {
  isLoadingMessages.value = true
  loadMessageError.value = ''

  try {
    const database = await getDatabase()
    const rows = await database.select(
      `SELECT id, content, created_at
       FROM messages
       ORDER BY created_at ASC, id ASC`,
    )

    messages.value = rows.map((row) => ({
      id: row.id,
      name: '自分',
      date: formatMessageDate(row.created_at),
      message: row.content,
    }))

    await scrollMessagesToBottom()
  } catch (error) {
    loadMessageError.value = error instanceof Error ? error.message : 'メッセージの読み込みに失敗しました'
  } finally {
    isLoadingMessages.value = false
  }
}

const sendMessage = async () => {
  const content = draftMessage.value.trim()

  if (!content || isSendingMessage.value) return

  isSendingMessage.value = true
  sendMessageError.value = ''

  try {
    const database = await getDatabase()
    const now = new Date().toISOString()

    await database.execute(
      `INSERT INTO messages (content, created_at, updated_at)
       VALUES (?, ?, ?)`,
      [content, now, now],
    )

    draftMessage.value = ''
    await loadMessages()
  } catch (error) {
    sendMessageError.value = error instanceof Error ? error.message : 'メッセージの送信に失敗しました'
  } finally {
    isSendingMessage.value = false
  }
}

onMounted(() => {
  loadMessages()
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
        <div ref="messagesRef" class="messages">
          <p v-if="isLoadingMessages" class="messages-state">メッセージを読み込み中</p>
          <p v-else-if="loadMessageError" class="messages-state is-error">{{ loadMessageError }}</p>
          <p v-else-if="messages.length === 0" class="messages-state">まだメッセージはありません</p>
          <template v-else>
            <Message
              v-for="message in messages"
              :key="message.id"
              :name="message.name"
              :date="message.date"
              :message="message.message"
            />
          </template>
        </div>
        <SendMessage
          v-model="draftMessage"
          :is-sending="isSendingMessage"
          :error-message="sendMessageError"
          @submit="sendMessage"
        />
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
  display: flex;
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

.messages-state {
  align-self: center;
  margin: auto 0;
  color: var(--text-tertiary);
  font-size: 14px;
}

.messages-state.is-error {
  color: var(--bg-error);
}
</style>
