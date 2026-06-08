<script setup>
import { open } from '@tauri-apps/plugin-dialog'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import { Menu } from '@tauri-apps/api/menu'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Modal from './components/Modal.vue'
import Sidebar from './components/Sidebar.vue'
import SendMessage from './components/SendMessage.vue'
import Message from './components/Message.vue'
import Input from './components/Input.vue'
import {
  appendChatMessageToMarkdown,
  createMarkdownFile,
  deleteMarkdownFile,
  listMarkdownFiles,
  parseMarkdownToChat,
  readMarkdownFile,
  renameMarkdownFile,
  saveMarkdownFile,
} from './lib/markdownFiles'
import {
  clearMarkdownMessages,
  createMessage,
  deleteFolder,
  exportMessagesToMarkdown,
  loadFolders as loadStoredFolders,
  loadFolderNotes as loadStoredFolderNotes,
  loadMarkdownExportPath,
  loadMessageReactions,
  loadMessages as loadStoredMessages,
  loadSetting,
  messageReactionKey,
  registerProject,
  saveFolderIconPath,
  saveFolderMarkdownExportPath,
  saveMarkdownExportPath,
  saveMessageReaction,
  saveProjectDisplayName,
  saveSetting,
  syncMarkdownMessages,
  updateMarkdownMessagePath,
} from './lib/messages'

const SETTINGS_KEYS = {
  themeMode: 'theme_mode',
  themeColor: 'theme_color',
  fontSize: 'font_size',
  uiDensity: 'ui_density',
  markdownDefaultView: 'markdown_default_view',
  autoSaveMarkdown: 'auto_save_markdown',
  reopenLastWorkspace: 'reopen_last_workspace',
  reopenLastNote: 'reopen_last_note',
  lastWorkspaceFolderId: 'last_workspace_folder_id',
  lastWorkspaceNotePath: 'last_workspace_note_path',
}

const DEFAULT_SETTINGS = {
  themeMode: 'system',
  themeColor: '#FF4500',
  fontSize: '16',
  uiDensity: 'comfortable',
  markdownDefaultView: 'chat',
  autoSaveMarkdown: 'false',
  reopenLastWorkspace: 'true',
  reopenLastNote: 'true',
}

const THEME_COLORS = {
  orange: {
    primary: '#FF4500',
    hover: '#E03E00',
    accentLight: '#FFF3ED',
    accentDark: '#3A2418',
  },
  blue: {
    primary: '#2563EB',
    hover: '#1D4ED8',
    accentLight: '#EFF6FF',
    accentDark: '#1E2A44',
  },
  green: {
    primary: '#059669',
    hover: '#047857',
    accentLight: '#ECFDF5',
    accentDark: '#123A2E',
  },
  rose: {
    primary: '#E11D48',
    hover: '#BE123C',
    accentLight: '#FFF1F2',
    accentDark: '#3F1724',
  },
}

const REACTION_OPTIONS = [
  { id: 'smile', emoji: '😀', label: 'いいね' },
  { id: 'heart', emoji: '❤️', label: '共感' },
  { id: 'eyes', emoji: '👀', label: '見ました' },
  { id: 'clap', emoji: '👏', label: '拍手' },
  { id: 'idea', emoji: '💡', label: 'アイデア' },
  { id: 'rocket', emoji: '🚀', label: 'よさそう' },
]

