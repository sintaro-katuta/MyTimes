<script setup>
import { open } from '@tauri-apps/plugin-dialog'
import { computed, nextTick, onMounted, ref } from 'vue'
import Modal from './components/Modal.vue'
import Sidebar from './components/Sidebar.vue'
import SendMessage from './components/SendMessage.vue'
import Message from './components/Message.vue'
import Input from './components/Input.vue'
import {
  appendChatMessageToMarkdown,
  listMarkdownFiles,
  parseMarkdownToChat,
  readMarkdownFile,
  saveMarkdownFile,
} from './lib/markdownFiles'
import {
  createMessage,
  exportMessagesToMarkdown,
  loadAppTitle,
  loadFolderNotes as loadStoredFolderNotes,
  loadFolders as loadStoredFolders,
  loadMarkdownExportPath,
  loadMessages as loadStoredMessages,
  registerProject,
  saveAppTitle,
  saveFolderIconPath,
  saveFolderMarkdownExportPath,
  saveMarkdownExportPath,
  saveProjectDisplayName,
} from './lib/messages'

const isModalOpen = ref(false)
const modalMode = ref('app-settings')
const messages = ref([])
const draftMessage = ref('')
const messagesRef = ref(null)
const folders = ref([])
const folderNotes = ref([])
const selectedFolderId = ref(null)
const selectedNotePath = ref(null)
const isLoadingMessages = ref(true)
const isLoadingFolders = ref(true)
const isLoadingFolderNotes = ref(false)
const isSendingMessage = ref(false)
const isSavingSettings = ref(false)
const isBrowsing = ref(false)
const loadMessageError = ref('')
const loadFolderError = ref('')
const loadFolderNotesError = ref('')
const sendMessageError = ref('')
const exportStatus = ref('')
const selectedMarkdownContent = ref('')
const markdownExportPath = ref('')
const appTitle = ref('デイリー分報')
const settingsAppTitle = ref('')
const settingsMarkdownExportPath = ref('')
const folderName = ref('')
const folderCreateIconPath = ref('')
const projectDirectoryPath = ref('')
const renameFolderName = ref('')
const folderIconPath = ref('')
const folderMarkdownExportPath = ref('')
const settingsStatus = ref('')

const selectedFolder = computed(() => {
  if (selectedFolderId.value === null) return null

  return folders.value.find((folder) => folder.id === selectedFolderId.value) ?? null
})

const isMarkdownSendDisabled = computed(() => Boolean(selectedFolder.value && !selectedNotePath.value))

const modalSize = computed(() =>
  modalMode.value === 'app-settings' || modalMode.value === 'folder-settings' ? 'wide' : 'default',
)

const openSettingsModal = () => {
  modalMode.value = 'app-settings'
  settingsAppTitle.value = appTitle.value
  settingsMarkdownExportPath.value = markdownExportPath.value
  settingsStatus.value = ''
  isModalOpen.value = true
}

const openCreateFolderModal = () => {
  modalMode.value = 'create-project'
  folderName.value = ''
  folderCreateIconPath.value = ''
  projectDirectoryPath.value = ''
  loadFolderError.value = ''
  isModalOpen.value = true
}

