<script setup>
import { convertFileSrc } from '@tauri-apps/api/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from '@lucide/vue'

const props = defineProps({
  folders: {
    type: Array,
    default: () => [],
  },
  notes: {
    type: Array,
    default: () => [],
  },
  isLoadingNotes: {
    type: Boolean,
    default: false,
  },
  notesErrorMessage: {
    type: String,
    default: '',
  },
  selectedFolderId: {
    type: Number,
    default: null,
  },
  selectedNotePath: {
    type: String,
    default: null,
  },
})

const emit = defineEmits([
  'open-settings',
  'open-create-folder',
  'open-folder-settings',
  'open-create-note',
  'rename-note',
  'delete-note',
  'select-folder',
  'select-folder-notes',
  'select-note',
])

const expandedFolderIds = ref(new Set())
const noteContextMenu = ref({
  isOpen: false,
  x: 0,
  y: 0,
  note: null,
})
const editingNotePath = ref('')
const noteRenameInput = ref('')
const noteRenameInputRef = ref(null)
const expandedNoteDirectoryPaths = ref(new Set())

const foldersByParent = computed(() => {
  return props.folders.reduce((groups, folder) => {
    const parentKey = folder.parentId ?? 'root'

    if (!groups.has(parentKey)) {
      groups.set(parentKey, [])
    }

    groups.get(parentKey).push(folder)
    return groups
  }, new Map())
})

const foldersById = computed(() => {
  return props.folders.reduce((map, folder) => {
    map.set(folder.id, folder)
    return map
  }, new Map())
})

const visibleFolders = computed(() => {
  const result = []

  const appendFolders = (parentId, depth) => {
    const key = parentId ?? 'root'
    const children = foldersByParent.value.get(key) ?? []

    children.forEach((folder) => {
      const hasChildren = (foldersByParent.value.get(folder.id) ?? []).length > 0

      result.push({
        ...folder,
        depth,
        hasChildren,
        isExpanded: expandedFolderIds.value.has(folder.id),
      })

      if (hasChildren && expandedFolderIds.value.has(folder.id)) {
        appendFolders(folder.id, depth + 1)
      }
    })
  }

  appendFolders(null, 0)
  return result
})

const selectedFolderName = computed(() => {
  if (props.selectedFolderId === null) return 'フォルダー未選択'

  return props.folders.find((folder) => folder.id === props.selectedFolderId)?.name ?? '選択中プロジェクト'
})

const noteDirectoryPaths = computed(() => {
  const paths = new Set()

  for (const note of props.notes) {
    const parts = note.path.split(/[\\/]/).filter(Boolean)

    parts.pop()

    let currentPath = ''
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      paths.add(currentPath)
    }
  }

  return paths
})

const noteTreeItems = computed(() => {
  const root = {
    children: [],
    childrenByPath: new Map(),
  }

  const ensureDirectory = ({ parent, name, path, depth }) => {
    if (parent.childrenByPath.has(path)) {
      return parent.childrenByPath.get(path)
    }

    const directory = {
      type: 'directory',
      id: `directory:${path}`,
      name,
      path,
      depth,
      children: [],
      childrenByPath: new Map(),
    }

    parent.childrenByPath.set(path, directory)
    parent.children.push(directory)
    return directory
  }

  for (const note of props.notes) {
    const parts = note.path.split(/[\\/]/).filter(Boolean)
    const fileName = parts.pop() ?? note.path
    let parent = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      parent = ensureDirectory({
        parent,
        name: part,
        path: currentPath,
        depth: index,
      })
    })

    parent.children.push({
      type: 'file',
      id: `file:${note.path}`,
      name: fileName,
      path: note.path,
      note,
      depth: parts.length,
    })
  }

  const sortTreeItems = (items) => {
    items.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'directory' ? -1 : 1
      }

      return left.name.localeCompare(right.name, 'ja-JP')
    })

    items.forEach((item) => {
      if (item.type === 'directory') {
        sortTreeItems(item.children)
      }
    })
  }

  sortTreeItems(root.children)
  return root.children
})

const visibleNoteTreeItems = computed(() => {
  const items = []

  const appendItems = (treeItems) => {
    for (const item of treeItems) {
      if (item.type === 'directory') {
        const isExpanded = expandedNoteDirectoryPaths.value.has(item.path)

        items.push({
          ...item,
          isExpanded,
        })

        if (isExpanded) {
          appendItems(item.children)
        }
      } else {
        items.push(item)
      }
    }
  }

  appendItems(noteTreeItems.value)
  return items
})

const expandAncestors = (folderId) => {
  const nextExpandedIds = new Set(expandedFolderIds.value)
  let currentFolder = foldersById.value.get(folderId)

  while (currentFolder?.parentId !== null && currentFolder?.parentId !== undefined) {
    nextExpandedIds.add(currentFolder.parentId)
    currentFolder = foldersById.value.get(currentFolder.parentId)
  }

  expandedFolderIds.value = nextExpandedIds
}

