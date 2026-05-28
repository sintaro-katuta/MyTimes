<script setup>
import { convertFileSrc } from '@tauri-apps/api/core'
import { computed, ref, watch } from 'vue'

import {
  ChevronDown,
  ChevronRight,
  Folder,
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
  selectedNotePath: {
    type: String,
    default: null,
  },
})

const emit = defineEmits([
  'open-settings',
  'open-create-folder',
  'open-folder-settings',
  'select-folder',
  'select-folder-notes',
  'select-note',
])

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

  return props.folders.find((folder) => folder.id === props.selectedFolderId)?.name ?? '選択中プロジェクト'
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

const selectFolderNotes = () => {
  emit('select-folder-notes')
}

const selectAllMessages = () => {
  emit('select-folder', null)
}

const selectFolder = (folder) => {
  emit('select-folder', folder.id)
}

const selectNote = (note) => {
  emit('select-note', note.path)
}

const noteFileName = (path) => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
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
      <div class="rail-actions">
        <button type="button" class="rail-button" aria-label="新規プロジェクト" @click="openCreateFolder">
          <Plus :size="20" />
        </button>
      </div>

      <div class="folder-icons" aria-label="プロジェクト一覧">
        <div class="rail-item">
          <span v-if="selectedFolderId === null" class="active-indicator" aria-hidden="true" />
          <button
            type="button"
            class="rail-button"
            :class="{ active: selectedFolderId === null }"
            aria-label="すべて"
            @click="selectAllMessages"
          >
            <Folder :size="20" />
          </button>
        </div>

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
          <button type="button" class="folder-title-button" @click="selectFolderNotes">
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
          <div v-if="notes.length === 0" class="empty-folders">このプロジェクトにファイルはありません</div>
          <button
            v-for="note in notes"
            :key="note.path"
            type="button"
            class="note"
            :class="{ active: selectedNotePath === note.path }"
            @click="selectNote(note)"
          >
            <div class="note-body">
              <p class="title">{{ noteFileName(note.path) }}</p>
              <p class="note-meta">{{ note.messageCount }}件</p>
            </div>
          </button>
        </div>
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
  overflow-y: auto;
}

.note {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.note:hover,
.note.active {
  background-color: var(--bg-base-3);
  color: var(--text-primary);
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