const normalizeThemeColor = (value) => {
  const normalizedValue = String(value ?? '').trim()

  if (THEME_COLORS[normalizedValue]) return THEME_COLORS[normalizedValue].primary
  if (/^#[0-9A-Fa-f]{6}$/.test(normalizedValue)) return normalizedValue.toUpperCase()

  return DEFAULT_SETTINGS.themeColor
}

const hexToRgb = (hex) => {
  const normalizedHex = normalizeThemeColor(hex).slice(1)

  return {
    red: Number.parseInt(normalizedHex.slice(0, 2), 16),
    green: Number.parseInt(normalizedHex.slice(2, 4), 16),
    blue: Number.parseInt(normalizedHex.slice(4, 6), 16),
  }
}

const mixColor = (hex, targetHex, weight) => {
  const source = hexToRgb(hex)
  const target = hexToRgb(targetHex)
  const mixChannel = (sourceValue, targetValue) =>
    Math.round(sourceValue * (1 - weight) + targetValue * weight)
      .toString(16)
      .padStart(2, '0')

  return `#${mixChannel(source.red, target.red)}${mixChannel(source.green, target.green)}${mixChannel(source.blue, target.blue)}`.toUpperCase()
}

const themeColorTokens = (value) => {
  const primary = normalizeThemeColor(value)

  return {
    primary,
    hover: mixColor(primary, '#000000', 0.12),
    accentLight: mixColor(primary, '#FFFFFF', 0.9),
    accentDark: mixColor(primary, '#000000', 0.72),
  }
}

const SETTINGS_CATEGORIES = [
  { id: 'appearance', label: '外観' },
  { id: 'editor', label: 'エディタ' },
  { id: 'files', label: 'ファイル' },
]

const isModalOpen = ref(false)
const modalMode = ref('app-settings')
const viewMode = ref('chat')
const messages = ref([])
const draftMessage = ref('')
const markdownDraft = ref('')
const messagesRef = ref(null)
const folders = ref([])
const folderNotes = ref([])
const selectedFolderId = ref(null)
const selectedNotePath = ref(null)
const folderContextMenuTarget = ref(null)
const isLoadingMessages = ref(true)
const isLoadingFolders = ref(true)
const isLoadingFolderNotes = ref(false)
const isSendingMessage = ref(false)
const isSavingMarkdown = ref(false)
const isReloadingMarkdown = ref(false)
const isSavingNote = ref(false)
const isSavingSettings = ref(false)
const loadMessageError = ref('')
const loadFolderError = ref('')
const loadFolderNotesError = ref('')
const sendMessageError = ref('')
const markdownEditorError = ref('')
const exportStatus = ref('')
const selectedMarkdownContent = ref('')
const selectedMarkdownSignature = ref('')
const isSelectedNoteDbFallback = ref(false)
const refreshMessagesRequestId = ref(0)
const markdownExportPath = ref('')
const settingsThemeMode = ref(DEFAULT_SETTINGS.themeMode)
const settingsThemeColor = ref(DEFAULT_SETTINGS.themeColor)
const settingsFontSize = ref(DEFAULT_SETTINGS.fontSize)
const settingsUiDensity = ref(DEFAULT_SETTINGS.uiDensity)
const settingsMarkdownDefaultView = ref(DEFAULT_SETTINGS.markdownDefaultView)
const settingsAutoSaveMarkdown = ref(DEFAULT_SETTINGS.autoSaveMarkdown)
const settingsReopenLastWorkspace = ref(DEFAULT_SETTINGS.reopenLastWorkspace)
const settingsReopenLastNote = ref(DEFAULT_SETTINGS.reopenLastNote)
const activeSettingsCategory = ref(SETTINGS_CATEGORIES[0].id)
const folderName = ref('')
const folderCreateIconPath = ref('')
const projectDirectoryPath = ref('')
const renameFolderName = ref('')
const folderIconPath = ref('')
const folderMarkdownExportPath = ref('')
const settingsStatus = ref('')
const notePathInput = ref('')
const noteActionError = ref('')
let saveSettingsRequestId = 0
let autoSaveMarkdownTimer = null
let shouldRescheduleAutoSaveMarkdown = false

const clearAutoSaveMarkdownTimer = () => {
  window.clearTimeout(autoSaveMarkdownTimer)
  autoSaveMarkdownTimer = null
}

const selectedFolder = computed(() => {
  if (selectedFolderId.value === null) return null

  return folders.value.find((folder) => folder.id === selectedFolderId.value) ?? null
})

const isMarkdownSendDisabled = computed(() =>
  isSavingNote.value ||
  isSelectedNoteDbFallback.value ||
  !selectedFolder.value,
)

const canUseMarkdownModes = computed(() =>
  Boolean(
    selectedFolder.value &&
    selectedNotePath.value &&
    !isSelectedNoteDbFallback.value &&
    !isLoadingMessages.value &&
    !loadMessageError.value,
  ),
)

const isMarkdownDirty = computed(() => markdownDraft.value !== selectedMarkdownContent.value)

const isReloadMarkdownDisabled = computed(() =>
  !selectedFolder.value ||
  !selectedNotePath.value ||
  isSelectedNoteDbFallback.value ||
  isLoadingMessages.value ||
  isSendingMessage.value ||
  isSavingMarkdown.value ||
  isReloadingMarkdown.value ||
  isSavingNote.value,
)

const modalSize = computed(() =>
  modalMode.value === 'app-settings' || modalMode.value === 'folder-settings' ? 'wide' : 'default',
)

const isAutoSaveMarkdownEnabled = computed(() => settingsAutoSaveMarkdown.value === 'true')

const appSettingsPayload = () => ({
  themeMode: settingsThemeMode.value,
  themeColor: normalizeThemeColor(settingsThemeColor.value),
  fontSize: settingsFontSize.value,
  uiDensity: settingsUiDensity.value,
  markdownDefaultView: settingsMarkdownDefaultView.value,
  autoSaveMarkdown: settingsAutoSaveMarkdown.value,
  reopenLastWorkspace: settingsReopenLastWorkspace.value,
  reopenLastNote: settingsReopenLastNote.value,
})

const appSettingValue = (settingName) => appSettingsPayload()[settingName]

const applyAppearanceSettings = () => {
  const root = document.documentElement
  const themeColor = themeColorTokens(settingsThemeColor.value)
  const fontSize = Number(settingsFontSize.value)

  if (settingsThemeMode.value === 'system') {
    delete root.dataset.theme
  } else {
    root.dataset.theme = settingsThemeMode.value
  }
  root.dataset.density = settingsUiDensity.value
  root.style.setProperty('--bg-primary', themeColor.primary)
  root.style.setProperty('--bg-primary-hover', themeColor.hover)
  root.style.setProperty('--surface-accent-light', themeColor.accentLight)
  root.style.setProperty('--surface-accent-dark', themeColor.accentDark)
  root.style.setProperty('--font-size', `${Number.isFinite(fontSize) ? fontSize : 16}px`)
}

const loadAppSettings = async () => {
  settingsThemeMode.value = await loadSetting(SETTINGS_KEYS.themeMode, DEFAULT_SETTINGS.themeMode)
  settingsThemeColor.value = normalizeThemeColor(
    await loadSetting(SETTINGS_KEYS.themeColor, DEFAULT_SETTINGS.themeColor),
  )
  settingsFontSize.value = await loadSetting(SETTINGS_KEYS.fontSize, DEFAULT_SETTINGS.fontSize)
  settingsUiDensity.value = await loadSetting(SETTINGS_KEYS.uiDensity, DEFAULT_SETTINGS.uiDensity)
  settingsMarkdownDefaultView.value = await loadSetting(
    SETTINGS_KEYS.markdownDefaultView,
    DEFAULT_SETTINGS.markdownDefaultView,
  )
  settingsAutoSaveMarkdown.value = await loadSetting(
    SETTINGS_KEYS.autoSaveMarkdown,
    DEFAULT_SETTINGS.autoSaveMarkdown,
  )
  settingsReopenLastWorkspace.value = await loadSetting(
    SETTINGS_KEYS.reopenLastWorkspace,
    DEFAULT_SETTINGS.reopenLastWorkspace,
  )
  settingsReopenLastNote.value = await loadSetting(
    SETTINGS_KEYS.reopenLastNote,
    DEFAULT_SETTINGS.reopenLastNote,
  )
  applyAppearanceSettings()
}

const openSettingsModal = () => {
  modalMode.value = 'app-settings'
  activeSettingsCategory.value = SETTINGS_CATEGORIES[0].id
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

  applyFolderSettingsForm(selectedFolder.value)
  isModalOpen.value = true
}

const applyFolderSettingsForm = (folder) => {
  modalMode.value = 'folder-settings'
  renameFolderName.value = folder.name
  folderIconPath.value = folder.iconPath ?? ''
  folderMarkdownExportPath.value = folder.markdownExportPath ?? folder.path
  loadFolderError.value = ''
}

const openCreateNoteModal = () => {
  if (!selectedFolder.value) return

  modalMode.value = 'create-note'
  notePathInput.value = ''
  noteActionError.value = ''
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

const formatLocalDate = (date) => {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
}

const scrollMessagesToBottom = async () => {
  await nextTick()

  if (!messagesRef.value) return

  messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

const normalizePathSeparators = (path) => path.trim().replaceAll('\\', '/')

const isAbsolutePathText = (path) => path.startsWith('/') || /^[A-Za-z]:\//.test(path)

const relativeNotePathFromProject = (notePath, projectDir) => {
  const normalizedNotePath = normalizePathSeparators(notePath)

  if (!normalizedNotePath) return ''

  if (!isAbsolutePathText(normalizedNotePath)) {
    return normalizedNotePath.replace(/^\/+/, '')
  }

  const normalizedProjectDir = normalizePathSeparators(projectDir).replace(/\/+$/, '')
  const normalizedProjectDirForCompare = normalizedProjectDir.toLowerCase()
  const normalizedNotePathForCompare = normalizedNotePath.toLowerCase()

  if (
    !normalizedProjectDir ||
    !normalizedNotePathForCompare.startsWith(`${normalizedProjectDirForCompare}/`)
  ) {
    return ''
  }

  return normalizedNotePath.slice(normalizedProjectDir.length + 1)
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
    if (!selectedFolder.value) {
      folderNotes.value = []
      return
    }

    const folderId = selectedFolder.value.id
    const projectDir = currentMarkdownExportPath().trim()
    const storedNotes = await loadStoredFolderNotes({ folderId })
    const fileNotes = projectDir ? await listMarkdownFiles(projectDir) : []
    const mergedNotes = new Map()

    for (const note of storedNotes) {
      const relativePath = relativeNotePathFromProject(note.path, projectDir)

      if (relativePath) {
        if (relativePath !== note.path) {
          await updateMarkdownMessagePath({
            folderId,
            currentNotePath: note.path,
            nextNotePath: relativePath,
          })
        }

        mergedNotes.set(relativePath, { ...note, path: relativePath })
      }
    }

    for (const note of fileNotes) {
      mergedNotes.set(note.path, note)
    }

    if (
      !selectedFolder.value ||
      selectedFolder.value.id !== folderId ||
      currentMarkdownExportPath().trim() !== projectDir
    ) {
      return
    }

    folderNotes.value = [...mergedNotes.values()].sort((left, right) => left.path.localeCompare(right.path))
    loadFolderError.value = ''
  } catch (error) {
    loadFolderNotesError.value = error instanceof Error ? error.message : 'ファイル一覧の読み込みに失敗しました'
  } finally {
    isLoadingFolderNotes.value = false
  }
}

const confirmDiscardMarkdownChanges = () => {
  if (!isMarkdownDirty.value) return true

  const shouldDiscard = window.confirm('保存していないMarkdownの変更があります。変更を破棄して続行しますか？')
  if (shouldDiscard) {
    clearAutoSaveMarkdownTimer()
  }

  return shouldDiscard
}

const createViewMessage = ({
  id,
  folderId = selectedFolderId.value,
  notePath = selectedNotePath.value,
  createdAt,
  date,
  content,
  reactions = [],
}) => {
  const messageKey = messageReactionKey({
    folderId,
    notePath,
    createdAt,
    content,
  })

  return {
    id,
    folderId,
    notePath,
    messageKey,
    createdAt,
    name: '自分',
    date,
    message: content,
    reactions,
  }
}

const withStoredReactions = async (viewMessages) => {
  const reactionGroups = await loadMessageReactions(viewMessages.map((message) => message.messageKey))

  return viewMessages.map((message) => ({
    ...message,
    reactions: reactionGroups.get(message.messageKey) ?? [],
  }))
}

const toggleMessageReaction = async (message, reactionType) => {
  if (!REACTION_OPTIONS.some((reaction) => reaction.id === reactionType)) return

  const reactions = new Set(message.reactions)
  const selected = !reactions.has(reactionType)

  if (selected) {
    reactions.add(reactionType)
  } else {
    reactions.delete(reactionType)
  }

  messages.value = messages.value.map((currentMessage) =>
    currentMessage.messageKey === message.messageKey
      ? { ...currentMessage, reactions: [...reactions] }
      : currentMessage,
  )

  try {
    await saveMessageReaction({
      messageKey: message.messageKey,
      folderId: message.folderId,
      notePath: message.notePath,
      reactionType,
      selected,
    })
  } catch (error) {
    messages.value = messages.value.map((currentMessage) =>
      currentMessage.messageKey === message.messageKey
        ? { ...currentMessage, reactions: message.reactions }
        : currentMessage,
    )
    sendMessageError.value = error instanceof Error
      ? `リアクションの保存に失敗しました: ${error.message}`
      : 'リアクションの保存に失敗しました'
  }
}

const toViewMessage = (row) => createViewMessage({
  id: row.id,
  folderId: row.folder_id ?? selectedFolderId.value,
  notePath: row.note_path ?? selectedNotePath.value,
  createdAt: row.created_at,
  date: formatMessageDate(row.created_at),
  content: row.content,
})

const toMarkdownViewMessage = (message, index, notePath = selectedNotePath.value) => {
  const createdAt = formatParsedMessageTimestamp(message, index)

  return createViewMessage({
    id: `${notePath ?? 'markdown'}:${message.sortOrder ?? index}`,
    folderId: selectedFolder.value?.id ?? selectedFolderId.value,
    notePath,
    createdAt,
    date: [message.date, message.time].filter(Boolean).join(' '),
    content: message.content,
  })
}

const markdownSignature = (markdown) => {
  let hash = 0x811c9dc5

  for (let index = 0; index < markdown.length; index += 1) {
    hash ^= markdown.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash.toString(16)
}

const formatParsedMessageTimestamp = (message, index) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(message.date ?? '')
    ? message.date
    : formatLocalDate(new Date())
  const time = /^\d{2}:\d{2}$/.test(message.time ?? '') ? message.time : '00:00'
  const seconds = String(index % 60).padStart(2, '0')

  return `${date}T${time}:${seconds}`
}

const syncParsedMarkdownMessages = async ({ folderId, notePath, parsed }) => {
  await syncMarkdownMessages({
    folderId,
    notePath,
    messages: parsed.messages,
  })
}

const clearSelectedMarkdownMessages = async () => {
  if (!selectedFolder.value || !selectedNotePath.value) return

  await clearMarkdownMessages({
    folderId: selectedFolder.value.id,
    notePath: selectedNotePath.value,
  })
}

const applyMarkdownDocument = async ({ markdown, parsed, relativePath, syncCache = true }) => {
  selectedMarkdownContent.value = markdown
  markdownDraft.value = markdown
  selectedMarkdownSignature.value = markdownSignature(markdown)
  messages.value = await withStoredReactions(parsed.messages.map((message, index) =>
    toMarkdownViewMessage(message, index, relativePath),
  ))

  if (syncCache && selectedFolder.value) {
    await syncParsedMarkdownMessages({
      folderId: selectedFolder.value.id,
      notePath: relativePath,
      parsed,
    })
  }
}

const refreshMessages = async () => {
  const requestId = refreshMessagesRequestId.value + 1
  refreshMessagesRequestId.value = requestId
  isLoadingMessages.value = true
  loadMessageError.value = ''

  try {
    if (selectedFolder.value && selectedNotePath.value) {
      const folderId = selectedFolder.value.id
      const projectDir = currentMarkdownExportPath()
      const relativePath = selectedNotePath.value

      selectedMarkdownContent.value = ''
      markdownDraft.value = ''
      selectedMarkdownSignature.value = ''
      isSelectedNoteDbFallback.value = false
      viewMode.value = settingsMarkdownDefaultView.value

      let markdown = ''
      let parsed = null

      try {
        markdown = await readMarkdownFile({
          projectDir,
          relativePath,
        })
        parsed = await parseMarkdownToChat(markdown)
      } catch (error) {
        const rows = await loadStoredMessages({ folderId, notePath: relativePath })

        if (rows.length === 0) {
          throw error
        }

        if (
          requestId !== refreshMessagesRequestId.value ||
          !selectedFolder.value ||
          selectedFolder.value.id !== folderId ||
          currentMarkdownExportPath() !== projectDir ||
          selectedNotePath.value !== relativePath
        ) {
          return
        }

        messages.value = await withStoredReactions(rows.map(toViewMessage))
        isSelectedNoteDbFallback.value = true
        viewMode.value = 'chat'
        await scrollMessagesToBottom()
        if (requestId !== refreshMessagesRequestId.value) return

        await refreshFolderNotes()
        return
      }

      if (
        requestId !== refreshMessagesRequestId.value ||
        !selectedFolder.value ||
        selectedFolder.value.id !== folderId ||
        currentMarkdownExportPath() !== projectDir ||
        selectedNotePath.value !== relativePath
      ) {
        return
      }

      await applyMarkdownDocument({ markdown, parsed, relativePath })
      isSelectedNoteDbFallback.value = false

      await scrollMessagesToBottom()
      if (requestId !== refreshMessagesRequestId.value) return

      await refreshFolderNotes()
      return
    }

    selectedMarkdownContent.value = ''
    markdownDraft.value = ''
    selectedMarkdownSignature.value = ''
    isSelectedNoteDbFallback.value = false
    viewMode.value = 'chat'

    const rows = await loadStoredMessages({
      folderId: selectedFolderId.value,
      notePath: selectedNotePath.value,
    })

    if (requestId !== refreshMessagesRequestId.value) return

    messages.value = await withStoredReactions(rows.map(toViewMessage))

    await scrollMessagesToBottom()
    if (requestId !== refreshMessagesRequestId.value) return

    await refreshFolderNotes()
  } catch (error) {
    if (requestId !== refreshMessagesRequestId.value) return

    selectedMarkdownContent.value = ''
    markdownDraft.value = ''
    selectedMarkdownSignature.value = ''
    isSelectedNoteDbFallback.value = false
    viewMode.value = 'chat'
    loadMessageError.value = error instanceof Error ? error.message : 'Markdownファイルの読み込みに失敗しました'
    await clearSelectedMarkdownMessages()
  } finally {
    if (requestId === refreshMessagesRequestId.value) {
      isLoadingMessages.value = false
    }
  }
}

const switchViewMode = (mode) => {
  if (mode === viewMode.value) return

  if (mode !== 'markdown') {
    clearAutoSaveMarkdownTimer()
  }

  viewMode.value = mode
  markdownEditorError.value = ''
}

const reloadSelectedMarkdown = async () => {
  if (isReloadMarkdownDisabled.value) return
  if (!confirmDiscardMarkdownChanges()) return

  const projectDir = currentMarkdownExportPath()
  const relativePath = selectedNotePath.value

  isReloadingMarkdown.value = true
  loadMessageError.value = ''
  markdownEditorError.value = ''
  exportStatus.value = ''

  try {
    const markdown = await readMarkdownFile({
      projectDir,
      relativePath,
    })
    const parsed = await parseMarkdownToChat(markdown)
    const previousSignature = selectedMarkdownSignature.value
    const nextSignature = markdownSignature(markdown)

    if (
      !selectedFolder.value ||
      currentMarkdownExportPath() !== projectDir ||
      selectedNotePath.value !== relativePath
    ) {
      return
    }

    await applyMarkdownDocument({ markdown, parsed, relativePath })
    exportStatus.value = nextSignature === previousSignature
      ? `${relativePath} は最新です`
      : `${relativePath} を再読み込みしました`
    await scrollMessagesToBottom()
    await refreshFolderNotes()
  } catch (error) {
    if (
      !selectedFolder.value ||
      currentMarkdownExportPath() !== projectDir ||
      selectedNotePath.value !== relativePath
    ) {
      return
    }

    selectedMarkdownContent.value = ''
    markdownDraft.value = ''
    selectedMarkdownSignature.value = ''
    messages.value = []
    viewMode.value = 'chat'
    loadMessageError.value = error instanceof Error ? error.message : 'Markdownファイルの再読み込みに失敗しました'
    await clearSelectedMarkdownMessages()
    await refreshFolderNotes()
  } finally {
    isReloadingMarkdown.value = false
  }
}

const getPathBaseName = (path) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

const normalizeMarkdownNotePath = (value) => {
  const normalized = value.trim().replaceAll('\\', '/').replace(/^\/+/, '')

  if (!normalized) return ''
  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`
}

const dailyNotePath = (date) => `${date}.md`

const handleCreateFolder = async (close) => {
  const directoryPath = projectDirectoryPath.value.trim()

  if (!directoryPath) return
  if (!confirmDiscardMarkdownChanges()) return

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
    await saveLastWorkspaceSelection()
    await refreshMessages()

    folderName.value = ''
    folderCreateIconPath.value = ''
    projectDirectoryPath.value = ''
    close()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトの登録に失敗しました'
  }
}

const handleCreateNote = async (close) => {
  if (!selectedFolder.value || isSavingNote.value) return

  const relativePath = normalizeMarkdownNotePath(notePathInput.value)

  if (!relativePath) return
  if (!confirmDiscardMarkdownChanges()) return

  const folderId = selectedFolder.value.id
  const projectDir = currentMarkdownExportPath()
  isSavingNote.value = true
  noteActionError.value = ''

  try {
    const file = await createMarkdownFile({
      projectDir,
      relativePath,
      content: '',
    })

    const selectionStillSame = Boolean(
      selectedFolder.value &&
      selectedFolder.value.id === folderId &&
      currentMarkdownExportPath() === projectDir,
    )

    if (!selectionStillSame) {
      notePathInput.value = ''
      close?.()
      return
    }

    selectedNotePath.value = file.path
    await saveLastWorkspaceSelection({ folderId, notePath: file.path })
    await refreshFolderNotes()
    await refreshMessages()
    viewMode.value = 'chat'
    notePathInput.value = ''
    close()
  } catch (error) {
    noteActionError.value = error instanceof Error ? error.message : 'ノートの作成に失敗しました'
  } finally {
    isSavingNote.value = false
  }
}

const handleRenameNoteInline = async ({ currentRelativePath, nextRelativePath }) => {
  await renameNotePath({
    currentRelativePath,
    nextRelativePath,
    setError: (message) => {
      loadFolderNotesError.value = message
    },
  })
}

const renameNotePath = async ({
  currentRelativePath,
  nextRelativePath,
  close = null,
  setError = null,
}) => {
  if (!selectedFolder.value || !currentRelativePath || isSavingNote.value) return false

  const normalizedNextRelativePath = normalizeMarkdownNotePath(nextRelativePath)

  if (!normalizedNextRelativePath || normalizedNextRelativePath === currentRelativePath) {
    close?.()
    return true
  }

  if (!confirmDiscardMarkdownChanges()) return false

  const folderId = selectedFolder.value.id
  const projectDir = currentMarkdownExportPath()
  const wasSelectedNote = selectedNotePath.value === currentRelativePath
  isSavingNote.value = true
  noteActionError.value = ''
  loadFolderNotesError.value = ''

  try {
    const file = await renameMarkdownFile({
      projectDir,
      currentRelativePath,
      nextRelativePath: normalizedNextRelativePath,
    })

    await updateMarkdownMessagePath({
      folderId,
      currentNotePath: currentRelativePath,
      nextNotePath: file.path,
    })

    const selectionStillSame = Boolean(
      selectedFolder.value &&
      selectedFolder.value.id === folderId &&
      currentMarkdownExportPath() === projectDir,
    )

    if (!selectionStillSame) {
      close?.()
      return true
    }

    if (wasSelectedNote && selectedNotePath.value === currentRelativePath) {
      selectedNotePath.value = file.path
      await saveLastWorkspaceSelection({ folderId, notePath: file.path })
    }

    await refreshFolderNotes()
    await refreshMessages()
    notePathInput.value = ''
    close?.()
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ノート名の変更に失敗しました'
    setError?.(message)
    return false
  } finally {
    isSavingNote.value = false
  }
}

const handleDeleteNote = async (notePath) => {
  if (!selectedFolder.value || !notePath || isSavingNote.value) return
  if (!confirmDiscardMarkdownChanges()) return
  if (!window.confirm(`${notePath} を削除しますか？この操作は元に戻せません。`)) return

  const folderId = selectedFolder.value.id
  const projectDir = currentMarkdownExportPath()
  const wasSelectedNote = selectedNotePath.value === notePath
  isSavingNote.value = true
  loadFolderNotesError.value = ''
  loadMessageError.value = ''

  try {
    await deleteMarkdownFile({
      projectDir: currentMarkdownExportPath(),
      relativePath: notePath,
    })
    await clearMarkdownMessages({
      folderId,
      notePath,
    })

    const selectionStillSame = Boolean(
      selectedFolder.value &&
      selectedFolder.value.id === folderId &&
      currentMarkdownExportPath() === projectDir,
    )

    if (!selectionStillSame) return

    if (wasSelectedNote && selectedNotePath.value === notePath) {
      selectedNotePath.value = null
      viewMode.value = 'chat'
      await saveLastWorkspaceSelection({ folderId, notePath: null })
    }

    await refreshFolderNotes()
    await refreshMessages()
  } catch (error) {
    loadFolderNotesError.value = error instanceof Error ? error.message : 'ノートの削除に失敗しました'
  } finally {
    isSavingNote.value = false
  }
}

const handleSaveFolderSettings = async (close = null) => {
  const name = renameFolderName.value.trim()

  if (!name || !selectedFolder.value) return
  if (!confirmDiscardMarkdownChanges()) return

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

const prepareFolderContextAction = async (folder) => {
  if (!folder) return false

  if (folder.id !== selectedFolderId.value || selectedNotePath.value !== null) {
    if (!confirmDiscardMarkdownChanges()) return false

    selectedFolderId.value = folder.id
    selectedNotePath.value = null
    viewMode.value = 'chat'
    await refreshMessages()
  }

  const latestFolder = selectedFolder.value?.id === folder.id ? selectedFolder.value : folder
  applyFolderSettingsForm(latestFolder)
  return true
}

const openFolderSettingsModalFromMenu = async (folder) => {
  if (!(await prepareFolderContextAction(folder))) return

  isModalOpen.value = true
}

const browseFolderPathFromMenu = async (folder) => {
  if (!(await prepareFolderContextAction(folder))) return

  await handleBrowseFolderMarkdownExportPath()
}

const browseFolderIconFromMenu = async (folder) => {
  if (!(await prepareFolderContextAction(folder))) return

  await handleBrowseFolderIcon()
}

const deleteFolderFromMenu = async (folder) => {
  if (!folder) return
  if (!confirmDiscardMarkdownChanges()) return
  if (
    !window.confirm(
      `${folder.name} のプロジェクト登録と履歴を削除しますか？\nファイルやフォルダーは削除されません。`,
    )
  ) {
    return
  }

  loadFolderError.value = ''
  loadFolderNotesError.value = ''
  loadMessageError.value = ''

  try {
    const deletedFolderIds = await deleteFolder(folder.id)

    if (deletedFolderIds.includes(selectedFolderId.value)) {
      selectedFolderId.value = null
      selectedNotePath.value = null
      viewMode.value = 'chat'
    }

    await refreshFolders()
    await refreshFolderNotes()
    await refreshMessages()
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました'
  }
}

const handleFolderContextMenuAction = async (action, folder) => {
  if (action === 'folder-rename') {
    await openFolderSettingsModalFromMenu(folder)
    await nextTick()
    document.getElementById('rename-folder-name')?.focus()
    document.getElementById('rename-folder-name')?.select()
    return
  }

  if (action === 'folder-path') {
    await browseFolderPathFromMenu(folder)
    return
  }

  if (action === 'folder-image') {
    await browseFolderIconFromMenu(folder)
    return
  }

  if (action === 'folder-delete') {
    await deleteFolderFromMenu(folder)
  }
}

let folderContextMenuPromise = null

const getFolderContextMenu = () => {
  if (!folderContextMenuPromise) {
    folderContextMenuPromise = Menu.new({
      items: [
        {
          id: 'folder-rename',
          text: '名前を変更',
          action: (id) => {
            void handleFolderContextMenuAction(id, folderContextMenuTarget.value)
          },
        },
        {
          id: 'folder-path',
          text: 'パスを変更',
          action: (id) => {
            void handleFolderContextMenuAction(id, folderContextMenuTarget.value)
          },
        },
        {
          id: 'folder-image',
          text: '画像を変更',
          action: (id) => {
            void handleFolderContextMenuAction(id, folderContextMenuTarget.value)
          },
        },
        {
          id: 'folder-delete',
          text: '削除',
          action: (id) => {
            void handleFolderContextMenuAction(id, folderContextMenuTarget.value)
          },
        },
      ],
    }).catch((error) => {
      folderContextMenuPromise = null
      throw error
    })
  }

  return folderContextMenuPromise
}

const openFolderContextMenu = async ({ folder, position }) => {
  try {
    folderContextMenuTarget.value = folder
    const menu = await getFolderContextMenu()
    await menu.popup(new LogicalPosition(position.x, position.y))
  } catch (error) {
    loadFolderError.value = error instanceof Error ? error.message : 'プロジェクトメニューの表示に失敗しました'
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

const handleSaveRootMarkdownExportPath = async () => {
  if (!confirmDiscardMarkdownChanges()) {
    await refreshMarkdownExportPath()
    return
  }

  isSavingSettings.value = true
  settingsStatus.value = ''

  try {
    await saveMarkdownExportPath(markdownExportPath.value)
    await refreshMarkdownExportPath()
    await refreshFolderNotes()
    await refreshMessages()
    settingsStatus.value = '保存しました'
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : 'Markdown保存先の保存に失敗しました'
  } finally {
    isSavingSettings.value = false
  }
}

const handleBrowseRootMarkdownExportPath = async () => {
  settingsStatus.value = ''

  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      defaultPath: markdownExportPath.value || undefined,
      title: 'ルート用Markdown保存先を選択',
    })

    if (typeof selectedPath !== 'string') return

    markdownExportPath.value = selectedPath
    await handleSaveRootMarkdownExportPath()
  } catch (error) {
    settingsStatus.value = error instanceof Error ? error.message : 'Markdown保存先の選択に失敗しました'
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
  if (folderId === selectedFolderId.value && selectedNotePath.value === null) return
  if (!confirmDiscardMarkdownChanges()) return

  selectedFolderId.value = folderId
  selectedNotePath.value = null
  viewMode.value = 'chat'
  await saveLastWorkspaceSelection({ folderId, notePath: null })
  await refreshMessages()
}

const selectNote = async (notePath) => {
  if (notePath === selectedNotePath.value) return
  if (!confirmDiscardMarkdownChanges()) return

  selectedNotePath.value = notePath
  viewMode.value = settingsMarkdownDefaultView.value
  await saveLastWorkspaceSelection({ folderId: selectedFolderId.value, notePath })
  await refreshMessages()
}

const selectAllNotesInFolder = async () => {
  if (selectedNotePath.value === null) return
  if (!confirmDiscardMarkdownChanges()) return

  selectedNotePath.value = null
  viewMode.value = 'chat'
  await saveLastWorkspaceSelection({ notePath: null })
  await refreshMessages()
}

const refreshMarkdownExportPath = async () => {
  markdownExportPath.value = await loadMarkdownExportPath()
}

const isAbsolutePath = (path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)

const currentMarkdownExportPath = () => {
  const basePath = markdownExportPath.value.trim()

  if (!selectedFolder.value) return basePath

  const folderPath = selectedFolder.value.markdownExportPath?.trim() || selectedFolder.value.path

  if (!folderPath) return basePath

  if (isAbsolutePath(folderPath) || !basePath) {
    return folderPath
  }

  return `${basePath.replace(/[\\/]+$/, '')}/${folderPath.replace(/^[\\/]+/, '')}`
}

const saveLastWorkspaceSelection = async ({
  folderId = selectedFolderId.value,
  notePath = selectedNotePath.value,
} = {}) => {
  if (folderId === null) return

  await saveSetting(SETTINGS_KEYS.lastWorkspaceFolderId, folderId)
  await saveSetting(SETTINGS_KEYS.lastWorkspaceNotePath, notePath ?? '')
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

const messageDateTimeParts = (value) => {
  const normalized = String(value ?? '').replace('T', ' ')
  const date = normalized.slice(0, 10)
  const time = normalized.slice(11, 16)

  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
    return { date, time }
  }

  return currentLocalDateParts()
}

const appendPendingTimelineMessagesToMarkdown = async ({ markdown, folderId, relativePath }) => {
  const rows = await loadStoredMessages({ folderId, notePath: relativePath })
  const pendingRows = rows.filter((row) =>
    !Number(row.markdown_synced) &&
    (row.note_path === null || row.note_path === undefined),
  )
  let nextMarkdown = markdown

  for (const row of pendingRows) {
    const { date, time } = messageDateTimeParts(row.created_at)

    nextMarkdown = await appendChatMessageToMarkdown({
      markdown: nextMarkdown,
      date,
      time,
      content: row.content,
    })
  }

  return {
    markdown: nextMarkdown,
    count: pendingRows.length,
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
      sendMessageError.value = 'プロジェクトを選択してから送信してください'
      return
    }

    if (selectedFolder.value && !isSelectedNoteDbFallback.value) {
      const folderId = selectedFolder.value.id
      const projectDir = currentMarkdownExportPath()
      const { date, time } = currentLocalDateParts()
      const isTimelinePost = selectedNotePath.value === null
      const relativePath = selectedNotePath.value ?? dailyNotePath(date)
      const draftBeforeSend = markdownDraft.value
      const savedMarkdownBeforeSend = selectedMarkdownContent.value
      let latestMarkdown = ''
      let didCreateDailyNote = false
      let pendingTimelineMessageCount = 0

      try {
        latestMarkdown = await readMarkdownFile({
          projectDir,
          relativePath,
        })
      } catch (error) {
        if (!isTimelinePost) throw error

        try {
          await createMarkdownFile({
            projectDir,
            relativePath,
            content: '',
          })
          latestMarkdown = ''
          didCreateDailyNote = true
        } catch (createError) {
          try {
            latestMarkdown = await readMarkdownFile({
              projectDir,
              relativePath,
            })
          } catch {
            throw createError
          }
        }
      }

      if (isTimelinePost) {
        const pendingTimelineMessages = await appendPendingTimelineMessagesToMarkdown({
          markdown: latestMarkdown,
          folderId,
          relativePath,
        })

        latestMarkdown = pendingTimelineMessages.markdown
        pendingTimelineMessageCount = pendingTimelineMessages.count
      }

      const isDraftDirtyAtSend = draftBeforeSend !== savedMarkdownBeforeSend
      const latestMarkdownSignature = markdownSignature(latestMarkdown)

      if (
        !isTimelinePost &&
        isDraftDirtyAtSend &&
        latestMarkdownSignature !== selectedMarkdownSignature.value
      ) {
        sendMessageError.value = '外部でMarkdownが変更されています。再読み込みしてから送信してください'
        return
      }

      const nextMarkdown = await appendChatMessageToMarkdown({
        markdown: latestMarkdown,
        date,
        time,
        content,
      })
      const nextMarkdownDraft = isTimelinePost || draftBeforeSend === savedMarkdownBeforeSend
        ? null
        : await appendChatMessageToMarkdown({
          markdown: draftBeforeSend,
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
      exportStatus.value = didCreateDailyNote
        ? `${relativePath} を作成して追記しました`
        : pendingTimelineMessageCount > 0
          ? `${relativePath} に未同期の投稿${pendingTimelineMessageCount}件と新規投稿を追記しました`
          : `${relativePath} に追記しました`

      if (
        selectedFolder.value &&
        currentMarkdownExportPath() === projectDir &&
        selectedNotePath.value === relativePath
      ) {
        selectedMarkdownContent.value = nextMarkdown
        selectedMarkdownSignature.value = markdownSignature(nextMarkdown)
        if (markdownDraft.value === draftBeforeSend) {
          markdownDraft.value = nextMarkdownDraft ?? nextMarkdown
        }
        messages.value = await withStoredReactions(parsed.messages.map((message, index) =>
          toMarkdownViewMessage(message, index, relativePath),
        ))
        await scrollMessagesToBottom()
      }

      let syncErrorMessage = ''

      try {
        await syncParsedMarkdownMessages({
          folderId,
          notePath: relativePath,
          parsed,
        })
      } catch (error) {
        syncErrorMessage = error instanceof Error ? error.message : 'DBキャッシュ同期に失敗しました'
        sendMessageError.value = `Markdownには保存しましたが、表示キャッシュの同期に失敗しました: ${syncErrorMessage}`
      }

      await refreshFolderNotes()
      if (
        !syncErrorMessage &&
        selectedFolder.value &&
        currentMarkdownExportPath() === projectDir &&
        isTimelinePost &&
        selectedNotePath.value === null
      ) {
        await refreshMessages()
      }
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
    messages.value = await withStoredReactions(rows.map(toViewMessage))
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

const saveMarkdownDraft = async (expectedTarget = null) => {
  if (
    !selectedFolder.value ||
    !selectedNotePath.value ||
    isSelectedNoteDbFallback.value ||
    isSendingMessage.value ||
    isSavingNote.value
  ) {
    return
  }

  if (isSavingMarkdown.value) {
    shouldRescheduleAutoSaveMarkdown = true
    return
  }

  const projectDir = currentMarkdownExportPath()
  const relativePath = selectedNotePath.value
  const draftToSave = markdownDraft.value
  const currentFolderId = selectedFolder.value.id

  if (
    expectedTarget &&
    (
      expectedTarget.folderId !== currentFolderId ||
      expectedTarget.projectDir !== projectDir ||
      expectedTarget.relativePath !== relativePath ||
      expectedTarget.markdownSignature !== selectedMarkdownSignature.value
    )
  ) {
    return
  }

  isSavingMarkdown.value = true
  markdownEditorError.value = ''
  exportStatus.value = ''

  try {
    const latestMarkdown = await readMarkdownFile({
      projectDir,
      relativePath,
    })

    if (
      markdownSignature(latestMarkdown) !== selectedMarkdownSignature.value &&
      !window.confirm('外部でMarkdownが変更されています。現在の編集内容で上書きしますか？')
    ) {
      return
    }

    await saveMarkdownFile({
      projectDir,
      relativePath,
      content: draftToSave,
    })

    const parsed = await parseMarkdownToChat(draftToSave)

    if (
      selectedFolder.value &&
      currentMarkdownExportPath() === projectDir &&
      selectedNotePath.value === relativePath
    ) {
      selectedMarkdownContent.value = draftToSave
      selectedMarkdownSignature.value = markdownSignature(draftToSave)
      messages.value = await withStoredReactions(parsed.messages.map((message, index) =>
        toMarkdownViewMessage(message, index, relativePath),
      ))
      await syncParsedMarkdownMessages({
        folderId: selectedFolder.value.id,
        notePath: relativePath,
        parsed,
      })
      exportStatus.value = `${relativePath} を保存しました`
      await refreshFolderNotes()
    }
  } catch (error) {
    markdownEditorError.value = error instanceof Error ? error.message : 'Markdownファイルの保存に失敗しました'
  } finally {
    isSavingMarkdown.value = false

    if (shouldRescheduleAutoSaveMarkdown) {
      shouldRescheduleAutoSaveMarkdown = false
      scheduleAutoSaveMarkdownDraft()
    }
  }
}

const revertMarkdownDraft = () => {
  markdownDraft.value = selectedMarkdownContent.value
  markdownEditorError.value = ''
}

const handleSaveSettings = async (settingName = null) => {
  const requestId = saveSettingsRequestId + 1
  saveSettingsRequestId = requestId
  const entries = settingName
    ? [[settingName, appSettingValue(settingName)]]
    : Object.entries(appSettingsPayload())

  isSavingSettings.value = true
  settingsStatus.value = ''

  try {
    await Promise.all(
      entries.map(([name, value]) =>
        saveSetting(SETTINGS_KEYS[name], value),
      ),
    )
    await saveLastWorkspaceSelection()
    applyAppearanceSettings()
    if (requestId === saveSettingsRequestId) {
      settingsStatus.value = '保存しました'
    }
  } catch (error) {
    if (requestId === saveSettingsRequestId) {
      settingsStatus.value = error instanceof Error ? error.message : '設定の保存に失敗しました'
    }
  } finally {
    if (requestId === saveSettingsRequestId) {
      isSavingSettings.value = false
    }
  }
}

const restoreLastWorkspace = async () => {
  if (settingsReopenLastWorkspace.value !== 'true' || selectedFolderId.value !== null) return

  const lastWorkspaceFolderId = Number(
    await loadSetting(SETTINGS_KEYS.lastWorkspaceFolderId, ''),
  )

  if (!Number.isFinite(lastWorkspaceFolderId)) return
  if (!folders.value.some((folder) => folder.id === lastWorkspaceFolderId)) return

  selectedFolderId.value = lastWorkspaceFolderId

  if (settingsReopenLastNote.value !== 'true') return

  const lastWorkspaceNotePath = await loadSetting(SETTINGS_KEYS.lastWorkspaceNotePath, '')

  if (lastWorkspaceNotePath) {
    selectedNotePath.value = lastWorkspaceNotePath
  }
}

watch(
  [
    settingsThemeMode,
    settingsThemeColor,
    settingsFontSize,
    settingsUiDensity,
  ],
  applyAppearanceSettings,
)

const scheduleAutoSaveMarkdownDraft = () => {
  if (!isAutoSaveMarkdownEnabled.value || viewMode.value !== 'markdown' || !isMarkdownDirty.value) {
    clearAutoSaveMarkdownTimer()
    return
  }
  if (!selectedFolder.value || !selectedNotePath.value || isSelectedNoteDbFallback.value) return
  if (isSavingNote.value || isLoadingMessages.value || isSendingMessage.value || isSavingMarkdown.value) {
    shouldRescheduleAutoSaveMarkdown = true
    return
  }

  shouldRescheduleAutoSaveMarkdown = false
  const expectedTarget = {
    folderId: selectedFolder.value.id,
    projectDir: currentMarkdownExportPath(),
    relativePath: selectedNotePath.value,
    markdownSignature: selectedMarkdownSignature.value,
  }

  clearAutoSaveMarkdownTimer()
  autoSaveMarkdownTimer = window.setTimeout(() => {
    if (viewMode.value !== 'markdown' || isSendingMessage.value) {
      clearAutoSaveMarkdownTimer()
      return
    }

    void saveMarkdownDraft(expectedTarget)
  }, 1200)
}

watch(markdownDraft, () => {
  scheduleAutoSaveMarkdownDraft()
})

watch(settingsAutoSaveMarkdown, (value) => {
  if (value !== 'true') {
    clearAutoSaveMarkdownTimer()
  }
})

onMounted(async () => {
  await loadAppSettings().catch((error) => {
    loadMessageError.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
  await refreshMarkdownExportPath().catch((error) => {
    loadMessageError.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
  await refreshFolders()
  await restoreLastWorkspace()
  await refreshMessages()
})

onBeforeUnmount(() => {
  clearAutoSaveMarkdownTimer()
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
        @open-folder-context-menu="openFolderContextMenu"
        @open-create-note="openCreateNoteModal"
        @rename-note="handleRenameNoteInline"
        @delete-note="handleDeleteNote"
        @select-folder="selectFolder"
        @select-note="selectNote"
        @select-folder-notes="selectAllNotesInFolder"
        @open-settings="openSettingsModal"
      />
      <main class="content">
        <div class="header">
          <Input />
        </div>
        <div v-if="canUseMarkdownModes" class="view-toolbar">
          <div class="view-tabs" role="tablist" aria-label="表示モード">
            <button
              type="button"
              class="view-tab"
              :class="{ active: viewMode === 'chat' }"
              role="tab"
              :aria-selected="viewMode === 'chat'"
              @click="switchViewMode('chat')"
            >
              チャット
            </button>
            <button
              type="button"
              class="view-tab"
              :class="{ active: viewMode === 'markdown' }"
              role="tab"
              :aria-selected="viewMode === 'markdown'"
              @click="switchViewMode('markdown')"
            >
              Markdown
            </button>
          </div>
          <button
            type="button"
            class="secondary-button reload-button"
            :disabled="isReloadMarkdownDisabled"
            @click="reloadSelectedMarkdown"
          >
            {{ isReloadingMarkdown ? '再読み込み中' : '再読み込み' }}
          </button>
        </div>
        <p v-if="exportStatus" class="export-status">{{ exportStatus }}</p>
        <p v-if="viewMode === 'chat' && isMarkdownDirty" class="export-status is-warning">
          Markdownに未保存の変更があります
        </p>
        <div v-if="viewMode === 'chat'" ref="messagesRef" class="messages">
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
              :reactions="message.reactions"
              :reaction-options="REACTION_OPTIONS"
              @toggle-reaction="toggleMessageReaction(message, $event)"
            />
          </template>
        </div>
        <div v-else class="markdown-editor">
          <div class="markdown-editor-toolbar">
            <p class="markdown-editor-path">{{ selectedNotePath }}</p>
            <div class="markdown-editor-actions">
              <button
                type="button"
                class="secondary-button"
                :disabled="isSavingMarkdown || isSavingNote || !isMarkdownDirty"
                @click="revertMarkdownDraft"
              >
                破棄
              </button>
              <button
                type="button"
                class="primary-button"
                :disabled="isSavingMarkdown || isSavingNote || !isMarkdownDirty"
                @click="saveMarkdownDraft"
              >
                {{ isSavingMarkdown ? '保存中' : '保存' }}
              </button>
            </div>
          </div>
          <textarea
            v-model="markdownDraft"
            class="markdown-textarea"
            aria-label="Markdown本文"
            spellcheck="false"
            :disabled="isSavingNote"
          />
          <p v-if="markdownEditorError" class="settings-status is-error" role="alert">{{ markdownEditorError }}</p>
        </div>
        <SendMessage
          v-if="viewMode === 'chat'"
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
                : modalMode === 'create-note'
                  ? 'ノート作成'
                  : 'プロジェクト登録'
          }}
        </h2>
      </template>
      <template #body>
        <form v-if="modalMode === 'app-settings'" class="settings-layout" @submit.prevent>
          <aside class="settings-nav" aria-label="設定カテゴリ">
            <button
              v-for="category in SETTINGS_CATEGORIES"
              :key="category.id"
              type="button"
              class="settings-nav-button"
              :class="{ active: activeSettingsCategory === category.id }"
              @click="activeSettingsCategory = category.id"
            >
              {{ category.label }}
            </button>
          </aside>

          <section class="settings-panel">
            <div v-if="activeSettingsCategory === 'appearance'" class="settings-section">
              <div class="settings-group">
                <div class="settings-row">
                  <label class="field-label" for="theme-mode">表示モード</label>
                  <select id="theme-mode" v-model="settingsThemeMode" class="path-input" @change="handleSaveSettings('themeMode')">
                    <option value="system">OSに合わせる</option>
                    <option value="light">ライト</option>
                    <option value="dark">ダーク</option>
                  </select>
                </div>
                <div class="settings-row">
                  <label class="field-label" for="theme-color">テーマカラー</label>
                  <div class="color-field">
                    <input
                      id="theme-color"
                      v-model="settingsThemeColor"
                      class="color-input"
                      type="color"
                      aria-label="テーマカラー"
                      @input="applyAppearanceSettings"
                      @change="handleSaveSettings('themeColor')"
                    />
                    <input
                      v-model="settingsThemeColor"
                      class="path-input color-text-input"
                      type="text"
                      inputmode="text"
                      maxlength="7"
                      placeholder="#FF4500"
                      aria-label="テーマカラーのHEX値"
                      @blur="settingsThemeColor = normalizeThemeColor(settingsThemeColor); handleSaveSettings('themeColor')"
                    />
                  </div>
                </div>
                <div class="settings-row">
                  <label class="field-label" for="font-size">フォントサイズ</label>
                  <div class="range-field">
                    <input
                      id="font-size"
                      v-model="settingsFontSize"
                      class="settings-range"
                      type="range"
                      min="14"
                      max="20"
                      step="1"
                      @change="handleSaveSettings('fontSize')"
                    />
                    <p class="settings-inline-value">{{ settingsFontSize }}px</p>
                  </div>
                </div>
                <div class="settings-row">
                  <label class="field-label" for="ui-density">UI密度</label>
                  <select id="ui-density" v-model="settingsUiDensity" class="path-input" @change="handleSaveSettings('uiDensity')">
                    <option value="comfortable">標準</option>
                    <option value="compact">コンパクト</option>
                    <option value="spacious">広め</option>
                  </select>
                </div>
              </div>
            </div>

            <div v-else-if="activeSettingsCategory === 'editor'" class="settings-section">
              <div class="settings-group">
                <div class="settings-row">
                  <label class="field-label" for="markdown-default-view">ノートを開いたときの表示</label>
                  <select
                    id="markdown-default-view"
                    v-model="settingsMarkdownDefaultView"
                    class="path-input"
                    @change="handleSaveSettings('markdownDefaultView')"
                  >
                    <option value="chat">チャット</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
                <label class="settings-row settings-check">
                  <span class="field-label">Markdownを自動保存</span>
                  <input
                    v-model="settingsAutoSaveMarkdown"
                    type="checkbox"
                    true-value="true"
                    false-value="false"
                    @change="handleSaveSettings('autoSaveMarkdown')"
                  />
                </label>
              </div>
            </div>

            <div v-else class="settings-section">
              <div class="settings-group">
                <div class="settings-row">
                  <label class="field-label" for="root-markdown-export-path">ルート用Markdown保存先</label>
                  <div class="path-field">
                    <input
                      id="root-markdown-export-path"
                      v-model="markdownExportPath"
                      type="text"
                      class="path-input"
                      placeholder="ルートプロジェクトで使うフォルダー"
                      @blur="handleSaveRootMarkdownExportPath"
                    />
                    <button
                      type="button"
                      class="secondary-button browse-button"
                      @click="handleBrowseRootMarkdownExportPath"
                    >
                      参照
                    </button>
                  </div>
                </div>
                <label class="settings-row settings-check">
                  <span class="field-label">起動時に最後のワークスペースを開く</span>
                  <input
                    v-model="settingsReopenLastWorkspace"
                    type="checkbox"
                    true-value="true"
                    false-value="false"
                    @change="handleSaveSettings('reopenLastWorkspace')"
                  />
                </label>
                <label class="settings-row settings-check">
                  <span class="field-label">起動時に最後のノートを開く</span>
                  <input
                    v-model="settingsReopenLastNote"
                    type="checkbox"
                    true-value="true"
                    false-value="false"
                    @change="handleSaveSettings('reopenLastNote')"
                  />
                </label>
              </div>
            </div>

            <p v-if="settingsStatus" class="settings-status">{{ settingsStatus }}</p>
          </section>
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
        <form
          v-else-if="modalMode === 'create-note'"
          class="settings-form"
          @submit.prevent="handleCreateNote(closeModal)"
        >
          <label class="field-label" for="note-path">ノートファイル名</label>
          <input
            id="note-path"
            v-model="notePathInput"
            class="path-input"
            type="text"
            placeholder="2026-05-30.md"
          />
          <p v-if="noteActionError" class="settings-status is-error">{{ noteActionError }}</p>
        </form>
      </template>
      <template v-if="modalMode === 'create-project'" #footer="{ close }">
        <button type="button" class="secondary-button" @click="close">キャンセル</button>
        <button type="button" class="primary-button" @click="handleCreateFolder(close)">登録</button>
      </template>
      <template v-else-if="modalMode === 'create-note'" #footer="{ close }">
        <button type="button" class="secondary-button" @click="close">キャンセル</button>
        <button
          type="button"
          class="primary-button"
          :disabled="isSavingNote || !notePathInput.trim()"
          @click="handleCreateNote(close)"
        >
          {{ isSavingNote ? '作成中' : '作成' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.container {
  padding: calc(16px * var(--density-scale));
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

.view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
}

.view-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--surface-panel);
}

.view-tab {
  min-width: 88px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.view-tab:hover,
.view-tab.active {
  background: var(--surface-card);
  color: var(--text-primary);
}

.reload-button {
  flex: 0 0 auto;
}

.export-status {
  margin: -6px 0 12px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.export-status.is-warning {
  color: var(--text-secondary);
}

.modal-title {
  margin: 0;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 12px 4px 0;
  border-right: 1px solid var(--border-default);
}

.settings-nav-button {
  width: 100%;
  min-height: 38px;
  border: none;
  border-radius: 8px;
  padding: 0 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.settings-nav-button:hover {
  background: var(--surface-elevated-hover);
  color: var(--text-primary);
}

.settings-nav-button.active {
  background: var(--surface-accent);
  color: var(--text-primary);
}

.settings-panel {
  min-width: 0;
  padding: 0 0 0 32px;
  overflow-y: auto;
}

.settings-section {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  gap: 20px;
}

.settings-group {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: var(--bg-base-2);
}

.settings-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(280px, 52%);
  gap: 24px;
  align-items: center;
  min-height: 64px;
  box-sizing: border-box;
  padding: 14px 18px;
}

.settings-row:not(:last-child)::after {
  position: absolute;
  right: 18px;
  bottom: 0;
  left: 18px;
  height: 1px;
  background: var(--border-default);
  content: '';
  opacity: 0.56;
}

.settings-inline-value {
  min-width: 42px;
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  text-align: right;
}

.settings-range {
  width: 100%;
  accent-color: var(--bg-primary);
}

.range-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.color-field {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.color-input {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--surface-input);
  cursor: pointer;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 999px;
}

.color-text-input {
  max-width: 140px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-transform: uppercase;
}

.settings-check {
  color: var(--text-primary);
  cursor: pointer;
}

.settings-check input {
  justify-self: end;
  position: relative;
  width: 48px;
  height: 28px;
  margin: 0;
  appearance: none;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--surface-toolbar);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}

.settings-check input::after {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #FFFFFF;
  box-shadow: var(--shadow-soft);
  content: '';
  transform: translateY(-50%);
  transition: transform 160ms ease;
}

.settings-check input:checked {
  border-color: var(--bg-primary);
  background: var(--bg-primary);
}

.settings-check input:checked::after {
  transform: translate(20px, -50%);
}

.settings-check input:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.settings-check input:disabled {
  cursor: not-allowed;
  opacity: 0.58;
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
  min-width: 0;
}

.path-field .path-input {
  flex: 1 1 auto;
  min-width: 0;
}

.path-input {
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 0 12px;
  background: var(--surface-input);
  color: var(--text-primary);
  font-size: 14px;
}

select.path-input {
  cursor: pointer;
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
  gap: calc(16px * var(--density-scale));
  margin-bottom: calc(16px * var(--density-scale));
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

.markdown-editor {
  flex: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.markdown-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.markdown-editor-path {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.markdown-editor-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.markdown-textarea {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 14px;
  resize: none;
  background: var(--surface-input);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-textarea:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-nav {
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }

  .settings-panel {
    padding: 12px;
  }

  .settings-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .color-field {
    justify-content: flex-start;
  }
}
</style>
