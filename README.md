<div align="center">
  <img src="public/icon.png" alt="MyTimes" width="128" height="128">
  <h1>MyTimes</h1>
  <p>
    作業中の思考は、あとから一番ほしくなるのに、一番残りにくい。<br>
    MyTimes は、実装中の判断、詰まり、試行錯誤をチャット感覚で Markdown に残すローカル分報アプリです。
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
    <a href="#mytimes-が解決すること">解決すること</a>
    ·
    <a href="#インストール">インストール</a>
    ·
    <a href="#使い方">使い方</a>
    ·
    <a href="#開発">開発</a>
  </p>
</div>

## MyTimes とは

MyTimes は、エンジニアや個人開発者が作業中の考え、詰まったこと、判断の理由、あとで拾いたいメモをすばやく残すための個人用タイムラインです。

日報、PR、振り返りを書くときに「何を考えていたか」を探さなくてよくなります。作業の流れ、迷った理由、あとで試したいことが、時系列の Markdown として残ります。

書いた内容はローカルの Markdown ファイルに保存されます。アプリを使わなくなっても、記録は自分のフォルダーに残ります。

![MyTimes のチャット形式タイムライン](docs/images/usage-chat.png)

## MyTimes が解決すること

### ちゃんと書こうとして、何も残らない

Obsidian や通常の Markdown エディタは自由度が高い一方で、開いた瞬間に「タイトルをどうするか」「どこに置くか」「きれいにまとめるか」を考えがちです。MyTimes はその手前の、まだ整っていない思考をチャットとして受け止めます。

### 作業後に、判断の理由を思い出せない

バグ修正、設計変更、ライブラリ選定、調査の途中で考えたことは、数時間後にはかなり抜け落ちます。MyTimes に残しておけば、あとから PR 説明、日報、週次の振り返りにそのまま使えます。

### メモがアプリの中に閉じ込められる

MyTimes の記録はローカルの Markdown ファイルです。Obsidian、VS Code、Git、任意の同期サービスと組み合わせられます。サービスに依存せず、自分のファイルとして扱えます。

## 使いたくなる瞬間

- 実装中に「なぜこの方針にしたか」を残したい
- 調査中に見つけたリンク、仮説、次に試すことを流れるように残したい
- Slack や SNS には出さない個人分報がほしい
- 日報や PR 説明を書く前に、作業ログを拾える状態にしたい
- Obsidian や VS Code で管理している Markdown フォルダーへ、そのまま記録を積み上げたい

## MyTimes でできること

### チャット感覚で書ける

入力欄から送信するだけで、選択中の Markdown ファイルに時刻付きで追記されます。タイトル、見出し、置き場所を決める前に、まず記録できます。

![チャット投稿画面](docs/images/usage-chat.png)

### Markdown として残る

投稿は独自のデータベースだけに閉じ込めず、ローカルの Markdown ファイルに保存します。既存の Markdown フォルダーを登録して、普段のエディタや Obsidian と一緒に使えます。

### ノートを直接編集できる

チャット表示だけでなく、Markdown ファイル全体を直接編集できます。散らばったログをあとから日報、PR メモ、振り返りに整えるときも、別アプリに移らずに直せます。

![Markdown 編集画面](docs/images/usage-markdown.png)

### プロジェクトごとに分けられる

仕事、個人開発、学習、生活ログなど、保存先フォルダーをプロジェクトとして登録できます。プロジェクトごとに表示名やアイコンも設定できます。

![プロジェクト登録画面](docs/images/usage-project.png)

## MyTimes がやらないこと

v1 では、チーム共有、クラウド同期、公開タイムライン、AI 要約を主目的にしていません。まずは、自分の作業と思考を失わずに残すことに集中しています。

## インストール

[GitHub Releases](https://github.com/sintaro-katuta/MyTimes/releases) から、利用している OS に合う配布ファイルをダウンロードします。

| OS | ダウンロードするファイルの目安 |
| --- | --- |
| macOS | `.dmg` または `.app.tar.gz` |
| Windows | `.msi` または `.exe` |
| Linux | `.AppImage`、`.deb`、`.rpm` など |

1. 最新リリースの Assets を開く
2. 利用環境に合うファイルをダウンロードする
3. ダウンロードしたファイルを開き、OS の案内に沿ってインストールする
4. 初回起動時にセキュリティ警告が表示された場合は、信頼できるアプリとして実行を許可する

実際に利用できる OS と配布形式は、各リリースの Assets に含まれるファイルを確認してください。

## 使い方

### 1. プロジェクトを登録する

Markdown を保存するローカルフォルダーを選びます。既存の Markdown フォルダーでも、新しく用意した空のフォルダーでも使えます。

### 2. ノートを選ぶ、または作る

登録したフォルダー内の Markdown ファイルが一覧に表示されます。作業ログ用、日記用、プロジェクト用など、用途に合わせてノートを選びます。

### 3. 入力欄から投稿する

画面下部の入力欄に書いて送信すると、選択中の Markdown ファイルに追記されます。ノートを選んでいない状態では、当日の Markdown ファイルを作成して投稿できます。

### 4. 必要なときだけ Markdown を整える

記録をあとから整理したいときは、表示を `Markdown` に切り替えて全文を編集できます。

## データの扱い

MyTimes はローカルファーストなデスクトップアプリです。記録の本体は、ユーザーが選んだフォルダー内の Markdown ファイルに保存されます。

設定、表示用キャッシュ、リアクションなどの補助情報には SQLite を使います。Markdown ファイル自体は手元に残るため、他のエディタで開いたり、Git で管理したり、Obsidian の vault に入れたりできます。

## 開発

### 技術スタック

| Vue 3 | Tauri v2 | Rust | SQLite | Vite |
| --- | --- | --- | --- | --- |
| <img src="public/tech/vue.svg" alt="Vue 3" width="56" height="56"> | <img src="public/tech/tauri.svg" alt="Tauri v2" width="56" height="56"> | <img src="public/tech/rust.svg" alt="Rust" width="56" height="56"> | <img src="public/tech/sqlite.svg" alt="SQLite" width="56" height="56"> | <img src="public/tech/vite.svg" alt="Vite" width="56" height="56"> |

UI は Vue 3 / Vite、ローカルファイル操作とアプリ機能は Tauri v2 / Rust、設定や表示用キャッシュは SQLite を使います。

### ローカル起動

```sh
npm ci
npm run tauri:dev
```

### 確認コマンド

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```

v1 公開前の動作、品質、公開手順の確認項目は [公開前チェックリスト](docs/pre-release-checklist.md) にまとめています。
