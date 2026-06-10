import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const DATABASE_URL = 'sqlite:mytimes.db'
const MARKDOWN_EXPORT_PATH_KEY = 'markdown_export_path'
const APP_TITLE_KEY = 'app_title'
const DEFAULT_APP_TITLE = 'デイリー分報'
const MESSAGE_KEY_SEPARATOR = '\u001f'

let databasePromise

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL)
  }

  return databasePromise
}

export const loadMessages = async ({ folderId = null, notePath = null } = {}) => {
  const db = await getDatabase()
  const params = []
  const conditions = []

  if (folderId === null) {
    conditions.push('(folder_id IS NULL OR markdown_synced = 0)')
  } else {
    conditions.push('folder_id = ?')
    params.push(folderId)
  }

  if (notePath !== null) {
    conditions.push("COALESCE(note_path, strftime('%Y-%m-%d.md', created_at)) = ?")
    params.push(notePath)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  return db.select(
    `SELECT id, content, note_path, folder_id, markdown_synced, created_at, updated_at
     FROM messages
     ${whereClause}
     ORDER BY created_at ASC, id ASC`,
    params,
  )
}

export const messageReactionKey = ({
  id = null,
  folderId = null,
  notePath = null,
  createdAt = '',
  content = '',
}) => {
  const normalizedFolderId = folderId === null || folderId === undefined ? '' : String(folderId)

  if (id !== null && id !== undefined && id !== '') {
    return [
      'v2',
      normalizedFolderId,
      notePath ?? '',
      String(id),
    ].join(MESSAGE_KEY_SEPARATOR)
  }

  return [
    normalizedFolderId,
    notePath ?? '',
    createdAt ?? '',
    content ?? '',
  ].join(MESSAGE_KEY_SEPARATOR)
}

export const legacyMessageReactionKey = ({
  folderId = null,
  notePath = null,
  createdAt = '',
  content = '',
}) => [
  folderId === null || folderId === undefined ? '' : String(folderId),
  notePath ?? '',
  createdAt ?? '',
  content ?? '',
].join(MESSAGE_KEY_SEPARATOR)

export const loadMessageReactions = async (messageKeys) => {
  const keys = [...new Set(messageKeys.filter(Boolean))]

  if (keys.length === 0) return new Map()

  const db = await getDatabase()
  const placeholders = keys.map(() => '?').join(', ')
  const rows = await db.select(
    `SELECT message_key AS messageKey, reaction_type AS reactionType
     FROM message_reactions
     WHERE selected = 1 AND message_key IN (${placeholders})
     ORDER BY reaction_type ASC`,
    keys,
  )

  return rows.reduce((groups, row) => {
    if (!groups.has(row.messageKey)) {
      groups.set(row.messageKey, [])
    }

    groups.get(row.messageKey).push(row.reactionType)
    return groups
  }, new Map())
}

export const saveMessageReaction = async ({
  messageKey,
  folderId = null,
  notePath = null,
  reactionType,
  selected,
}) => {
  const db = await getDatabase()
  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute(
    `INSERT INTO message_reactions
       (message_key, folder_id, note_path, reaction_type, selected, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(message_key, reaction_type) DO UPDATE SET
       folder_id = excluded.folder_id,
       note_path = excluded.note_path,
       selected = excluded.selected,
       updated_at = excluded.updated_at`,
    [
      messageKey,
      folderId,
      notePath,
      reactionType,
      selected ? 1 : 0,
      updatedAt,
      updatedAt,
    ],
  )
}

export const migrateMessageReactions = async ({
  currentMessageKey,
  nextMessageKey,
  folderId = null,
  notePath = null,
}) => {
  if (!currentMessageKey || !nextMessageKey || currentMessageKey === nextMessageKey) return

  const db = await getDatabase()
  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute('BEGIN')

  try {
    await db.execute(
      `INSERT INTO message_reactions
         (message_key, folder_id, note_path, reaction_type, selected, created_at, updated_at)
       SELECT ?, ?, ?, reaction_type, selected, created_at, ?
       FROM message_reactions
       WHERE message_key = ?
       ON CONFLICT(message_key, reaction_type) DO UPDATE SET
         folder_id = excluded.folder_id,
         note_path = excluded.note_path,
         selected = excluded.selected,
         updated_at = excluded.updated_at`,
      [nextMessageKey, folderId, notePath, updatedAt, currentMessageKey],
    )
    await db.execute(
      `DELETE FROM message_reactions
       WHERE message_key = ?`,
      [currentMessageKey],
    )
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}

export const loadFolders = async () => {
  const db = await getDatabase()
  await migrateRootFolderData(db)

  return db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     WHERE path <> ''
     ORDER BY path ASC, id ASC`,
  )
}

const migrateRootFolderData = async (db) => {
  const roots = await db.select(
    `SELECT id
     FROM folders
     WHERE path = ''
     LIMIT 1`,
  )
  const root = roots[0]

  if (!root) return

  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute(
    `UPDATE folders
     SET parent_id = NULL, updated_at = ?
     WHERE parent_id = ?`,
    [updatedAt, root.id],
  )

  const rootMessageCounts = await db.select(
    `SELECT COUNT(*) AS count
     FROM messages
     WHERE folder_id = ?`,
    [root.id],
  )
  const rootMessageCount = Number(rootMessageCounts[0]?.count ?? 0)

  if (rootMessageCount === 0) return

  const settings = await db.select('SELECT value FROM settings WHERE key = ?', [
    MARKDOWN_EXPORT_PATH_KEY,
  ])
  const projectPath = settings[0]?.value?.trim() ?? ''

  if (!projectPath) return

  await db.execute(
    `INSERT OR IGNORE INTO folders
       (name, parent_id, path, markdown_export_path, icon_path, created_at, updated_at)
     VALUES (?, NULL, ?, ?, NULL, ?, ?)`,
    [getPathBaseName(projectPath), projectPath, projectPath, updatedAt, updatedAt],
  )

  const targetFolders = await db.select(
    `SELECT id
     FROM folders
     WHERE path = ?
     LIMIT 1`,
    [projectPath],
  )
  const targetFolder = targetFolders[0]

  if (!targetFolder) return

  await db.execute(
    `UPDATE messages
     SET folder_id = ?, updated_at = ?
     WHERE folder_id = ?`,
    [targetFolder.id, updatedAt, root.id],
  )
}

export const registerProject = async ({ directoryPath, displayName = '', iconPath = '' }) => {
  const db = await getDatabase()
  const normalizedDirectoryPath = directoryPath.trim()
  const projectName = displayName.trim() || getPathBaseName(normalizedDirectoryPath)
  const normalizedIconPath = iconPath.trim() || null
  const createdAt = formatLocalTimestamp(new Date())

  if (!normalizedDirectoryPath) return null

  await db.execute(
    `INSERT OR IGNORE INTO folders
       (name, parent_id, path, markdown_export_path, icon_path, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [
      projectName,
      normalizedDirectoryPath,
      normalizedDirectoryPath,
      normalizedIconPath,
      createdAt,
      createdAt,
    ],
  )

  const rows = await db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     WHERE path = ?
     LIMIT 1`,
    [normalizedDirectoryPath],
  )

  return rows[0] ?? null
}

export const saveProjectDisplayName = async (folderId, displayName) => {
  const db = await getDatabase()
  const folderName = displayName.trim()
  const updatedAt = formatLocalTimestamp(new Date())

  if (!folderName) return null

  await db.execute(
    `UPDATE folders
     SET name = ?, updated_at = ?
     WHERE id = ?`,
    [folderName, updatedAt, folderId],
  )

  const rows = await db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     WHERE id = ?
     LIMIT 1`,
    [folderId],
  )

  return rows[0] ?? null
}

export const loadFolderNotes = async ({ folderId = null } = {}) => {
  const db = await getDatabase()
  const params = []
  let whereClause = ''

  if (folderId !== null) {
    whereClause = 'WHERE folder_id = ?'
    params.push(folderId)
  }

  return db.select(
    `SELECT COALESCE(note_path, strftime('%Y-%m-%d.md', created_at)) AS path,
            COUNT(*) AS messageCount,
            MAX(created_at) AS updatedAt
     FROM messages
     ${whereClause}
     GROUP BY COALESCE(note_path, strftime('%Y-%m-%d.md', created_at))
     ORDER BY updatedAt DESC, path ASC`,
    params,
  )
}

export const loadMarkdownExportPath = async () => {
  return loadSetting(MARKDOWN_EXPORT_PATH_KEY, '')
}

export const loadAppTitle = async () => {
  return loadSetting(APP_TITLE_KEY, DEFAULT_APP_TITLE)
}

export const loadSetting = async (key, fallbackValue = '') => {
  const db = await getDatabase()
  const rows = await db.select('SELECT value FROM settings WHERE key = ?', [key])

  return rows[0]?.value ?? fallbackValue
}

export const saveSetting = async (key, value) => {
  const db = await getDatabase()
  const updatedAt = new Date().toISOString()
  await db.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [key, String(value ?? ''), updatedAt],
  )
}