const openFolderSettingsModal = () => {
  if (!selectedFolder.value) return

  modalMode.value = 'folder-settings'
  renameFolderName.value = selectedFolder.value.name
  folderIconPath.value = selectedFolder.value.iconPath ?? ''
  folderMarkdownExportPath.value = selectedFolder.value.markdownExportPath ?? selectedFolder.value.path
  loadFolderError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
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

const refreshFolders = async () => {
  isLoadingFolders.value = true
  loadFolderError.value = ''

  try {
    const rows = await loadStoredFolders()
    folders.value = rows

    if (
      selectedFolderId.value !== null &&
      !rows.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null
    }
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクト一覧の読み込みに失敗しました'
  } finally {
    isLoadingFolders.value = false
  }
}

const refreshFolderNotes = async () => {
  isLoadingFolderNotes.value = true
  loadFolderNotesError.value = ''

  try {
    folderNotes.value = selectedFolder.value
      ? await listMarkdownFiles(currentMarkdownExportPath())
      : await loadStoredFolderNotes({ folderId: selectedFolderId.value })
    loadFolderError.value = ''
  } catch (error) {
    loadFolderNotesError.value = error instanceof Error ? error.message : 'ファイル一覧の読み込みに失敗しました'
  } finally {
    isLoadingFolderNotes.value = false
  }
}

const toViewMessage = (row) => ({
  ...row,
  name: '自分',
  date: formatMessageDate(row.created_at),
  message: row.content,
})

const toMarkdownViewMessage = (message, index, notePath = selectedNotePath.value) => ({
  id: `${notePath ?? 'markdown'}:${message.sortOrder ?? index}`,
  name: '自分',
  date: [message.date, message.time].filter(Boolean).join(' '),
  message: message.content,
})

const refreshMessages = async () => {
  isLoadingMessages.value = true
  loadMessageError.value = ''

  try {
    if (selectedFolder.value && selectedNotePath.value) {
      const markdown = await readMarkdownFile({
        projectDir: currentMarkdownExportPath(),
        relativePath: selectedNotePath.value,
      })
      const parsed = await parseMarkdownToChat(markdown)

      selectedMarkdownContent.value = markdown
      messages.value = parsed.messages.map(toMarkdownViewMessage)

      await scrollMessagesToBottom()
      await refreshFolderNotes()
      return
    }

    selectedMarkdownContent.value = ''

    if (selectedFolder.value) {
      messages.value = []
      await refreshFolderNotes()
      return
    }

    const rows = await loadStoredMessages({
      folderId: selectedFolderId.value,
      notePath: selectedNotePath.value,
    })

    messages.value = rows.map(toViewMessage)

    await scrollMessagesToBottom()
    await refreshFolderNotes()
  } catch (error) {
    loadMessageError.value = error instanceof Error ? error.message : 'Markdownファイルの読み込みに失敗しました'
  } finally {
    isLoadingMessages.value = false
  }
}

const getPathBaseName = (path) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

const handleCreateFolder = async (close) => {
  const directoryPath = projectDirectoryPath.value.trim()

  if (!directoryPath) return

  loadFolderError.value = ''

  try {
    const createdProject = await registerProject({
      directoryPath,
      displayName: folderName.value,
      iconPath: folderCreateIconPath.value,
    })

    await refreshFolders()
    if (loadFolderError.value) return

    selectedFolderId.value = createdProject?.id ?? selectedFolderId.value
    selectedNotePath.value = null
    await refreshMessages()

    folderName.value = ''
    folderCreateIconPath.value = ''
    projectDirectoryPath.value = ''
    close()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトの登録に失敗しました'
  }
}

const handleSaveFolderSettings = async (close = null) => {
  const name = renameFolderName.value.trim()

  if (!name || !selectedFolder.value) return

  loadFolderError.value = ''

  try {
    const folder = selectedFolder.value
    const renamedFolder = folder.name === name ? folder : await saveProjectDisplayName(folder.id, name)
    const iconPath = folderIconPath.value.trim()
    const markdownPath = folderMarkdownExportPath.value.trim()

    if (iconPath !== (folder.iconPath ?? '')) {
      await saveFolderIconPath(folder.id, iconPath || null)
    }

    if (markdownPath !== (folder.markdownExportPath ?? '')) {
      await saveFolderMarkdownExportPath(folder.id, markdownPath || renamedFolder?.path || folder.path)
    }

    await refreshFolders()
    selectedFolderId.value = renamedFolder?.id ?? selectedFolderId.value
    selectedNotePath.value = null
    await refreshMessages()
    close?.()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクト設定の保存に失敗しました'
  }
}

const handleBrowseFolderMarkdownExportPath = async () => {
  if (!selectedFolder.value) return

  loadFolderError.value = ''

  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      defaultPath: folderMarkdownExportPath.value || undefined,
      title: 'プロジェクトのMarkdown保存先を選択',
    })

    if (typeof selectedPath !== 'string') return

    folderMarkdownExportPath.value = selectedPath
    await handleSaveFolderSettings()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトのMarkdown保存先の変更に失敗しました'
  }
}

