import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const DATABASE_URL = 'sqlite:mytimes.db'
const MARKDOWN_EXPORT_PATH_KEY = 'markdown_export_path'
const APP_TITLE_KEY = 'app_title'
const DEFAULT_APP_TITLE = 'デイリー分報'

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

  if (folderId !== null) {
    conditions.push('folder_id = ?')
    params.push(folderId)
  }

  if (notePath !== null) {
    conditions.push("COALESCE(note_path, strftime('%Y-%m-%d.md', created_at)) = ?")
    params.push(notePath)
  }

  if (folderId === null && notePath === null) {
    conditions.push('(folder_id IS NULL OR markdown_synced = 0)')
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

export const loadFolders = async () => {
  const db = await getDatabase()

  return db.select(
    `SELECT id, name, parent_id AS parentId, path, markdown_export_path AS markdownExportPath,
            icon_path AS iconPath
     FROM folders
     ORDER BY path ASC, id ASC`,
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
  const db = await getDatabase()
  const rows = await db.select('SELECT value FROM settings WHERE key = ?', [
    MARKDOWN_EXPORT_PATH_KEY,
  ])

  return rows[0]?.value ?? ''
}

export const loadAppTitle = async () => {
  const db = await getDatabase()
  const rows = await db.select('SELECT value FROM settings WHERE key = ?', [APP_TITLE_KEY])

  return rows[0]?.value || DEFAULT_APP_TITLE
}

export const saveMarkdownExportPath = async (path) => {
  const db = await getDatabase()
  const updatedAt = new Date().toISOString()

  await db.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [MARKDOWN_EXPORT_PATH_KEY, path.trim(), updatedAt],
  )
}

export const saveAppTitle = async (title) => {
  const db = await getDatabase()
  const updatedAt = new Date().toISOString()
  const value = title.trim() || DEFAULT_APP_TITLE

  await db.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [APP_TITLE_KEY, value, updatedAt],
  )
}

export const createFolder = async (name, parentFolder = null, iconPath = '') => {
  const db = await getDatabase()
  const folderName = name.trim().replaceAll('/', '-')
  const normalizedIconPath = iconPath.trim() || null

  if (!folderName) return null

  const createdAt = formatLocalTimestamp(new Date())
  const path = parentFolder ? `${parentFolder.path}/${folderName}` : folderName

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
       WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
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

  await db.execute(
    `DELETE FROM messages
     WHERE folder_id = ? AND COALESCE(note_path, '') = ?`,
    [folderId, notePath],
  )
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