export const saveMarkdownExportPath = async (path) => {
  await saveSetting(MARKDOWN_EXPORT_PATH_KEY, path.trim())
}

export const saveAppTitle = async (title) => {
  const value = title.trim() || DEFAULT_APP_TITLE

  await saveSetting(APP_TITLE_KEY, value)
}

export const createFolder = async (name, parentFolder = null, iconPath = '') => {
  const db = await getDatabase()
  const folderName = name.trim().replaceAll('/', '-')
  const normalizedIconPath = iconPath.trim() || null

  if (!folderName) return null

  const createdAt = formatLocalTimestamp(new Date())
  const path = parentFolder?.path ? `${parentFolder.path}/${folderName}` : folderName

  await db.execute(
    `INSERT INTO folders (name, parent_id, path, markdown_export_path, icon_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [folderName, parentFolder?.id ?? null, path, path, normalizedIconPath, createdAt, createdAt],
  )

  const rows = await db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     WHERE path = ?
     ORDER BY id DESC
     LIMIT 1`,
    [path],
  )

  return rows[0] ?? null
}

export const renameFolder = async (folder, name) => {
  const db = await getDatabase()
  const folderName = name.trim().replaceAll('/', '-')

  if (!folderName || !folder) return null

  const updatedAt = formatLocalTimestamp(new Date())
  const pathParts = folder.path.split('/')
  pathParts[pathParts.length - 1] = folderName
  const nextPath = pathParts.join('/')

  const rows = await db.select(
    `SELECT id, name, path, markdown_export_path AS markdownExportPath
     FROM folders
     WHERE path = ? OR path LIKE ?
     ORDER BY path ASC`,
    [folder.path, `${folder.path}/%`],
  )

  await db.execute('BEGIN')

  try {
    for (const row of rows) {
      const pathSuffix = row.path === folder.path ? '' : row.path.slice(folder.path.length)
      const exportPathSuffix = row.markdownExportPath.startsWith(folder.markdownExportPath)
        ? row.markdownExportPath.slice(folder.markdownExportPath.length)
        : pathSuffix

      await db.execute(
        `UPDATE folders
         SET name = ?, path = ?, markdown_export_path = ?, updated_at = ?
         WHERE id = ?`,
        [
          row.id === folder.id ? folderName : row.name,
          `${nextPath}${pathSuffix}`,
          `${nextPath}${exportPathSuffix}`,
          updatedAt,
          row.id,
        ],
      )
    }

    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }

  const renamedRows = await db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     WHERE id = ?
     LIMIT 1`,
    [folder.id],
  )

  return renamedRows[0] ?? null
}

export const saveFolderIconPath = async (folderId, iconPath) => {
  const db = await getDatabase()
  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute(
    `UPDATE folders
     SET icon_path = ?, updated_at = ?
     WHERE id = ?`,
    [iconPath, updatedAt, folderId],
  )
}

export const saveFolderMarkdownExportPath = async (folderId, markdownExportPath) => {
  const db = await getDatabase()
  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute(
    `UPDATE folders
     SET markdown_export_path = ?, updated_at = ?
     WHERE id = ?`,
    [markdownExportPath.trim(), updatedAt, folderId],
  )
}

export const deleteFolder = async (folderId) => {
  const db = await getDatabase()
  const folders = await db.select(
    `SELECT id, path
     FROM folders
     WHERE id = ?
     LIMIT 1`,
    [folderId],
  )
  const folder = folders[0]

  if (!folder) return []

  const folderIds = [folder.id]
  let pendingFolderIds = [folder.id]

  while (pendingFolderIds.length > 0) {
    const placeholders = pendingFolderIds.map(() => '?').join(', ')
    const childFolders = await db.select(
      `SELECT id
       FROM folders
       WHERE parent_id IN (${placeholders})`,
      pendingFolderIds,
    )

    pendingFolderIds = childFolders.map((row) => row.id)
    folderIds.push(...pendingFolderIds)
  }

  const placeholders = folderIds.map(() => '?').join(', ')

  await db.execute('BEGIN')

  try {
    await db.execute(`DELETE FROM message_reactions WHERE folder_id IN (${placeholders})`, folderIds)
    await db.execute(`DELETE FROM messages WHERE folder_id IN (${placeholders})`, folderIds)
    await db.execute(`DELETE FROM folders WHERE id IN (${placeholders})`, folderIds)
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }

  return folderIds
}

export const createMessage = async (content, { folderId = null, notePath = null } = {}) => {
  const db = await getDatabase()
  const createdAt = formatLocalTimestamp(new Date())

  await db.execute(
    `INSERT INTO messages (content, note_path, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [content, notePath, folderId, createdAt, createdAt],
  )

  const rows = await db.select(
    `SELECT id, content, note_path, folder_id, markdown_synced, created_at, updated_at
     FROM messages
     WHERE content = ? AND created_at = ?
     ORDER BY id DESC
     LIMIT 1`,
    [content, createdAt],
  )

  return rows[0]
}

