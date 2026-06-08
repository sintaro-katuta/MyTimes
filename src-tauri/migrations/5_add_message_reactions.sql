CREATE TABLE IF NOT EXISTS message_reactions (
  message_key TEXT NOT NULL,
  folder_id INTEGER,
  note_path TEXT,
  reaction_type TEXT NOT NULL,
  selected INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (message_key, reaction_type),
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_folder_note
  ON message_reactions (folder_id, note_path);