const openSettings = () => {
  emit('open-settings')
}

const openCreateFolder = () => {
  emit('open-create-folder')
}

const openFolderSettings = () => {
  emit('open-folder-settings')
}

const openCreateNote = () => {
  emit('open-create-note')
}

const selectTimeline = () => {
  emit('select-folder-notes')
}

const selectFolder = (folder) => {
  emit('select-folder', folder.id)
}

const selectNote = (note) => {
  emit('select-note', note.path)
}

const deleteNote = (note) => {
  emit('delete-note', note.path)
}

const closeNoteContextMenu = () => {
  noteContextMenu.value = {
    isOpen: false,
    x: 0,
    y: 0,
    note: null,
  }
}

const openNoteContextMenu = (event, note) => {
  if (props.selectedFolderId === null) return

  openNoteContextMenuAt({
    x: event.clientX,
    y: event.clientY,
    note,
  })
}

const openNoteContextMenuAt = ({ x, y, note }) => {
  if (props.selectedFolderId === null) return

  const menuWidth = 156
  const menuHeight = 88
  const viewportPadding = 8

  noteContextMenu.value = {
    isOpen: true,
    x: Math.max(
      viewportPadding,
      Math.min(x, window.innerWidth - menuWidth - viewportPadding),
    ),
    y: Math.max(
      viewportPadding,
      Math.min(y, window.innerHeight - menuHeight - viewportPadding),
    ),
    note,
  }
}

const handleNoteMenuKeydown = (event, note) => {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return

  event.preventDefault()
  const rect = event.currentTarget.getBoundingClientRect()

  openNoteContextMenuAt({
    x: rect.right,
    y: rect.top,
    note,
  })
}

const handleRenameNoteFromMenu = () => {
  const note = noteContextMenu.value.note
  closeNoteContextMenu()
  if (!note) return

  startRenameNote(note)
}

const handleDeleteNoteFromMenu = () => {
  const note = noteContextMenu.value.note
  closeNoteContextMenu()
  if (!note) return

  deleteNote(note)
}

const noteFileName = (path) => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

const noteDirectoryPath = (path) => {
  const parts = path.split(/[\\/]/).filter(Boolean)

  parts.pop()
  return parts.join('/')
}

const notePathFromInlineName = (currentPath, inputValue) => {
  const value = inputValue.trim().replaceAll('\\', '/').replace(/^\/+/, '')

  if (!value) return ''
  if (value.includes('/')) return value

  const directoryPath = noteDirectoryPath(currentPath)
  return directoryPath ? `${directoryPath}/${value}` : value
}

const startRenameNote = async (note) => {
  editingNotePath.value = note.path
  noteRenameInput.value = noteFileName(note.path)

  await nextTick()
  focusNoteRenameInput()
}

const focusNoteRenameInput = () => {
  const input = Array.isArray(noteRenameInputRef.value)
    ? noteRenameInputRef.value.find(Boolean)
    : noteRenameInputRef.value

  input?.focus()
  input?.select()
}

const cancelRenameNote = () => {
  editingNotePath.value = ''
  noteRenameInput.value = ''
}

const commitRenameNote = (note) => {
  if (editingNotePath.value !== note.path) return

  const nextRelativePath = notePathFromInlineName(note.path, noteRenameInput.value)

  if (!nextRelativePath || nextRelativePath === note.path) {
    cancelRenameNote()
    return
  }

  emit('rename-note', {
    currentRelativePath: note.path,
    nextRelativePath,
  })
  cancelRenameNote()
}

const folderIconSrc = (folder) => {
  return folder.iconPath ? convertFileSrc(folder.iconPath) : ''
}

const toggleFolder = (folder) => {
  const nextExpandedIds = new Set(expandedFolderIds.value)

  if (nextExpandedIds.has(folder.id)) {
    nextExpandedIds.delete(folder.id)
  } else {
    nextExpandedIds.add(folder.id)
  }

  expandedFolderIds.value = nextExpandedIds
}

const toggleNoteDirectory = (directory) => {
  const nextExpandedPaths = new Set(expandedNoteDirectoryPaths.value)

  if (nextExpandedPaths.has(directory.path)) {
    nextExpandedPaths.delete(directory.path)
  } else {
    nextExpandedPaths.add(directory.path)
  }

  expandedNoteDirectoryPaths.value = nextExpandedPaths
}

const handleDocumentClick = () => {
  closeNoteContextMenu()
}

