<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import Button from './Button.vue'

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Settings,
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
  selectedFolderId: {
    type: Number,
    default: null,
  },
  isLoadingFolders: {
    type: Boolean,
    default: false,
  },
  folderError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['open-settings', 'open-new-note', 'create-folder', 'select-folder'])

const isCreatingFolder = ref(false)
const folderName = ref('')
const expandedFolderIds = ref(new Set())

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
  if (props.selectedFolderId === null) return 'ルート'

  return props.folders.find((folder) => folder.id === props.selectedFolderId)?.path ?? '選択中フォルダ'
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

const openNewNote = () => {
  emit('open-new-note')
}

const selectAllMessages = () => {
  emit('select-folder', null)
}

const selectFolder = (folder) => {
  emit('select-folder', folder.id)
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

const startCreateFolder = () => {
  isCreatingFolder.value = true
}

const cancelCreateFolder = () => {
  isCreatingFolder.value = false
  folderName.value = ''
}

const submitFolder = () => {
  const name = folderName.value.trim()

  if (!name) return

  emit('create-folder', name)
  folderName.value = ''
  isCreatingFolder.value = false
}

watch(
  () => [props.selectedFolderId, props.folders.length],
  ([folderId]) => {
    if (folderId === null) return

    expandAncestors(folderId)
  },
)
</script>

<template>
  <div class="sidebar">
    <div class="rail">
      <div class="icons">
        <Icon src="/example1.jpg" width="48" height="48" class="selected" />
        <Icon src="/example1.jpg" width="48" height="48" />
        <Icon src="/example1.jpg" width="48" height="48" />
        <button type="button" class="rail-action" aria-label="新規フォルダ" @click="startCreateFolder">
          <Plus :size="20" />
        </button>
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
      <div class="section">
        <div class="section-header">
          <p class="section-title">フォルダ</p>
        </div>

        <form v-if="isCreatingFolder" class="folder-form" @submit.prevent="submitFolder">
          <label class="sr-only" for="folder-name">フォルダ名</label>
          <input
            id="folder-name"
            v-model="folderName"
            type="text"
            :placeholder="`${selectedFolderName} に作成`"
            autofocus
            @keydown.esc="cancelCreateFolder"
          />
          <div class="folder-form-actions">
            <button type="button" class="text-button" @click="cancelCreateFolder">キャンセル</button>
            <button type="submit" class="text-button is-primary">作成</button>
          </div>
        </form>

        <p v-if="isLoadingFolders" class="state-text">フォルダを読み込み中</p>
        <p v-else-if="folderError" class="state-text is-error">{{ folderError }}</p>

        <div class="folder-list" aria-label="フォルダ一覧">
          <button
            type="button"
            class="folder-row"
            :class="{ active: selectedFolderId === null }"
            @click="selectAllMessages"
          >
            <span class="folder-indent" />
            <FolderOpen :size="16" />
            <span class="folder-name">すべて</span>
          </button>

          <div v-if="!isLoadingFolders && folders.length === 0" class="empty-folders">
            フォルダはまだありません
          </div>

          <div v-for="folder in visibleFolders" :key="folder.id" class="folder-item">
            <button
              type="button"
              class="folder-toggle"
              :style="{ marginLeft: `${folder.depth * 16}px` }"
              :aria-label="folder.isExpanded ? '折りたたむ' : '展開する'"
              :disabled="!folder.hasChildren"
              @click="toggleFolder(folder)"
            >
              <ChevronDown v-if="folder.hasChildren && folder.isExpanded" :size="14" />
              <ChevronRight v-else-if="folder.hasChildren" :size="14" />
            </button>
            <button
              type="button"
              class="folder-row"
              :class="{ active: selectedFolderId === folder.id }"
              @click="selectFolder(folder)"
            >
              <FolderOpen v-if="selectedFolderId === folder.id" :size="16" />
              <Folder v-else :size="16" />
              <span class="folder-name">{{ folder.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="section notes-section">
        <p class="section-title">ノート</p>
        <div class="notes">
          <div v-if="notes.length === 0" class="empty-folders">このフォルダにノートはありません</div>
          <div v-for="note in notes" :key="note.path" class="note">
            <FileText :size="16" />
            <div class="note-body">
              <p class="title">{{ note.path }}</p>
              <p class="note-meta">{{ note.messageCount }}件</p>
            </div>
          </div>
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

.rail-action {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-base-2);
  color: var(--text-tertiary);
  cursor: pointer;
}

.rail-action:hover {
  border-color: var(--border-strong);
  background: var(--bg-base-3);
  color: var(--text-primary);
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

.icon-button:hover {
  color: var(--text-primary);
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
}

.folder-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-base-3);
}

.folder-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
}

.folder-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.text-button {
  padding: 4px 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 12px;
}

.text-button.is-primary {
  color: var(--bg-primary);
  font-weight: 700;
}

.folder-list,
.notes {
  min-height: 0;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
}

.folder-toggle {
  width: 22px;
  height: 32px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.folder-toggle:disabled {
  cursor: default;
  opacity: 0;
}

.folder-row {
  width: 100%;
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
}

.folder-row:hover,
.folder-row.active {
  background-color: var(--bg-base-3);
  color: var(--text-primary);
}

.folder-indent {
  width: 22px;
  flex: 0 0 auto;
}

.folder-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer {
  margin-top: auto;
}

.note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  color: var(--text-secondary);
}

.note:hover {
  background-color: var(--bg-base-3);
}

.note-body {
  min-width: 0;
}

.title,
.note-meta {
  margin: 0;
}

.title {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-meta,
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
