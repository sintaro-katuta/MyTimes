# Sprint 4 振り返り

## 対象期間

- Linear Cycle 4
- 期間: 2026-06-22 00:00 JST 〜 2026-06-29 00:00 JST
- チーム: Mytimes
- プロジェクト: v1を公開する
- マイルストーン: Sprint 4: 安定化・公開・Qiita記事

## Linear 実績

Sprint 4 は、Linear Cycle 4 上で全 5 issue が Done でした。
v1 公開前の最終確認、GitHub Release、Qiita 記事公開、v1 公開プロジェクト完了までを完了できました。

| 指標 | 件数 |
| --- | ---: |
| Cycle 4 issue 数 | 5 |
| Done | 5 |
| 通常の未完了残件 | 0 |

Sprint 4 で完了した issue は以下です。

| Issue | 内容 | 状態 |
| --- | --- | --- |
| MYT-36 | v1公開前の最終動作確認を行う | Done |
| MYT-37 | GitHub Releaseでv1バイナリを配布する | Done |
| MYT-38 | Qiita記事を作成して公開する | Done |
| MYT-39 | v1公開プロジェクトを完了する | Done |
| MYT-53 | 細かな修正をする | Done |

Linear Cycle 4 の履歴では、issue 数と scope は 5 のまま推移し、最終的に 5 件すべてが完了しました。
新機能追加ではなく、公開前確認、配布、記事公開、プロジェクト完了に集中したスプリントでした。

## GitHub 実績

Sprint 4 期間中に GitHub 上でマージされた PR は 4 本でした。

| PR | Linear issue | 内容 | マージ日時 | PR 上の commit 数 |
| --- | --- | --- | --- | ---: |
| #52 | MYT-53 | README と公開前 UI を整える | 2026-06-22 07:43 JST | 27 |
| #53 | MYT-36 | v1 公開前の最終動作確認を行う | 2026-06-27 09:22 JST | 21 |
| #54 | MYT-37 | v1 バイナリ配布の準備を整える | 2026-06-27 10:33 JST | 3 |
| #55 | MYT-36 | README の公開用画像を整える | 2026-06-27 11:38 JST | 4 |

PR #52 は Sprint 4 初日にマージされていますが、作業 commit の大半は Sprint 3 期間中に作成されています。
そのため、Sprint 4 では「公開準備を main に取り込んだ PR」として扱い、Sprint 4 期間内の作業 commit 数とは分けて見ます。

Sprint 4 期間中に GitHub Release `v1.0.0` が公開され、`MyTimes v1.0.0` が latest release になりました。

## Sprint 4 期間内の作業 commit

ローカルの全ブランチ履歴で、Sprint 4 期間内の作業 commit を issue 番号別に集計すると 30 件でした。

| Linear issue | Sprint 4 期間内の作業 commit 数 |
| --- | ---: |
| MYT-36 | 26 |
| MYT-37 | 3 |
| MYT-53 | 1 |

MYT-36 は、公開前チェックの実施ログ、Secrets / Actions 確認、依存脆弱性対応、狭幅表示やドラッグ領域の調整、署名キー更新手順、README の公開用画像整備まで含みます。
Sprint 4 の作業 commit の大半は、v1 公開前の最終確認から見つかった修正でした。

MYT-37 は、v1 バイナリ配布に向けたリリース同期処理、Windows 向け同期処理、リリース公開処理の修正でした。
MYT-53 は、Sprint 3 から続いたリリース手順とバージョン同期の最終調整です。

日別の Sprint 4 期間内作業 commit 数は以下です。

| 日付 | commit 数 |
| --- | ---: |
| 2026-06-22 | 3 |
| 2026-06-23 | 13 |
| 2026-06-24 | 5 |
| 2026-06-25 | 0 |
| 2026-06-26 | 4 |
| 2026-06-27 | 5 |
| 2026-06-28 | 0 |

## よかったこと

- Sprint 4 の目的を v1 公開判断と公開作業に絞れた。
- 公開前チェックリストとリリース手順書を使い、確認結果を残しながら進められた。
- GitHub Release `v1.0.0` で v1 バイナリ配布まで到達できた。
- Qiita 記事公開まで完了し、v1 公開プロジェクトの完了条件を満たせた。
- README の公開用画像や紹介導線も最後に整えられ、初見ユーザー向けの入口を改善できた。

## 課題

Sprint 4 は公開まで完了できました。
一方で、MYT-36 に公開前確認、UI 微調整、依存脆弱性対応、署名キー更新、README 画像整備が集中しました。

今回の問題は、公開前に細かな修正が出たこと自体ではありません。
公開直前に実機確認や配布確認を進めると、表示崩れ、権限、署名、Release workflow のような横断的な問題が見つかるのは自然です。
ただし、後から追うには MYT-36 の範囲が広くなりました。

次回以降は、公開フェーズの issue を次のように分けると振り返りやすくなります。

- 公開前チェックリスト実行
- 公開前 UI 最終調整
- 署名キーとアップデーター確認
- GitHub Actions / Release workflow 確認
- README / スクリーンショット最終調整
- Release asset とアップデート確認

## v1.1 への見通し

v1.1 は、新機能を増やす前に v1 公開後の実利用で見つかった改善を整理するところから始めるのがよいです。
特に、公開前確認で MYT-36 に集まった細かな調整は、今後も同じ形で発生しやすいです。

v1.1 の最初の計画では、以下を分けて洗い出します。

- v1 公開後に見つかった不具合
- 日常利用で気になる UI / 入力体験の改善
- README、Qiita、Release notes で不足している説明
- リリース手順やアップデート確認の自動化余地
- v1.1 に入れるもの / 見送るもの

Sprint 4 で v1 の公開導線は一通り確認できました。
v1.1 では、公開作業そのものよりも、利用しながら継続的に直すためのタスク分解と優先度付けを早めに行うのが現実的です。

## 次に改善すること

- 公開前確認で見つかった修正は、可能な範囲で issue を分ける。
- `細かな修正` issue を使う場合でも、作業内容を説明欄かコメントに残す。
- Release workflow、署名、アップデーター確認は、実装 issue とは別の確認 issue として扱う。
- 公開後の改善候補は、v1.1 の計画 issue に集約してから優先度を決める。

## 調査に使った主なコマンド

```sh
git log --since='2026-06-22 00:00:00 +0900' --before='2026-07-01 00:00:00 +0900' --all --no-merges
git log --since='2026-06-22 00:00:00 +0900' --before='2026-07-01 00:00:00 +0900' --all --merges
git log --since='2026-06-22 00:00:00 +0900' --before='2026-07-01 00:00:00 +0900' --all --no-merges --date=short --pretty=format:'%ad'
git log --since='2026-06-22 00:00:00 +0900' --before='2026-07-01 00:00:00 +0900' --all --no-merges --pretty=format:'%s'
gh pr list --state merged --limit 100 --json number,title,mergedAt,headRefName,baseRefName,url --search 'merged:2026-06-22..2026-06-30 repo:sintaro-katuta/MyTimes'
gh pr view 52 --json number,title,commits,mergedAt,url
gh pr view 53 --json number,title,commits,mergedAt,url
gh pr view 54 --json number,title,commits,mergedAt,url
gh pr view 55 --json number,title,commits,mergedAt,url
gh release list --limit 20
```

Linear では、Mytimes チーム、Cycle 4、v1 公開プロジェクト、Sprint 4 マイルストーン、関連 issue 一覧を確認しました。