export const syncMarkdownMessages = async ({ folderId, notePath, messages }) => {
  const db = await getDatabase()
  const syncedAt = formatLocalTimestamp(new Date())
  const normalizedMessages = messages.map((message, index) => ({
    content: message.content,
    createdAt: formatParsedMessageTimestamp(message, index),
  }))

  await db.execute('BEGIN')

  try {
    await db.execute(
      `DELETE FROM messages
       WHERE folder_id = ?
         AND COALESCE(note_path, strftime('%Y-%m-%d.md', created_at)) = ?`,
      [folderId, notePath],
    )

    for (const message of normalizedMessages) {
      await db.execute(
        `INSERT INTO messages
           (content, note_path, folder_id, markdown_synced, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [message.content, notePath, folderId, message.createdAt, syncedAt],
      )
    }

    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}

export const clearMarkdownMessages = async ({ folderId, notePath }) => {
  const db = await getDatabase()

  await db.execute('BEGIN')

  try {
    await db.execute(
      `DELETE FROM messages
       WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
      [folderId, notePath],
    )
    await db.execute(
      `DELETE FROM message_reactions
       WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
      [folderId, notePath],
    )
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}

export const updateMarkdownMessagePath = async ({ folderId, currentNotePath, nextNotePath }) => {
  const db = await getDatabase()
  const updatedAt = formatLocalTimestamp(new Date())

  await db.execute('BEGIN')

  try {
    await db.execute(
      `UPDATE messages
       SET note_path = ?, updated_at = ?
       WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
      [nextNotePath, updatedAt, folderId, currentNotePath],
    )

    const reactionRows = await db.select(
      `SELECT message_key AS messageKey, reaction_type AS reactionType
       FROM message_reactions
       WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
      [folderId, currentNotePath],
    )

    for (const row of reactionRows) {
      const keyParts = row.messageKey.split(MESSAGE_KEY_SEPARATOR)
      const notePathIndex = keyParts[0] === 'v2' ? 2 : 1

      if (keyParts[notePathIndex] !== currentNotePath) {
        await db.execute(
          `UPDATE message_reactions
           SET note_path = ?, updated_at = ?
           WHERE message_key = ? AND reaction_type = ?`,
          [nextNotePath, updatedAt, row.messageKey, row.reactionType],
        )
        continue
      }

      keyParts[notePathIndex] = nextNotePath
      if (keyParts[0] === 'v2' && keyParts[3]?.startsWith(`${currentNotePath}:`)) {
        keyParts[3] = `markdown:${keyParts[3].slice(currentNotePath.length + 1)}`
      }
      const nextMessageKey = keyParts.join(MESSAGE_KEY_SEPARATOR)

      await db.execute(
        `INSERT INTO message_reactions
           (message_key, folder_id, note_path, reaction_type, selected, created_at, updated_at)
         SELECT ?, folder_id, ?, reaction_type, selected, created_at, ?
         FROM message_reactions
         WHERE message_key = ? AND reaction_type = ?
         ON CONFLICT(message_key, reaction_type) DO UPDATE SET
           folder_id = excluded.folder_id,
           note_path = excluded.note_path,
           selected = excluded.selected,
           updated_at = excluded.updated_at`,
        [nextMessageKey, nextNotePath, updatedAt, row.messageKey, row.reactionType],
      )
      await db.execute(
        `DELETE FROM message_reactions
         WHERE message_key = ? AND reaction_type = ?`,
        [row.messageKey, row.reactionType],
      )
    }

    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}

export const exportMessagesToMarkdown = async (messages, exportDir = '') => {
  const result = await invoke('export_messages_to_markdown', {
    exportDir: exportDir.trim() || null,
    messages: messages.map((message) => ({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
    })),
  })

  const db = await getDatabase()

  const messagesByDate = messages.reduce((groups, message) => {
    const date = message.created_at.slice(0, 10)

    if (!groups.has(date)) {
      groups.set(date, [])
    }

    groups.get(date).push(message.id)
    return groups
  }, new Map())

  await Promise.all(
    result.files.flatMap((file) => {
      const ids = messagesByDate.get(file.date) ?? []

      return ids.map((id) =>
        db.execute(
          `UPDATE messages
           SET note_path = ?, markdown_synced = 1, updated_at = ?
           WHERE id = ?`,
          [file.path, new Date().toISOString(), id],
        ),
      )
    }),
  )

  return result
}

const formatLocalTimestamp = (date) => {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const formatParsedMessageTimestamp = (message, index) => {
  const date = isDateText(message.date) ? message.date : formatLocalDate(new Date())
  const time = isTimeText(message.time) ? message.time : '00:00'
  const seconds = String(index % 60).padStart(2, '0')

  return `${date}T${time}:${seconds}`
}

const formatLocalDate = (date) => {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
}

const isDateText = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')

const isTimeText = (value) => /^\d{2}:\d{2}$/.test(value ?? '')

const getPathBaseName = (path) => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}
