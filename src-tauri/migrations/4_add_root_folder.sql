INSERT OR IGNORE INTO folders
  (name, parent_id, path, markdown_export_path, icon_path, created_at, updated_at)
VALUES
  ('ルート', NULL, '', '', NULL, datetime('now'), datetime('now'));

UPDATE messages
SET
  folder_id = (SELECT id FROM folders WHERE path = '' LIMIT 1),
  updated_at = datetime('now')
WHERE folder_id IS NULL;
