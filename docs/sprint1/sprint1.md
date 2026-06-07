# Sprint 1 振り返り

## 対象期間

- Linear Cycle 1
- 期間: 2026-06-01 00:00 JST 〜 2026-06-08 00:00 JST
- チーム: Mytimes

## Linear 実績

Sprint 1 は、Linear 上では全 16 issue のうち 15 issue が Done、1 issue が Canceled でした。
通常の未完了残件はありませんでした。

| 指標 | 件数 |
| --- | ---: |
| Cycle 1 issue 数 | 16 |
| Done | 15 |
| Canceled | 1 |
| 通常の未完了残件 | 0 |

主な完了 issue は、Markdown 正本化、ノート操作、フォルダツリー表示、日次ノート作成、右クリックメニュー、設定画面拡張に関するものです。

## GitHub 実績

Sprint 1 期間中に GitHub 上でマージされた PR は 5 本でした。

| PR | Linear issue | 内容 | マージ日時 | PR 上の commit 数 |
| --- | --- | --- | --- | ---: |
| #34 | MYT-30 | ノート作成・リネーム・削除を追加する | 2026-06-04 07:11 JST | 13 |
| #35 | MYT-41 | Markdown ファイル一覧をツリー表示に切り替える | 2026-06-04 07:35 JST | 1 |
| #36 | MYT-33 | タイムライン投稿で日次ノートを自動作成する | 2026-06-05 07:20 JST | 4 |
| #37 | MYT-43 | 右クリックメニューのアイコンを調整 | 2026-06-06 22:58 JST | 13 |
| #38 | MYT-16 | 設定画面を拡張してカスタマイズ機能を追加する | 2026-06-07 19:50 JST | 21 |

合計すると、マージ PR は 5 本、PR 上の作業 commit は 52 件でした。
ただし #34 には Sprint 1 開始前の commit が 1 件含まれるため、Sprint 1 期間内のマージ対象作業 commit は 51 件です。

ローカルの全ブランチ履歴で、Sprint 1 期間内の作業 commit を issue 番号別に集計すると 58 件でした。

| Linear issue | Sprint 1 期間内の作業 commit 数 |
| --- | ---: |
| MYT-16 | 21 |
| MYT-30 | 12 |
| MYT-33 | 6 |
| MYT-41 | 1 |
| MYT-42 | 5 |
| MYT-43 | 13 |

MYT-42 は Linear 上では Done ですが、GitHub 上で対応 PR は確認できませんでした。
そのため、GitHub のマージ PR 実績には含めず、ローカル履歴上の作業 commit として扱います。

日別の Sprint 1 期間内作業 commit 数は以下です。

| 日付 | commit 数 |
| --- | ---: |
| 2026-06-01 | 2 |
| 2026-06-02 | 7 |
| 2026-06-03 | 2 |
| 2026-06-04 | 6 |
| 2026-06-05 | 12 |
| 2026-06-06 | 8 |
| 2026-06-07 | 21 |

## Sprint 2 見通し

Sprint 2 マイルストーンは、調査時点で Linear 上の進捗が 75% でした。
Sprint 2 に予定されていた主要機能の一部は Sprint 1 中に前倒しで完了しています。

Sprint 2 の残り候補は主に以下です。

| Issue | 内容 | 状態 |
| --- | --- | --- |
| MYT-31 | 送信ショートカットと入力挙動を v1 仕様に合わせる | Todo |
| MYT-32 | メッセージリアクションを実装する | Todo |
| MYT-40 | メッセージ入力欄でマークダウンを機能させる | Todo |

Sprint 1 では、1 週間で GitHub マージ PR 5 本、マージ対象作業 commit 51 件、Linear Done 15 件まで進められました。
この実績から見ると、Sprint 2 の残り 3 issue は完了を狙える範囲です。

ただし、MYT-32 はリアクション状態の保存方式と Markdown 正本との関係を決める必要があります。
そのため、Sprint 2 は以下の順で進めるのが現実的です。

1. MYT-31: 入力体験の調整
2. MYT-40: メッセージ入力欄の Markdown 対応
3. MYT-32: リアクション実装

MYT-31 と MYT-40 は高い確度で完了可能です。
MYT-32 まで含めて Sprint 2 内完了を狙えますが、保存方式の判断が長引く場合は、実装範囲を v1 最小仕様に絞るのがよいです。

## 調査に使った主なコマンド

```sh
git log --since='2026-06-01 00:00:00 +0900' --before='2026-06-08 00:00:00 +0900' --all --no-merges
git log --since='2026-06-01 00:00:00 +0900' --before='2026-06-08 00:00:00 +0900' --all --merges
gh pr list --state merged --limit 100 --json number,title,mergedAt,createdAt,headRefName,baseRefName,url --search 'merged:2026-06-01..2026-06-07 repo:sintaro-katuta/MyTimes'
gh pr view 34 --json number,title,commits,mergedAt,url
gh pr view 35 --json number,title,commits,mergedAt,url
gh pr view 36 --json number,title,commits,mergedAt,url
gh pr view 37 --json number,title,commits,mergedAt,url
gh pr view 38 --json number,title,commits,mergedAt,url
```

Linear では、Mytimes チーム、Cycle 1 / Cycle 2、v1 公開プロジェクト、Sprint 2 マイルストーン、関連 issue 一覧を確認しました。
