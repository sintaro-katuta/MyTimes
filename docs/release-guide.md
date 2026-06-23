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

## updater 署名キーを更新する

updater 署名キーは、秘密鍵、秘密鍵パスワード、公開鍵の 3 つで管理します。
秘密鍵とパスワードは GitHub Secrets またはローカルの `.env.local` で管理し、`src-tauri/tauri.conf.json` には公開鍵だけを記録します。

### 注意点

公開済みバージョンがある場合、既存アプリはその時点で埋め込まれている公開鍵で updater 成果物を検証します。
そのため、公開後に署名キーを変更する場合は、次の順序にします。

1. 旧秘密鍵で署名した中継リリースを作る
2. その中継リリースの `src-tauri/tauri.conf.json` に新しい公開鍵を入れる
3. 次回以降のリリースを新しい秘密鍵で署名する

まだ公開前で既存利用者がいない場合は、秘密鍵、GitHub Secrets、`pubkey` を同時に差し替えて問題ありません。

### スクリプトで新しい署名キーを生成する

```sh
TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<password>' \
  npm run signing:update -- --key-path "$HOME/.tauri/mytimes.key"
```

このスクリプトは次をまとめて行います。

- `npm run tauri -- signer generate` で秘密鍵を生成する
- 出力された公開鍵を読み取る
- `src-tauri/tauri.conf.json` の `plugins.updater.pubkey` を更新する
- GitHub Secrets 更新用のコマンド例を表示する

既存の秘密鍵ファイルを上書きする場合は `--force` を付けます。

```sh
TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<password>' \
  npm run signing:update -- --key-path "$HOME/.tauri/mytimes.key" --force
```

公開鍵だけを差し替える場合は `--public-key` を使います。

```sh
npm run signing:update -- --public-key "生成された公開鍵の文字列"
```

`pubkey` には環境変数名や秘密鍵ファイルのパスではなく、公開鍵の文字列そのものを書きます。

### ローカルで署名キーを読み込む

ローカルでは `.env.local` に秘密鍵ファイルのパスとパスワードを置きます。
`.env.local` はコミットしません。

```sh
TAURI_SIGNING_PRIVATE_KEY_PATH=/Users/sintaro.katuta/.tauri/mytimes.key
TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<password>'
```

読み込んでから build します。

```sh
set -a
source .env.local
set +a

npm run tauri -- build --verbose
```

### GitHub Secrets を更新する

GitHub Secrets には次の 2 つを設定します。

- `TAURI_SIGNING_PRIVATE_KEY`: 秘密鍵ファイルの中身
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 秘密鍵生成時に設定したパスワード

秘密鍵ファイルの中身は次で確認します。

```sh
cat "$HOME/.tauri/mytimes.key"
```

表示された全文を `TAURI_SIGNING_PRIVATE_KEY` に登録します。
パスワードは後から復元できないため、分からない場合は鍵を作り直します。

GitHub CLI で更新する場合は、`GITHUB_TOKEN` 環境変数を使わず keyring 認証を使います。

```sh
env -u GITHUB_TOKEN gh secret set TAURI_SIGNING_PRIVATE_KEY --repo sintaro-katuta/MyTimes < "$HOME/.tauri/mytimes.key"
printf %s "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | env -u GITHUB_TOKEN gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo sintaro-katuta/MyTimes
```

### 手動で updater archive を署名する

通常は `npm run tauri -- build --verbose` が updater 成果物を自動署名します。
手動で署名する場合は次を使います。

```sh
npm run tauri -- signer sign \
  --private-key-path "$HOME/.tauri/mytimes.key" \
  --password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" \
  src-tauri/target/release/bundle/macos/MyTimes.app.tar.gz
```

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