const handleBrowseFolderIcon = async () => {
  if (!selectedFolder.value) return

  loadFolderError.value = ''

  try {
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: '画像',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'],
        },
      ],
      title: 'プロジェクト画像を選択',
    })

    if (typeof selectedPath !== 'string') return

    folderIconPath.value = selectedPath
    await handleSaveFolderSettings()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクト画像の変更に失敗しました'
  }
}

const handleBrowseCreateFolderIcon = async () => {
  loadFolderError.value = ''

  try {
    const selectedPath = await open({
      multiple: false,
      filters: [
        {
          name: '画像',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'],
        },
      ],
      title: 'プロジェクト画像を選択',
    })

    if (typeof selectedPath === 'string') {
      folderCreateIconPath.value = selectedPath
    }
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクト画像の選択に失敗しました'
  }
}

const handleBrowseCreateProjectDirectory = async () => {
  loadFolderError.value = ''

  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: 'プロジェクトフォルダーを選択',
    })

    if (typeof selectedPath !== 'string') return

    const previousBaseName = getPathBaseName(projectDirectoryPath.value || '')
    projectDirectoryPath.value = selectedPath

    if (!folderName.value.trim() || folderName.value.trim() === previousBaseName) {
      folderName.value = getPathBaseName(selectedPath)
    }
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトフォルダーの選択に失敗しました'
  }
}

const selectFolder = async (folderId) => {
  selectedFolderId.value = folderId
  selectedNotePath.value = null
  await refreshMessages()
}

const selectNote = async (notePath) => {
  selectedNotePath.value = notePath
  await refreshMessages()
}

const selectAllNotesInFolder = async () => {
  selectedNotePath.value = null
  await refreshMessages()
}

const refreshMarkdownExportPath = async () => {
  markdownExportPath.value = await loadMarkdownExportPath()
}

const refreshAppTitle = async () => {
  appTitle.value = await loadAppTitle()
}

const isAbsolutePath = (path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)

const currentMarkdownExportPath = () => {
  const basePath = markdownExportPath.value.trim()

  if (!selectedFolder.value) return basePath

  const folderPath = selectedFolder.value.markdownExportPath?.trim() || selectedFolder.value.path

  if (isAbsolutePath(folderPath) || !basePath) {
    return folderPath
  }

  return `${basePath.replace(/[\\/]+$/, '')}/${folderPath.replace(/^[\\/]+/, '')}`
}

