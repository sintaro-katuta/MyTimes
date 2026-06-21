# Sprint 3 振り返り

## 対象期間

- Linear Cycle 3
- 期間: 2026-06-15 00:00 JST 〜 2026-06-22 00:00 JST
- チーム: Mytimes
- プロジェクト: v1を公開する

## Linear 実績

この振り返り作成時点では Linear MCP の再認証が必要だったため、Linear 上の Cycle 3 issue 数、Done 件数、Canceled 件数は直接確認できませんでした。
そのため、Sprint 3 は GitHub の PR とローカルの commit 履歴を主な基準として振り返ります。

Sprint 3 で中心になった Linear issue は以下です。

| Issue | 主な内容 |
| --- | --- |
| MYT-34 | README と操作説明を v1 向けに整備する |
| MYT-35 | 公開前チェックリストを作成する |
| MYT-44 | カスタム絵文字ピッカーの表示位置を調整する |
| MYT-45 | メッセージ検索を実装する |
| MYT-47 | ユーザー情報を設定できるようにする |
| MYT-48 | ファイルツリーの表示サイズを固定する |
| MYT-49 | フォルダツリーをトグルで閉じられるようにする |
| MYT-50 | README とアプリのアイコンを PNG から更新する |
| MYT-51 | README に操作スクリーンショットを載せる |
| MYT-52 | Dock のアプリ名を MyTimes に変更する |
| MYT-53 | README、公開前 UI、リリース導線を整える |

## GitHub 実績

Sprint 3 期間中に GitHub 上でマージされた PR は 11 本でした。

| PR | Linear issue | 内容 | マージ日時 | PR 上の commit 数 |
| --- | --- | --- | --- | ---: |
| #41 | MYT-40 | メッセージ入力欄で Markdown を有効にする | 2026-06-15 05:27 JST | 23 |
| #42 | MYT-35 | 公開前チェックリストを作成する | 2026-06-15 05:55 JST | 1 |
| #43 | MYT-45 | メッセージ検索を実装する | 2026-06-15 07:28 JST | 1 |
| #44 | MYT-34 | README と操作説明を v1 向けに整備する | 2026-06-16 07:19 JST | 5 |
| #45 | MYT-44 | カスタム絵文字ピッカーの表示位置を調整する | 2026-06-18 05:59 JST | 8 |
| #46 | MYT-47 | ユーザー情報を設定できるようにする | 2026-06-18 07:07 JST | 2 |
| #47 | MYT-48 | ファイルツリーの表示サイズを固定する | 2026-06-19 05:55 JST | 1 |
| #48 | MYT-52 | Dock のアプリ名を MyTimes に変更する | 2026-06-19 07:12 JST | 1 |
| #49 | MYT-50 | README とアプリのアイコンを PNG から更新する | 2026-06-19 07:47 JST | 1 |
| #50 | MYT-49 | フォルダツリーをトグルで閉じられるようにする | 2026-06-20 09:53 JST | 7 |
| #51 | MYT-51 | README に操作スクリーンショットを載せる | 2026-06-20 14:36 JST | 3 |

合計すると、マージ PR は 11 本、PR 上の commit は 53 件でした。
ただし #41 は Sprint 3 期間内にマージされていますが、実装 commit は Sprint 2 期間に作成されています。
そのため、Sprint 3 期間内のマージ対象作業 commit としては #42 〜 #51 の 30 件を主に扱います。

加えて、Sprint 3 期間中には #52 が open のまま大きく進みました。
#52 は README の訴求整理、公開前 UI 調整、アプリ内アップデート、リリース workflow、バージョン同期、リリース手順書まで含む公開準備の PR です。
調査時点で #52 には 25 件の作業 commit が含まれていました。

## Sprint 3 期間内の作業 commit

ローカルの全ブランチ履歴で、Sprint 3 期間内の作業 commit を issue 番号別に集計すると 57 件でした。

| Linear issue | Sprint 3 期間内の作業 commit 数 |
| --- | ---: |
| MYT-34 | 4 |
| MYT-35 | 1 |
| MYT-44 | 10 |
| MYT-45 | 1 |
| MYT-46 | 1 |
| MYT-47 | 2 |
| MYT-48 | 1 |
| MYT-49 | 7 |
| MYT-50 | 1 |
| MYT-51 | 3 |
| MYT-52 | 1 |
| MYT-53 | 25 |

