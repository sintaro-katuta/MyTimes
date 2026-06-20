<div align="center">
  <img src="public/icon.png" alt="MyTimes" width="128" height="128">
  <h1>MyTimes</h1>
  <p>
    思考や作業ログを、チャット感覚で Markdown に残すローカルファーストなデスクトップアプリです。
  </p>
  <p>
    <a href="https://github.com/sintaro-katuta/MyTimes/releases">
      <img src="https://img.shields.io/github/v/release/sintaro-katuta/MyTimes?label=release" alt="Release">
    </a>
    <a href="https://github.com/sintaro-katuta/MyTimes/actions/workflows/build.yml">
      <img src="https://github.com/sintaro-katuta/MyTimes/actions/workflows/build.yml/badge.svg" alt="Build">
    </a>
  </p>
  <p>
    <a href="#技術スタック">技術スタック</a>
    ·
    <a href="#インストール方法">インストール</a>
    ·
    <a href="#使い方">使い方</a>
  </p>
</div>

## 技術スタック

| Vue 3                                                              | Tauri v2                                                                | Rust                                                               | SQLite                                                                 | Vite                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| <img src="public/tech/vue.svg" alt="Vue 3" width="56" height="56"> | <img src="public/tech/tauri.svg" alt="Tauri v2" width="56" height="56"> | <img src="public/tech/rust.svg" alt="Rust" width="56" height="56"> | <img src="public/tech/sqlite.svg" alt="SQLite" width="56" height="56"> | <img src="public/tech/vite.svg" alt="Vite" width="56" height="56"> |

MyTimes は Vue 3 と Tauri v2 で構成しています。UI は Vue 3 / Vite、ローカルファイル操作とアプリ機能は Tauri v2 / Rust、設定や表示用キャッシュは SQLite を使います。

## インストール方法

[GitHub Releases](https://github.com/sintaro-katuta/MyTimes/releases) から、利用している OS に合う配布ファイルをダウンロードします。

| OS | ダウンロードするファイルの目安 |
| --- | --- |
| macOS | `.dmg` または `.app.tar.gz` |
| Windows | `.msi` または `.exe` |
| Linux | `.AppImage`、`.deb`、`.rpm` など |

1. 最新リリースの Assets を確認する
2. 利用環境に合うファイルをダウンロードする
3. ダウンロードしたファイルを開き、OS の案内に沿ってインストールする
4. 初回起動時にセキュリティ警告が表示された場合は、信頼できるアプリとして実行を許可する

実際に利用できる OS と配布形式は、各リリースの Assets に含まれるファイルを確認してください。

リリース成果物がまだ公開されていない場合は、ローカルで起動して確認できます。

```sh
npm ci
npm run tauri:dev
```

v1 公開前の動作、品質、公開手順の確認項目は [公開前チェックリスト](docs/pre-release-checklist.md) にまとめています。

## 使い方

### プロジェクトを登録する

Markdown を保存するローカルフォルダーを選び、必要に応じて表示名やアイコン画像を設定します。

![プロジェクト登録画面](docs/images/usage-project.png)

### チャット感覚で Markdown に残す

ノートを選び、画面下部の入力欄から投稿します。投稿内容は選択中の Markdown ファイルに追記されます。

![チャット投稿画面](docs/images/usage-chat.png)

### Markdown を直接編集する

ノート上部の表示切り替えで `Markdown` を選ぶと、Markdown ファイル全体を直接編集できます。

![Markdown 編集画面](docs/images/usage-markdown.png)

README 用スクリーンショットは次のコマンドで再生成できます。

```sh
npm run capture:readme
```
