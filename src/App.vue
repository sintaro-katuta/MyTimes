<script setup>
import Database from '@tauri-apps/plugin-sql'
import { computed, nextTick, onMounted, ref } from 'vue'
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
const folders = ref([])
const folderNotes = ref([])
const selectedFolderId = ref(null)
const isLoadingMessages = ref(true)
const isLoadingFolders = ref(true)
const isSendingMessage = ref(false)
const loadMessageError = ref('')
const loadFolderError = ref('')
const sendMessageError = ref('')

const formatLocalDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const selectedFolder = computed(() => {
  if (selectedFolderId.value === null) return null

  return folders.value.find((folder) => folder.id === selectedFolderId.value) ?? null
})

const currentNotePath = computed(() => {
  const today = formatLocalDateKey(new Date())
  const fileName = `${today}.md`

  if (!selectedFolder.value) {
    return fileName
  }

  return `${selectedFolder.value.markdownExportPath}/${fileName}`
})

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

const loadFolders = async () => {
  isLoadingFolders.value = true
  loadFolderError.value = ''

  try {
    const database = await getDatabase()
    const rows = await database.select(
      `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath
       FROM folders
       ORDER BY path ASC, id ASC`,
    )

    folders.value = rows

    if (
      selectedFolderId.value !== null &&
      !rows.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null
    }
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'フォルダの読み込みに失敗しました'
  } finally {
    isLoadingFolders.value = false
  }
}

const loadFolderNotes = async () => {
  try {
    const database = await getDatabase()
    const params = []
    let whereClause = ''

    if (selectedFolderId.value !== null) {
      whereClause = 'WHERE folder_id = ?'
      params.push(selectedFolderId.value)
    }

    const rows = await database.select(
      `SELECT COALESCE(note_path, strftime('%Y-%m-%d.md', created_at)) AS path,
              COUNT(*) AS messageCount,
              MAX(created_at) AS updatedAt
       FROM messages
       ${whereClause}
       GROUP BY COALESCE(note_path, strftime('%Y-%m-%d.md', created_at))
       ORDER BY updatedAt DESC, path ASC`,
      params,
    )

    folderNotes.value = rows
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'ノート一覧の読み込みに失敗しました'
  }
}

const loadMessages = async () => {
  isLoadingMessages.value = true
  loadMessageError.value = ''

  try {
    const database = await getDatabase()
    const params = []
    let whereClause = ''

    if (selectedFolderId.value !== null) {
      whereClause = 'WHERE folder_id = ?'
      params.push(selectedFolderId.value)
    }

    const rows = await database.select(
      `SELECT id, content, created_at
       FROM messages
       ${whereClause}
       ORDER BY created_at ASC, id ASC`,
      params,
    )

    messages.value = rows.map((row) => ({
      id: row.id,
      name: '自分',
      date: formatMessageDate(row.created_at),
      message: row.content,
    }))

    await scrollMessagesToBottom()
    await loadFolderNotes()
  } catch (error) {
    loadMessageError.value = error instanceof Error ? error.message : 'メッセージの読み込みに失敗しました'
  } finally {
    isLoadingMessages.value = false
  }
}

const normalizeFolderName = (value) => value.trim().replaceAll('/', '-')

const buildFolderPath = (name, parentFolder) => {
  if (!parentFolder) return name

  return `${parentFolder.path}/${name}`
}

const createFolder = async (name) => {
  const folderName = normalizeFolderName(name)

  if (!folderName) return

  loadFolderError.value = ''

  try {
    const database = await getDatabase()
    const parentFolder = selectedFolder.value
    const now = new Date().toISOString()
    const path = buildFolderPath(folderName, parentFolder)

    await database.execute(
      `INSERT INTO folders (name, parent_id, path, markdown_export_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [folderName, parentFolder?.id ?? null, path, path, now, now],
    )

    await loadFolders()

    const createdFolder = folders.value.find((folder) => folder.path === path)
    selectedFolderId.value = createdFolder?.id ?? selectedFolderId.value
    await loadMessages()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'フォルダの作成に失敗しました'
  }
}

const selectFolder = async (folderId) => {
  selectedFolderId.value = folderId
  await loadMessages()
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
      `INSERT INTO messages (content, note_path, folder_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [content, currentNotePath.value, selectedFolder.value?.id ?? null, now, now],
    )

    draftMessage.value = ''
    await loadMessages()
  } catch (error) {
    sendMessageError.value = error instanceof Error ? error.message : 'メッセージの送信に失敗しました'
  } finally {
    isSendingMessage.value = false
  }
}

onMounted(async () => {
  await loadFolders()
  await loadMessages()
})
</script>

<template>
  <div class="container">
    <div class="layout">
      <Sidebar
        :folders="folders"
        :notes="folderNotes"
        :selected-folder-id="selectedFolderId"
        :is-loading-folders="isLoadingFolders"
        :folder-error="loadFolderError"
        @create-folder="createFolder"
        @select-folder="selectFolder"
        @open-settings="openSettingsModal"
        @open-new-note="openNewNoteModal"
      />
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
