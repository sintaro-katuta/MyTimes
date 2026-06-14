# MyTimes

## アイコン

<img src="public/icon.svg" alt="MyTimes" width="96" height="96">

## 技術スタック

| Vue 3 | Tauri v2 | Rust | SQLite | Vite |
| --- | --- | --- | --- | --- |
| <img src="public/tech/vue.svg" alt="Vue 3" width="56" height="56"> | <img src="public/tech/tauri.svg" alt="Tauri v2" width="56" height="56"> | <img src="public/tech/rust.svg" alt="Rust" width="56" height="56"> | <img src="public/tech/sqlite.svg" alt="SQLite" width="56" height="56"> | <img src="public/tech/vite.svg" alt="Vite" width="56" height="56"> |

MyTimes は Vue 3 と Tauri v2 で構成したデスクトップアプリです。UI は Vue 3 / Vite、ローカルファイル操作とアプリ機能は Tauri v2 / Rust、設定や表示用キャッシュは SQLite を使います。

## インストール方法

GitHub Releases から、利用している OS に合う配布ファイルをダウンロードしてインストールします。

1. [Releases](https://github.com/sintaro-katuta/MyTimes/releases) を開く
2. 最新リリースの Assets を確認する
3. macOS、Windows、Linux のうち、利用環境に合うファイルをダウンロードする
4. ダウンロードしたファイルを開き、OS の案内に沿ってインストールする
5. 初回起動時に OS のセキュリティ警告が表示された場合は、信頼できるアプリとして実行を許可する

Tauri はクロスプラットフォームの配布に対応しているため、GitHub Release に各 OS 向けの成果物を置く運用で配布できます。実際に利用できる OS は、各リリースの Assets に含まれるファイルを確認してください。

## 使い方

### 1. プロジェクトを登録する

1. 左端の `+` ボタンを押す
2. `プロジェクトフォルダー` で Markdown を保存するローカルフォルダーを選ぶ
3. 必要に応じて表示名とアイコン画像を設定する
4. `登録` する

登録したフォルダーが MyTimes のプロジェクトです。プロジェクト配下の `.md` ファイルはノート一覧に表示されます。

### 2. ノートを作る、または選ぶ

- 既存の `.md` ファイルを開く場合は、ノート一覧から選択する
- 新しいノートを作る場合は、ノート一覧の `+` ボタンからファイル名を入力する
- 拡張子を省略した場合は `.md` が付与される
- `docs/daily.md` のように入力すると、プロジェクト配下にフォルダーを含むノートを作成できる

### 3. チャットとして投稿する

画面下部の入力欄に本文を書き、送信ボタンまたは Enter で投稿します。Shift + Enter で改行できます。

- ノートを選んでいる場合: 選択中の Markdown ファイルへ追記する
- プロジェクトだけを選んでいる場合: 当日の `YYYY-MM-DD.md` へ追記する。ファイルがなければ作成する

### 4. Markdown を直接編集する

ノートを選んだ状態で、上部の表示切り替えから `Markdown` を選ぶと本文を直接編集できます。

- `保存` で Markdown ファイル全体を保存する
- `破棄` で未保存の編集を開いた時点の内容へ戻す
- `再読み込み` でディスク上の最新内容を読み直す
- 設定で `Markdownを自動保存` を有効にすると、Markdown 表示中の変更を自動保存する