const currentLocalDateParts = () => {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')

  return {
    date: [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('-'),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

const sendMessage = async () => {
  const content = draftMessage.value.trim()

  if (!content || isSendingMessage.value) return

  isSendingMessage.value = true
  sendMessageError.value = ''
  exportStatus.value = ''

  try {
    if (isMarkdownSendDisabled.value) {
      sendMessageError.value = 'ファイルを選択してから送信してください'
      return
    }

    if (selectedFolder.value && selectedNotePath.value) {
      const projectDir = currentMarkdownExportPath()
      const relativePath = selectedNotePath.value
      const { date, time } = currentLocalDateParts()
      const latestMarkdown = await readMarkdownFile({
        projectDir,
        relativePath,
      })
      const nextMarkdown = await appendChatMessageToMarkdown({
        markdown: latestMarkdown,
        date,
        time,
        content,
      })

      await saveMarkdownFile({
        projectDir,
        relativePath,
        content: nextMarkdown,
      })

      const parsed = await parseMarkdownToChat(nextMarkdown)

      draftMessage.value = ''
      exportStatus.value = `${relativePath} に追記しました`

      if (
        selectedFolder.value &&
        currentMarkdownExportPath() === projectDir &&
        selectedNotePath.value === relativePath
      ) {
        selectedMarkdownContent.value = nextMarkdown
        messages.value = parsed.messages.map((message, index) =>
          toMarkdownViewMessage(message, index, relativePath),
        )
        await scrollMessagesToBottom()
      }

      await refreshFolderNotes()
      return
    }

    await createMessage(content, {
      folderId: selectedFolderId.value,
      notePath: selectedNotePath.value,
    })
    const rows = await loadStoredMessages({
      folderId: selectedFolderId.value,
      notePath: selectedNotePath.value,
    })

    draftMessage.value = ''
    messages.value = rows.map(toViewMessage)
    await scrollMessagesToBottom()

    try {
      const result = await exportMessagesToMarkdown(rows, currentMarkdownExportPath())
      exportStatus.value = `${result.exported_count}件を書き出しました`
      await refreshFolderNotes()
    } catch (error) {
      exportStatus.value = error instanceof Error
        ? `メッセージは保存しましたが、Markdown書き出しに失敗しました: ${error.message}`
        : 'メッセージは保存しましたが、Markdown書き出しに失敗しました'
    }
  } catch (error) {
    sendMessageError.value = error instanceof Error ? error.message : 'メッセージの送信に失敗しました'
  } finally {
    isSendingMessage.value = false
  }
}

const handleSaveSettings = async () => {
  isSavingSettings.value = true
  settingsStatus.value = ''

  try {
    await saveAppTitle(settingsAppTitle.value)
    await saveMarkdownExportPath(settingsMarkdownExportPath.value)
    await refreshAppTitle()
    await refreshMarkdownExportPath()
    settingsStatus.value = '保存しました'
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : '設定の保存に失敗しました'
  } finally {
    isSavingSettings.value = false
  }
}

const handleBrowseMarkdownExportPath = async () => {
  isBrowsing.value = true
  settingsStatus.value = ''

  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      defaultPath: settingsMarkdownExportPath.value || undefined,
      title: 'Markdown保存先を選択',
    })

    if (typeof selectedPath === 'string') {
      settingsMarkdownExportPath.value = selectedPath
      await handleSaveSettings()
    }
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : '保存先の選択に失敗しました'
  } finally {
    isBrowsing.value = false
  }
}

