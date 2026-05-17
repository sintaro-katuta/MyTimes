<script setup>
import { onMounted, ref } from 'vue'
import Database from '@tauri-apps/plugin-sql'

const status = ref('checking')
const detail = ref('DB接続を確認中')

const checkDatabaseConnection = async () => {
  try {
    const db = await Database.load('sqlite:mytimes.db')
    const checkedAt = new Date().toISOString()

    await db.execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      ['db_connection_check', checkedAt, checkedAt],
    )

    const rows = await db.select('SELECT value FROM settings WHERE key = ?', [
      'db_connection_check',
    ])

    status.value = rows.length > 0 ? 'connected' : 'error'
    detail.value = rows.length > 0 ? `DB接続済み ${rows[0].value}` : 'DBの読み戻しに失敗'
  } catch (error) {
    status.value = 'error'
    detail.value = error instanceof Error ? error.message : 'DB接続に失敗'
  }
}

onMounted(() => {
  checkDatabaseConnection()
})
</script>

<template>
  <div class="database-status" :class="`is-${status}`" :title="detail">
    <span class="status-dot" />
    <span class="status-label">
      {{ status === 'connected' ? 'DB接続済み' : status === 'error' ? 'DB接続エラー' : 'DB確認中' }}
    </span>
  </div>
</template>

<style scoped>
.database-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  height: 36px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--surface-panel);
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--icon-muted);
}

.is-connected .status-dot {
  background: var(--bg-success);
}

.is-error .status-dot {
  background: var(--bg-error);
}

.status-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
