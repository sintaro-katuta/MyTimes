# MyTimes

Vue 3 と Tauri で構成したデスクトップアプリケーションです。

## DB

ローカル DB は `@tauri-apps/plugin-sql` の SQLite 接続を使います。

- 接続名: `sqlite:mytimes.db`
- SQL プラグイン初期化: `src-tauri/src/lib.rs`
- マイグレーション: `src-tauri/migrations/1_create_initial_tables.sql`
- 権限設定: `src-tauri/capabilities/default.json`

`messages` と `folders` テーブルは Tauri 起動時のマイグレーションで作成されます。フロントエンドからは `Database.load('sqlite:mytimes.db')` で同じ DB を読み込み、`SELECT` と `INSERT` を実行します。

- `folders`: アプリ内の仮想フォルダツリーとMarkdownエクスポート先パスを保持します。
- `messages.folder_id`: メッセージが属するフォルダを保持します。

## 開発

```sh
npm ci
npm run tauri -- dev
```

フロントエンドだけを確認する場合:

```sh
npm run dev
```

## ビルド検証

ローカルでは以下のコマンドでビルド検証を行います。

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
npm run tauri -- build --verbose
```

GitHub Actions では `.github/workflows/build.yml` で同等の検証を実行します。

- Pull Request と push: `cargo fmt --check`、`cargo check`、`npm run build`
- `main` への push: 上記に加えて `npm run tauri -- build --verbose`

Tauri の bundle 作成は実行時間が長いため、PR では通常の Rust / frontend build までを確認し、`main` への取り込み後に macOS runner で bundle 作成まで確認します。
