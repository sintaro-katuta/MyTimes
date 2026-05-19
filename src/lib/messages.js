import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const DATABASE_URL = 'sqlite:mytimes.db'
const MARKDOWN_EXPORT_PATH_KEY = 'markdown_export_path'

let databasePromise

const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL)
  }

  return databasePromise
}

export const loadMessages = async () => {
  const db = await getDatabase()

  return db.select(
    `SELECT id, content, note_path, markdown_synced, created_at, updated_at
     FROM messages
     ORDER BY created_at ASC, id ASC`,
  )
}

export const loadMarkdownExportPath = async () => {
  const db = await getDatabase()
  const rows = await db.select('SELECT value FROM settings WHERE key = ?', [
    MARKDOWN_EXPORT_PATH_KEY,
  ])

  return rows[0]?.value ?? ''
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

export const createMessage = async (content) => {
  const db = await getDatabase()
  const createdAt = formatLocalTimestamp(new Date())

  await db.execute(
    `INSERT INTO messages (content, created_at, updated_at)
     VALUES (?, ?, ?)`,
    [content, createdAt, createdAt],
  )

  const rows = await db.select(
    `SELECT id, content, note_path, markdown_synced, created_at, updated_at
     FROM messages
     WHERE content = ? AND created_at = ?
     ORDER BY id DESC
     LIMIT 1`,
    [content, createdAt],
  )

  return rows[0]
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

  await Promise.all(
    result.files.map((file) =>
      db.execute(
        `UPDATE messages
         SET note_path = ?, markdown_synced = 1, updated_at = ?
         WHERE substr(created_at, 1, 10) = ?`,
        [file.path, new Date().toISOString(), file.date],
      ),
    ),
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
