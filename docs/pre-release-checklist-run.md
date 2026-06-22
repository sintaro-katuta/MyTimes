# 公開前チェック実施ログ

v1 公開前チェックリストの実施記録。
確認項目の詳細は [公開前チェックリスト](pre-release-checklist.md) を参照する。

## 実施情報

- 実施日: 2026-06-22
- 最終更新: 2026-06-23
- 対象 issue: MYT-36
- 対象ブランチ: MYT-36
- 対象バージョン: 0.1.0
- OS: macOS arm64
- Node.js: v25.8.1
- npm: 11.11.0
- cargo: 1.94.0
- rustc: 1.94.0

## コマンド確認

| コマンド | 結果 | メモ |
| --- | --- | --- |
| `npm ci` | 成功 | 依存関係のインストールは完了。 |
| `npm audit` | 要確認 | 全体では 10 vulnerabilities: 8 moderate, 2 high。runtime 依存のみでは 5 moderate。`picomatch` と `postcss` に no fix available の advisory あり。公開判断前に影響範囲を確認する。 |
| `npm run check:version` | 成功 | アプリバージョンは 0.1.0 で同期済み。 |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | 成功 | 2026-06-23 に再実行して成功。 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | 成功 | 2026-06-23 に再実行して成功。 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 成功 | 43 tests passed。Markdown 変換、Markdown ファイル操作、パス traversal、symlink 拒否を確認。 |
| `npm run build` | 成功 | 2026-06-23 に再実行して成功。 |
| `npm run tauri -- build --verbose` | 条件付き成功 | アプリ本体、DMG、updater アーカイブ生成後、`TAURI_SIGNING_PRIVATE_KEY` 未設定で updater 署名に失敗。ローカルに秘密鍵を置かない場合は Release workflow で署名付き成果物を確認する。 |

## 準備済み確認環境

- [x] `main` と `origin/main` の一致確認
- [x] 未コミット差分なし
- [ ] GitHub Actions の `Build` workflow 成功確認: `gh api` は Bad credentials。GitHub connector の commit status は空で、Actions 成功の確証は未取得。
- [ ] GitHub Secrets の `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 設定確認
- [x] 新規確認用の空フォルダーを用意: `/private/tmp/mytimes-v1-check/empty-project`
- [x] 既存 Markdown を含む確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/existing-project`
- [x] 外部編集確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/external-edit-project`
- [ ] 外部編集確認用エディタを用意

## 手動確認サマリー

| 分類 | 状態 | メモ |
| --- | --- | --- |
| 基本操作 | 一部確認 | production build で `MyTimes.app` / DMG / updater アーカイブ生成を確認。GUI起動コマンドは成功したが、プロセス確認と画面キャプチャは環境制約で未確認。 |
| Markdown ファイル操作 | 自動確認済み | `cargo test` で一覧、作成、読み込み、保存、リネーム、削除、拡張子拒否、path traversal 拒否、symlink 保存拒否を確認。 |
| チャット投稿 | 自動確認済み | `cargo test` で Markdown への追記、日付見出し、区切り線、コードフェンス、予約行 escape / roundtrip を確認。 |
| Markdown 編集と再読み込み | 一部確認 | Markdown 保存ロジックは `cargo test` で確認。未保存変更の UI 操作、外部編集取り込み、自動保存の実機操作は未確認。 |
| 外部編集、削除、リネーム | 一部確認 | ファイル操作の Rust ロジックは確認。外部エディタ連携の実機操作は未確認。 |
| データ移行と互換性 | 一部確認 | Markdown 書き出しロジックは `cargo test` で確認。既存 DB の実データ移行は未確認。 |
| 表示品質 | 一部確認 | Playwright で 1440px / 390px の初期表示を確認。390px の横スクロールを修正し、再確認で `html` / `body` とも overflow なし。Tauri API がない Web 単体起動では `invoke` error が出るため、実アプリ上の目視は未確認。 |
| GitHub Release 前 | 未実施 | `main` 取り込み後に Release workflow と assets を確認する。 |

## 公開判断メモ

- 現時点では、ローカル production build の updater 署名のみ未完了。
- 署名キーをローカルに置かない運用なら、Release workflow 成功をもって署名付き updater 成果物の確認とする。
- `npm audit` の脆弱性 10 件は公開判断前に内容を確認する。
- GitHub Actions と GitHub Secrets は、このセッションでは認証または権限の都合で確証を取れていない。
