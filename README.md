# MyTimes

Vue 3 と Tauri で構成したデスクトップアプリケーションです。

## 開発

```sh
npm ci
npm run tauri -- dev
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
