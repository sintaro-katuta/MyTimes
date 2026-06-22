# 公開前チェック実施ログ

v1 公開前チェックリストの実施記録。
確認項目の詳細は [公開前チェックリスト](pre-release-checklist.md) を参照する。

## 実施情報

- 実施日: 2026-06-22
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
| `npm audit` | 要確認 | 10 vulnerabilities: 8 moderate, 2 high。`picomatch` と `postcss` に no fix available の advisory あり。公開判断前に影響範囲を確認する。 |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | 成功 | ユーザー実行ログで確認済み。 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | 成功 | ユーザー実行ログで確認済み。 |
| `npm run build` | 成功 | 2026-06-22 に再実行して成功。 |
| `npm run tauri -- build --verbose` | 条件付き成功 | アプリ本体、DMG、updater アーカイブ生成後、`TAURI_SIGNING_PRIVATE_KEY` 未設定で updater 署名に失敗。ローカルに秘密鍵を置かない場合は Release workflow で署名付き成果物を確認する。 |

## 準備済み確認環境

- [ ] `main` と `origin/main` の一致確認
- [x] 未コミット差分なし
- [ ] GitHub Actions の `Build` workflow 成功確認
- [ ] GitHub Secrets の `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 設定確認
- [x] 新規確認用の空フォルダーを用意: `/private/tmp/mytimes-v1-check/empty-project`
- [x] 既存 Markdown を含む確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/existing-project`
- [x] 外部編集確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/external-edit-project`
- [ ] 外部編集確認用エディタを用意

## 手動確認サマリー

| 分類 | 状態 | メモ |
| --- | --- | --- |
| 基本操作 | 未実施 | アプリ起動後に確認する。 |
| Markdown ファイル操作 | 未実施 | 新規、リネーム、削除、パス制御を確認する。 |
| チャット投稿 | 未実施 | 投稿、追記、リアクション、コードブロックを確認する。 |
| Markdown 編集と再読み込み | 未実施 | 手動保存、自動保存、未保存変更、外部編集取り込みを確認する。 |
| 外部編集、削除、リネーム | 未実施 | 外部変更時の再読み込みとエラー表示を確認する。 |
| データ移行と互換性 | 未実施 | 既存 DB と Markdown 書き出しを確認する。 |
| 表示品質 | 未実施 | ライト、ダーク、狭幅、長いファイル名を確認する。 |
| GitHub Release 前 | 未実施 | `main` 取り込み後に Release workflow と assets を確認する。 |

## 公開判断メモ

- 現時点では、ローカル production build の updater 署名のみ未完了。
- 署名キーをローカルに置かない運用なら、Release workflow 成功をもって署名付き updater 成果物の確認とする。
- `npm audit` の脆弱性 10 件は公開判断前に内容を確認する。
