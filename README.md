# MyTimes

Vue 3 と Tauri で作るローカルメッセージアプリです。

## DB

ローカル DB は `@tauri-apps/plugin-sql` の SQLite 接続を使います。

- 接続名: `sqlite:mytimes.db`
- SQL プラグイン初期化: `src-tauri/src/lib.rs`
- マイグレーション: `src-tauri/migrations/1_create_initial_tables.sql`
- 権限設定: `src-tauri/capabilities/default.json`

`messages` テーブルは Tauri 起動時のマイグレーションで作成されます。フロントエンドからは `Database.load('sqlite:mytimes.db')` で同じ DB を読み込み、`SELECT` と `INSERT` を実行します。

## 開発

```bash
npm install
npm run tauri:dev
```

フロントエンドだけを確認する場合:

```bash
npm run dev
```

## 確認

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```
