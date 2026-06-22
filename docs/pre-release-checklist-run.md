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
| `npm ci` | 成功 | 依存関係のインストールは完了。依存更新後も `npm_config_cache=/private/tmp/mytimes-npm-cache npm ci` で成功。 |
| `npm audit` | 成功 | 依存更新後に `npm audit` で 0 vulnerabilities を確認。 |
| `npm run check:version` | 成功 | アプリバージョンは 0.1.0 で同期済み。 |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | 成功 | 2026-06-23 に再実行して成功。 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | 成功 | 2026-06-23 に再実行して成功。 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 成功 | 43 tests passed。Markdown 変換、Markdown ファイル操作、パス traversal、symlink 拒否を確認。 |
| `npm run build` | 成功 | 2026-06-23 に再実行して成功。 |
| `npm run tauri -- build --verbose` | 条件付き成功 | アプリ本体、DMG、updater アーカイブ生成後、`TAURI_SIGNING_PRIVATE_KEY` 未設定で updater 署名に失敗。ローカルに秘密鍵を置かない場合は Release workflow で署名付き成果物を確認する。 |

## 準備済み確認環境

- [x] `main` と `origin/main` の一致確認
- [x] 未コミット差分なし
- [x] GitHub Actions の `Build` workflow 成功確認: `env -u GITHUB_TOKEN gh run list --branch main --limit 10` で main の最新 Build が success。
- [x] GitHub Secrets の `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 設定確認
- [x] 新規確認用の空フォルダーを用意: `/private/tmp/mytimes-v1-check/empty-project`
- [x] 既存 Markdown を含む確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/existing-project`
- [x] 外部編集確認用フォルダーを用意: `/private/tmp/mytimes-v1-check/external-edit-project`
- [x] 外部編集確認用エディタを用意: VS Code (`/usr/local/bin/code`)、vim、nano を確認

## 手動確認サマリー

| 分類 | 状態 | メモ |
| --- | --- | --- |
| 基本操作 | 一部確認 | production build で `MyTimes.app` / DMG / updater アーカイブ生成を確認。GUI起動コマンドは成功したが、プロセス確認と画面キャプチャは環境制約で未確認。 |
| Markdown ファイル操作 | 自動確認済み | `cargo test` で一覧、作成、読み込み、保存、リネーム、削除、拡張子拒否、path traversal 拒否、symlink 保存拒否を確認。 |
| チャット投稿 | 自動確認済み | `cargo test` で Markdown への追記、日付見出し、区切り線、コードフェンス、予約行 escape / roundtrip を確認。 |
| Markdown 編集と再読み込み | 要再確認 | 目視確認で Markdown 表示の保存不可を確認。保存ボタンがクリックイベントを保存対象引数として渡していたため修正済み。外部編集取り込みは目視確認で OK。 |
| 外部編集、削除、リネーム | 一部確認 | ファイル操作の Rust ロジックは確認。外部エディタ連携の実機操作は未確認。 |
| データ移行と互換性 | 一部確認 | Markdown 書き出しロジックは `cargo test` で確認。既存 DB の実データ移行は未確認。 |
| 表示品質 | 要再確認 | Playwright で 1440px / 390px の初期表示を確認。390px の横スクロールを修正し、再確認で `html` / `body` とも overflow なし。目視確認では主要操作は可能だが狭幅時のウィンドウ操作がもたつく。 |
| GitHub Release 前 | 未実施 | このブランチはまだ `main` に入っておらず、Release workflow は tag push により公開 Release を作成するため、この作業内では実行しない。`main` 取り込み後に Release workflow と assets を確認する。 |

## 目視確認結果

### OK

- `MyTimes.app` が起動する
- 初回表示で画面崩れ、横スクロール、テキスト重なりがない
- プロジェクトを追加できる
- 既存 Markdown を含むフォルダーを追加すると、`.md` ファイルが一覧に出る
- Markdown ファイルを開くとチャット表示に変換される
- 投稿すると Markdown に追記される
- 外部エディタで Markdown を編集し、アプリで再読み込みすると反映される
- ファイル作成、リネーム、削除ができる
- 設定を変更して再起動後も復元される（色のみ確認）
- ダーク / ライトテーマで文字が読める

### 対応済み

- Markdown 表示に切り替えて編集、保存できない: 保存ボタンのイベント引数渡しを修正
- `test/test.md を再読み込みしました` などの状態表示が常に見える: 一時通知に変更し、約4.2秒で自動消去
- 再読み込みボタンが文字表示: アイコンボタンに変更
- アップデート確認の失敗文言: ローカルで更新情報を取得できない場合の文言に変更
- チャットカードの影が端で途切れて見える: メッセージ一覧の内側余白を追加
- 再読み込みアイコンが小さい: アイコンサイズを拡大
- 状態通知の表示位置: 右上へ移動
- モーダルの閉じるアイコン: 丸付きアイコンから単純なバツアイコンへ変更
- チャットカードの影がまだ見切れる: スクロール領域の余白とカード間隔を追加調整
- 再読み込みアイコンの視認性が弱い: アイコンサイズとボタンサイズを追加拡大

### 残る確認

- Markdown 表示で編集、保存できること
- 未保存変更がある状態で別ノートへ移動すると確認が出ること
- 390px 相当まで狭くした時のウィンドウ操作の体感
- 設定画面の「アップデート確認」がローカル環境で失敗表示に留まり、クラッシュしないこと

## 公開判断メモ

- 現時点では、ローカル production build の updater 署名のみ未完了。秘密鍵をローカルに置いていないため、この環境では実行できない。
- 署名キーをローカルに置かない運用なら、Release workflow 成功をもって署名付き updater 成果物の確認とする。
- `npm audit` の脆弱性は依存更新により 0 件に解消済み。
- GitHub CLI は環境変数 `GITHUB_TOKEN` が無効な場合に Bad credentials になるため、確認時は `env -u GITHUB_TOKEN` を付けて keyring 認証を使う。
