<script setup>
import { open } from '@tauri-apps/plugin-dialog'
import { LogicalPosition } from '@tauri-apps/api/dpi'
import { Menu, MenuItem } from '@tauri-apps/api/menu'
import { computed, nextTick, onMounted, ref } from 'vue'
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
  loadAppTitle,
  loadFolders as loadStoredFolders,
  loadFolderNotes as loadStoredFolderNotes,
  loadMarkdownExportPath,
  loadMessages as loadStoredMessages,
  registerProject,
  saveAppTitle,
  saveFolderIconPath,
  saveFolderMarkdownExportPath,
  saveMarkdownExportPath,
  saveProjectDisplayName,
  syncMarkdownMessages,
  updateMarkdownMessagePath,
} from './lib/messages'

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
const isLoadingMessages = ref(true)
const isLoadingFolders = ref(true)
const isLoadingFolderNotes = ref(false)
const isSendingMessage = ref(false)
const isSavingMarkdown = ref(false)
const isReloadingMarkdown = ref(false)
const isSavingNote = ref(false)
const isSavingSettings = ref(false)
const isBrowsing = ref(false)
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
const notePathInput = ref('')
const noteActionError = ref('')

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

  return window.confirm('保存していないMarkdownの変更があります。変更を破棄して続行しますか？')
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

const markdownSignature = (markdown) => {
  let hash = 0x811c9dc5

  for (let index = 0; index < markdown.length; index += 1) {
    hash ^= markdown.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash.toString(16)
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
  messages.value = parsed.messages.map((message, index) =>
    toMarkdownViewMessage(message, index, relativePath),
  )

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
      viewMode.value = 'chat'

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

        messages.value = rows.map(toViewMessage)
        isSelectedNoteDbFallback.value = true
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

    messages.value = rows.map(toViewMessage)

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
    await refreshFolderNotes()
    await refreshMessages()
    viewMode.value = 'markdown'
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

const openFolderContextMenu = async ({ folder, position }) => {
  try {
    const menuItems = await Promise.all([
      MenuItem.new({
        id: 'folder-rename',
        text: '名前を変更',
        action: (id) => {
          void handleFolderContextMenuAction(id, folder)
        },
      }),
      MenuItem.new({
        id: 'folder-path',
        text: 'パスを変更',
        action: (id) => {
          void handleFolderContextMenuAction(id, folder)
        },
      }),
      MenuItem.new({
        id: 'folder-image',
        text: '画像を変更',
        action: (id) => {
          void handleFolderContextMenuAction(id, folder)
        },
      }),
      MenuItem.new({
        id: 'folder-delete',
        text: '削除',
        action: (id) => {
          void handleFolderContextMenuAction(id, folder)
        },
      }),
    ])

    const menu = await Menu.new({
      items: menuItems,
    })

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
  await refreshMessages()
}

const selectNote = async (notePath) => {
  if (notePath === selectedNotePath.value) return
  if (!confirmDiscardMarkdownChanges()) return

  selectedNotePath.value = notePath
  viewMode.value = 'chat'
  await refreshMessages()
}

const selectAllNotesInFolder = async () => {
  if (selectedNotePath.value === null) return
  if (!confirmDiscardMarkdownChanges()) return

  selectedNotePath.value = null
  viewMode.value = 'chat'
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

  if (!folderPath) return basePath

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
        messages.value = parsed.messages.map((message, index) =>
          toMarkdownViewMessage(message, index, relativePath),
        )
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

const saveMarkdownDraft = async () => {
  if (
    !selectedFolder.value ||
    !selectedNotePath.value ||
    isSelectedNoteDbFallback.value ||
    isSavingMarkdown.value ||
    isSavingNote.value
  ) {
    return
  }

  const projectDir = currentMarkdownExportPath()
  const relativePath = selectedNotePath.value
  const draftToSave = markdownDraft.value

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
      messages.value = parsed.messages.map((message, index) =>
        toMarkdownViewMessage(message, index, relativePath),
      )
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
  }
}

const revertMarkdownDraft = () => {
  markdownDraft.value = selectedMarkdownContent.value
  markdownEditorError.value = ''
}

const handleSaveSettings = async () => {
  const nextMarkdownExportPath = settingsMarkdownExportPath.value.trim()
  const previousMarkdownExportPath = markdownExportPath.value.trim()
  const previousSelectedFolderId = selectedFolderId.value
  const previousSelectedNotePath = selectedNotePath.value
  const shouldReloadMarkdown = Boolean(
    selectedFolder.value && nextMarkdownExportPath !== previousMarkdownExportPath,
  )

  if (
    shouldReloadMarkdown &&
    !confirmDiscardMarkdownChanges()
  ) {
    return
  }

  isSavingSettings.value = true
  settingsStatus.value = ''

  try {
    await saveAppTitle(settingsAppTitle.value)
    await saveMarkdownExportPath(settingsMarkdownExportPath.value)
    await refreshAppTitle()
    await refreshMarkdownExportPath()
    await refreshFolders()
    const selectionChanged = (
      selectedFolderId.value !== previousSelectedFolderId ||
      selectedNotePath.value !== previousSelectedNotePath
    )

    if (nextMarkdownExportPath !== previousMarkdownExportPath || selectionChanged) {
      await refreshMessages()
    }
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
  await refreshMarkdownExportPath().catch((error) => {
    loadMessageError.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました'
  })
  await refreshFolders()
  await refreshMessages()
  refreshAppTitle().catch((error) => {
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
</style>