MYT-53 は Sprint 3 終盤に集中しており、v1 公開前の最後の品質調整とリリース導線整備をまとめて進めた issue です。
README の見せ方、入力欄やサイドバーの細かな UI、リリース workflow、バージョン同期、リリース手順書まで含んでいます。

日別の Sprint 3 期間内作業 commit 数は以下です。

| 日付 | commit 数 |
| --- | ---: |
| 2026-06-15 | 5 |
| 2026-06-16 | 4 |
| 2026-06-17 | 5 |
| 2026-06-18 | 6 |
| 2026-06-19 | 8 |
| 2026-06-20 | 13 |
| 2026-06-21 | 16 |

## よかったこと

- Sprint 2 で実装した Markdown 入力とリアクションを、Sprint 3 で実利用に近い形まで磨き込めた。
- README、スクリーンショット、アイコン、Dock 名など、公開時に初見ユーザーが見る入口を整えられた。
- メッセージ検索、ユーザー情報、フォルダツリー開閉、入力欄の高さ調整など、毎日使う部分の体験を改善できた。
- アプリ内アップデート、署名付き build、バージョン同期、リリース手順書まで入り、公開後の運用導線が具体化した。
- Sprint 1 と同様に、複数 issue を小さめの commit と PR に分けて前へ進められた。

## 課題

Sprint 3 は v1 公開準備としては大きく進みました。
一方で、終盤の MYT-53 は README、UI、リリース、CI、ドキュメントが同じ issue に集まり、作業範囲が広くなりました。

今回の問題は、不要な作業を入れたことではありません。
公開直前に必要な作業が連鎖して見つかったこと自体は自然です。
ただし、README、UI、リリース workflow、リリース手順書、バージョン同期は、それぞれ別 issue にしてもよい粒度でした。

Sprint 1 では issue と PR の対応が比較的読みやすく、後から振り返りやすい状態でした。
Sprint 3 でもその進め方に寄せるなら、公開準備系は次のように分けるのがよいです。

- README の訴求整理
- 公開前 UI の最終調整
- アプリ内アップデートと署名付き build
- バージョン同期
- リリース手順書
- 公開前チェックリストの最終確認

## Sprint 4 への見通し

Sprint 4 は、新機能追加よりも v1 公開判断に集中します。

優先度は以下の順です。

1. PR #52 を通し、公開前 UI と README、リリース導線を main に入れる
2. `docs/pre-release-checklist.md` に沿って必須項目を確認する
3. `docs/release-guide.md` に沿ってバージョン更新、tag push、Release workflow を実行する
4. GitHub Release の成果物と `latest.json` を確認する
5. インストール済みアプリからアップデート確認を行う

Sprint 3 で公開に必要な部品はかなり揃いました。
Sprint 4 では、思いつきの改善を増やすより、重大なデータ消失やインストール不能につながる不具合がないことを確認するのが現実的です。

## 調査に使った主なコマンド

```sh
git log --since='2026-06-15 00:00:00 +0900' --before='2026-06-22 00:00:00 +0900' --all --no-merges
git log --since='2026-06-15 00:00:00 +0900' --before='2026-06-22 00:00:00 +0900' --all --merges
git log --since='2026-06-15 00:00:00 +0900' --before='2026-06-22 00:00:00 +0900' --all --no-merges --date=short --pretty=format:'%ad'
git log --since='2026-06-15 00:00:00 +0900' --before='2026-06-22 00:00:00 +0900' --all --no-merges --pretty=format:'%s'
gh pr list --state merged --limit 100 --json number,title,mergedAt,headRefName,baseRefName,url --search 'merged:2026-06-15..2026-06-21 repo:sintaro-katuta/MyTimes'
gh pr view 41 --json number,title,commits,mergedAt,url
gh pr view 42 --json number,title,commits,mergedAt,url
gh pr view 43 --json number,title,commits,mergedAt,url
gh pr view 44 --json number,title,commits,mergedAt,url
gh pr view 45 --json number,title,commits,mergedAt,url
gh pr view 46 --json number,title,commits,mergedAt,url
gh pr view 47 --json number,title,commits,mergedAt,url
gh pr view 48 --json number,title,commits,mergedAt,url
gh pr view 49 --json number,title,commits,mergedAt,url
gh pr view 50 --json number,title,commits,mergedAt,url
gh pr view 51 --json number,title,commits,mergedAt,url
gh pr view 52 --json number,title,commits,createdAt,updatedAt,mergedAt,state,url
```

Linear は再認証が必要だったため、この振り返りでは直接確認していません。