onMounted(async () => {
  await refreshFolders()
  await refreshMessages()
  refreshAppTitle().catch((error) => {
    loadMessageError.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
  refreshMarkdownExportPath().catch((error) => {
    loadMessageError.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
})
</script>

<template>
  <div class="container">
    <div class="layout">
      <Sidebar
        :folders="folders"
        :notes="folderNotes"
        :is-loading-notes="isLoadingFolderNotes"
        :notes-error-message="loadFolderNotesError"
        :selected-folder-id="selectedFolderId"
        :selected-note-path="selectedNotePath"
        @open-create-folder="openCreateFolderModal"
        @open-folder-settings="openFolderSettingsModal"
        @select-folder="selectFolder"
        @select-note="selectNote"
        @select-folder-notes="selectAllNotesInFolder"
        @open-settings="openSettingsModal"
      />
      <main class="content">
        <div class="header">
          <Input />
        </div>
        <p v-if="exportStatus" class="export-status">{{ exportStatus }}</p>
        <div ref="messagesRef" class="messages">
          <p v-if="isLoadingMessages" class="messages-state">メッセージを読み込み中</p>
          <p v-else-if="loadMessageError" class="messages-state is-error">{{ loadMessageError }}</p>
          <p v-else-if="selectedFolder && selectedNotePath === null" class="messages-state">ファイルを選択してください</p>
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
          :disabled="isMarkdownSendDisabled"
          :error-message="sendMessageError"
          @submit="sendMessage"
        />
      </main>
    </div>
    <Modal v-model="isModalOpen" :size="modalSize">
      <template #header>
        <h2 class="modal-title">
          {{
            modalMode === 'app-settings'
              ? 'アプリ設定'
              : modalMode === 'folder-settings'
                ? 'プロジェクト設定'
                : 'プロジェクト登録'
          }}
        </h2>
      </template>
      <template #body>
        <form v-if="modalMode === 'app-settings'" class="settings-form" @submit.prevent>
          <label class="field-label" for="app-title">アプリ名</label>
          <input
            id="app-title"
            v-model="settingsAppTitle"
            class="path-input"
            type="text"
            placeholder="デイリー分報"
            @change="handleSaveSettings"
          />
          <label class="field-label" for="markdown-export-path">Markdown保存先</label>
          <div class="path-field">
            <input
              id="markdown-export-path"
              v-model="settingsMarkdownExportPath"
              class="path-input"
              type="text"
              placeholder="/Users/sintaro/Documents/MyTimes/entries"
              @change="handleSaveSettings"
            />
            <button
              type="button"
              class="secondary-button browse-button"
              :disabled="isBrowsing || isSavingSettings"
              @click="handleBrowseMarkdownExportPath"
            >
              参照
            </button>
          </div>
          <p v-if="settingsStatus" class="settings-status">{{ settingsStatus }}</p>
        </form>
        <form
          v-else-if="modalMode === 'create-project'"
          class="settings-form"
          @submit.prevent="handleCreateFolder(closeModal)"
        >
          <label class="field-label" for="project-directory-path">プロジェクトフォルダー</label>
          <div class="path-field">
            <input
              id="project-directory-path"
              v-model="projectDirectoryPath"
              class="path-input"
              type="text"
              placeholder="/Users/sintaro/Documents/MyTimes"
              readonly
            />
            <button
              type="button"
              class="secondary-button browse-button"
              @click="handleBrowseCreateProjectDirectory"
            >
              参照
            </button>
          </div>
          <label class="field-label" for="folder-name">表示名</label>
          <input
            id="folder-name"
            v-model="folderName"
            class="path-input"
            type="text"
            :placeholder="getPathBaseName(projectDirectoryPath) || 'MyTimes'"
          />
          <label class="field-label" for="create-folder-icon-path">プロジェクト画像</label>
          <div class="path-field">
            <input
              id="create-folder-icon-path"
              v-model="folderCreateIconPath"
              class="path-input"
              type="text"
              placeholder="未設定"
            />
            <button
              type="button"
              class="secondary-button browse-button"
              @click="handleBrowseCreateFolderIcon"
            >
              参照
            </button>
          </div>
          <p v-if="loadFolderError" class="settings-status is-error">{{ loadFolderError }}</p>
        </form>
        <form
          v-else-if="modalMode === 'folder-settings'"
          class="settings-form"
          @submit.prevent="handleSaveFolderSettings()"
        >
          <label class="field-label" for="rename-folder-name">表示名</label>
          <input
            id="rename-folder-name"
            v-model="renameFolderName"
            class="path-input"
            type="text"
            placeholder="表示名"
            @change="handleSaveFolderSettings()"
          />
          <label class="field-label" for="folder-icon-path">プロジェクト画像</label>
          <div class="path-field">
            <input
              id="folder-icon-path"
              v-model="folderIconPath"
              class="path-input"
              type="text"
              placeholder="未設定"
              @change="handleSaveFolderSettings()"
            />
            <button
              type="button"
              class="secondary-button browse-button"
              @click="handleBrowseFolderIcon"
            >
              参照
            </button>
          </div>
          <label class="field-label" for="folder-markdown-export-path">プロジェクトのMarkdown保存先</label>
          <div class="path-field">
            <input
              id="folder-markdown-export-path"
              v-model="folderMarkdownExportPath"
              class="path-input"
              type="text"
              placeholder="プロジェクトのパス"
              @change="handleSaveFolderSettings()"
            />
            <button
              type="button"
              class="secondary-button browse-button"
              @click="handleBrowseFolderMarkdownExportPath"
            >
              参照
            </button>
          </div>
          <p v-if="loadFolderError" class="settings-status is-error">{{ loadFolderError }}</p>
        </form>
      </template>
      <template v-if="modalMode === 'create-project'" #footer="{ close }">
        <button type="button" class="secondary-button" @click="close">キャンセル</button>
        <button type="button" class="primary-button" @click="handleCreateFolder(close)">登録</button>
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

.export-status {
  margin: -6px 0 12px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.modal-title {
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

.settings-status.is-error {
  color: var(--bg-error);
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
