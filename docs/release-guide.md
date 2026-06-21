# リリース手順

MyTimes の GitHub Release を作成するための手順です。
リリース成果物は GitHub Actions の `Release` workflow で生成します。

## 前提

- リリース対象の変更が `main` に取り込まれている
- `main` の `Build` workflow が成功している
- GitHub Secrets に次の値が設定されている
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 公開前の動作確認は [公開前チェックリスト](pre-release-checklist.md) に沿って完了している

## バージョンを更新する

アプリのバージョンは `package.json` を基準にします。
`npm version` を使うと、`src-tauri/tauri.conf.json` と `src-tauri/Cargo.toml` も自動で同期されます。

```sh
npm version patch
```

マイナー、メジャー更新の場合は次を使います。

```sh
npm version minor
npm version major
```

特定のバージョンにしたい場合は、明示的に指定します。

```sh
npm version 0.2.0
```

`npm version` 後に、次のファイルが同じバージョンになっていることを確認します。

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

同期状態は次のコマンドでも確認できます。

```sh
npm run check:version
```

## リリース前確認を実行する

タグを push する前に、最低限次のコマンドが成功していることを確認します。

```sh
npm run check:version
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```

公開候補をローカルで確認する場合は、署名キーを読み込んだ状態で Tauri の production build も実行します。

```sh
export TAURI_SIGNING_PRIVATE_KEY='<private key>'
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<password>'
npm run tauri -- build --verbose
```

署名キーをローカルに置かない場合は、GitHub Secrets が渡る Release workflow で production build を確認します。

## 変更を push する

`npm version` はバージョン更新 commit と tag を作成します。
まず commit を push し、その後 tag を push します。

```sh
git push origin main
git push origin v0.1.1
```

タグ名は、作成されたバージョンに合わせて読み替えてください。
Release workflow の `tagName` は `v__VERSION__` なので、アプリバージョンと同じ `vX.Y.Z` の Release が作成または更新されます。

## Release workflow を確認する

`v*` 形式の tag が push されると、`.github/workflows/release.yml` の `Release` workflow が実行されます。

Release workflow は次の成果物を作成します。

- macOS aarch64
- macOS x86_64
- Windows
- Linux
- アプリ内アップデート用の `latest.json`
- 署名付き updater 成果物

Release workflow は matrix の各ジョブで draft Release に成果物をアップロードし、全 matrix が成功したあとに `Publish release` ジョブで Release を公開します。
GitHub Actions で全 matrix と `Publish release` が成功していることを確認します。

## GitHub Release を確認する

Release workflow 完了後、GitHub Releases で次を確認します。

- Release title が対象バージョンになっている
- Release notes に公開内容と既知の制限が書かれている
- OS ごとの配布ファイルが添付されている
- `latest.json` が添付されている
- 署名ファイルと updater 用アーカイブが添付されている

必要に応じて Release notes を編集します。

## アップデート確認

既存バージョンをインストール済みの環境で、アプリの設定画面からアップデート確認を実行します。

確認すること:

- アップデートが検出される
- ダウンロードとインストールが完了する
- 再起動後に新しいバージョンが起動する
- 既存の Markdown プロジェクトと設定が保持されている

## トラブルシュート

### バージョンがずれている

次のコマンドで `package.json` の version を基準に同期します。

```sh
npm run sync:version
```

同期後、変更されたファイルを commit します。

### Release workflow が署名で失敗する

GitHub Secrets に次の値が設定されているか確認します。

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### macOS の target build が失敗する

`.github/workflows/release.yml` の macOS matrix で `args: --target ...` が Tauri CLI の build option として渡っているか確認します。
`tauriScript` には `npm run tauri` を指定し、`npm run tauri --` にはしません。