const handleDocumentKeydown = (event) => {
  if (event.key === 'Escape') {
    closeNoteContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

watch(
  () => [props.selectedFolderId, props.folders.length],
  ([folderId]) => {
    if (folderId === null) return

    expandAncestors(folderId)
  },
)

watch(
  noteDirectoryPaths,
  (paths, previousPaths) => {
    const nextExpandedPaths = new Set(expandedNoteDirectoryPaths.value)

    for (const path of paths) {
      if (!previousPaths || !previousPaths.has(path)) {
        nextExpandedPaths.add(path)
      }
    }

    for (const path of nextExpandedPaths) {
      if (!paths.has(path)) {
        nextExpandedPaths.delete(path)
      }
    }

    expandedNoteDirectoryPaths.value = nextExpandedPaths
  },
  { immediate: true },
)

watch(
  () => props.selectedNotePath,
  (notePath) => {
    if (!notePath) return

    const parts = notePath.split(/[\\/]/).filter(Boolean)

    parts.pop()
    if (parts.length === 0) return

    const nextExpandedPaths = new Set(expandedNoteDirectoryPaths.value)
    let currentPath = ''

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      nextExpandedPaths.add(currentPath)
    }

    expandedNoteDirectoryPaths.value = nextExpandedPaths
  },
  { immediate: true },
)
</script>

<template>
  <div class="sidebar">
    <div class="rail">
      <div class="rail-actions">
        <button type="button" class="rail-button" aria-label="新規プロジェクト" @click="openCreateFolder">
          <Plus :size="20" />
        </button>
      </div>

      <div class="folder-icons" aria-label="プロジェクト一覧">
        <template v-for="folder in visibleFolders" :key="folder.id">
          <button
            v-if="folder.hasChildren"
            type="button"
            class="rail-button is-toggle"
            :aria-label="folder.isExpanded ? `${folder.name}を折りたたむ` : `${folder.name}を展開する`"
            @click="toggleFolder(folder)"
          >
            <ChevronDown v-if="folder.isExpanded" :size="16" />
            <ChevronRight v-else :size="16" />
          </button>

          <div class="rail-item">
            <span v-if="selectedFolderId === folder.id" class="active-indicator" aria-hidden="true" />
            <button
              type="button"
              class="rail-button"
              :class="{ active: selectedFolderId === folder.id, 'has-image': folder.iconPath }"
              :aria-label="folder.name"
              :title="folder.path"
              @click="selectFolder(folder)"
            >
              <img v-if="folder.iconPath" class="folder-image" :src="folderIconSrc(folder)" alt="" />
              <Folder v-else :size="20" />
            </button>
          </div>
        </template>
      </div>

      <button type="button" class="rail-button rail-settings" aria-label="アプリ設定" @click="openSettings">
        <Settings :size="20" />
      </button>
    </div>

    <div class="panel">
      <div class="section notes-section">
        <div class="folder-header">
          <button type="button" class="folder-title-button" @click="selectTimeline">
            {{ selectedFolderName }}
          </button>
          <button
            v-if="selectedFolderId !== null"
            type="button"
            class="folder-action"
            aria-label="プロジェクト設定"
            @click="openFolderSettings"
          >
            <Settings :size="16" />
          </button>
        </div>
        <p class="section-title">ファイル</p>
        <div class="notes">
          <div v-if="isLoadingNotes" class="empty-folders">ファイルを読み込み中</div>
          <div v-else-if="notesErrorMessage" class="empty-folders is-error">{{ notesErrorMessage }}</div>
          <div v-else-if="notes.length === 0" class="empty-folders">このプロジェクトにファイルはありません</div>
          <template v-else>
            <div
              v-for="item in visibleNoteTreeItems"
              :key="item.id"
              class="note"
              :class="{
                'is-directory': item.type === 'directory',
                active: item.type === 'file' && selectedNotePath === item.path,
                'menu-open': item.type === 'file' && noteContextMenu.isOpen && noteContextMenu.note?.path === item.path,
                editing: item.type === 'file' && editingNotePath === item.path,
              }"
              :style="{ '--note-depth': item.depth }"
              @contextmenu.prevent="item.type === 'file' ? openNoteContextMenu($event, item.note) : undefined"
            >
              <button
                v-if="item.type === 'directory'"
                type="button"
                class="note-directory"
                :aria-expanded="item.isExpanded"
                :aria-label="item.isExpanded ? `${item.name}を折りたたむ` : `${item.name}を展開する`"
                @click="toggleNoteDirectory(item)"
              >
                <ChevronDown v-if="item.isExpanded" :size="14" />
                <ChevronRight v-else :size="14" />
                <Folder :size="15" />
                <span class="note-directory-name">{{ item.name }}</span>
              </button>
              <button
                v-else-if="editingNotePath !== item.path"
                type="button"
                class="note-select"
                :title="item.path"
                @click="selectNote(item.note)"
                @keydown="handleNoteMenuKeydown($event, item.note)"
              >
                <FileText class="note-file-icon" :size="15" />
                <div class="note-body">
                  <p class="title">{{ item.name }}</p>
                </div>
              </button>
              <input
                v-else
                ref="noteRenameInputRef"
                v-model="noteRenameInput"
                class="note-rename-input"
                type="text"
                aria-label="ノート名"
                @blur="commitRenameNote(item.note)"
                @keydown.enter.prevent="commitRenameNote(item.note)"
                @keydown.esc.prevent="cancelRenameNote"
                @click.stop
              />
            </div>
          </template>
        </div>
        <button
          v-if="selectedFolderId !== null"
          type="button"
          class="new-note-button"
          @click="openCreateNote"
        >
          <Plus :size="24" />
          <span>新しいノート</span>
        </button>
      </div>
      <div
        v-if="noteContextMenu.isOpen"
        class="note-context-menu"
        :style="{ left: `${noteContextMenu.x}px`, top: `${noteContextMenu.y}px` }"
        role="menu"
        @click.stop
        @contextmenu.prevent
      >
        <button type="button" class="note-context-menu-item" role="menuitem" @click="handleRenameNoteFromMenu">
          <Pencil :size="14" />
          <span>名前を変更</span>
        </button>
        <button
          type="button"
          class="note-context-menu-item is-danger"
          role="menuitem"
          @click="handleDeleteNoteFromMenu"
        >
          <Trash2 :size="14" />
          <span>削除</span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  gap: 8px;
}

.rail {
  width: 72px;
  height: calc(100vh - 32px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-base-1);
  padding: 12px;
}

.rail-actions,
.folder-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.folder-icons {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.folder-icons::-webkit-scrollbar {
  display: none;
}

.rail-item {
  position: relative;
  width: 72px;
  display: flex;
  justify-content: center;
}

.active-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 28px;
  border-radius: 999px;
  background: var(--text-primary);
  transform: translateY(-50%);
}

.rail-button {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-base-2);
  color: var(--text-tertiary);
  cursor: pointer;
}

.rail-button:hover {
  border-color: var(--border-subtle);
  background: var(--bg-base-3);
  color: var(--text-primary);
}

.rail-button.active {
  border-color: var(--border-subtle);
  background: var(--bg-base-2);
  color: var(--text-primary);
}

.rail-button.has-image,
.rail-button.has-image:hover,
.rail-button.has-image.active {
  border-color: transparent;
  background: transparent;
}

.rail-button.is-toggle {
  height: 28px;
  padding: 0;
  border-color: transparent;
  background: transparent;
}

.folder-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.rail-settings {
  margin-top: 16px;
}

.panel {
  width: 280px;
  height: calc(100vh - 32px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-base-2);
  border-radius: 16px;
  padding: 16px;
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.notes-section {
  flex: 1;
  overflow: hidden;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-title-button {
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-title-button:hover {
  color: var(--text-secondary);
}

.folder-action {
  width: 28px;
  height: 28px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.folder-action:hover {
  background: var(--bg-base-3);
  color: var(--text-primary);
}

.section-title {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
}

.notes {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}

.new-note-button {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: var(--bg-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
}

.new-note-button:hover {
  background: var(--bg-primary-hover);
}

.note {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  overflow: hidden;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  text-align: left;
  --note-depth: 0;
}

.note:hover,
.note.active,
.note.menu-open,
.note.editing {
  background-color: var(--bg-base-3);
  color: var(--text-primary);
}

.note-select {
  min-width: 0;
  width: 100%;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding: 4px;
  padding-left: calc(4px + var(--note-depth) * 16px);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.note-directory {
  min-width: 0;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  padding-left: calc(4px + var(--note-depth) * 16px);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.note-directory-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-file-icon {
  flex: 0 0 auto;
  color: var(--text-tertiary);
}

.note.active .note-file-icon,
.note:hover .note-file-icon {
  color: var(--text-primary);
}

.note-body {
  min-width: 0;
  flex: 1;
}

.note-rename-input {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  margin-left: calc(var(--note-depth) * 16px);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  background: var(--bg-base-2);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.note-rename-input:focus {
  border-color: var(--text-secondary);
}

.note-context-menu {
  position: fixed;
  z-index: 40;
  width: 156px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-base-1);
  box-shadow: 0 12px 32px rgb(0 0 0 / 28%);
}

.note-context-menu-item {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-align: left;
}

.note-context-menu-item:hover {
  background: var(--bg-base-2);
  color: var(--text-primary);
}

.note-context-menu-item.is-danger:hover {
  color: var(--bg-error);
}

.title {
  margin: 0;
}

.title {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-text,
.empty-folders {
  color: var(--text-tertiary);
  font-size: 12px;
}

.state-text,
.empty-folders {
  margin: 0;
  padding: 8px;
}

.state-text.is-error {
  color: var(--bg-error);
}

.empty-folders.is-error {
  color: var(--bg-error);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
