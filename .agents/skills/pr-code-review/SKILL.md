---
name: pr-code-review
description: Review GitHub pull requests as Codex and post the results back to the PR. Use when Codex is asked to review a PR, inspect PR diffs, set itself as reviewer, classify findings by priority, post one comment per finding, and publish a Japanese summary comment with commands and GitHub operations performed.
---

# PR Code Review

## Core Workflow

1. Identify the target PR.
   - Use a PR number or URL when the user provides one.
   - If none is provided, infer it from the current branch with `gh pr view`.
   - If that fails, try `gh pr list --head <current-branch>`.
   - Ask the user only when no PR can be found or multiple plausible PRs exist.

2. Check local and PR state before reviewing.
   - Run `git status --short --branch`.
   - Confirm the current branch and avoid changing user work.
   - Inspect PR title, body, base/head branches, comments, review status, and CI/check status when available.
   - Inspect the changed file list before reading detailed diffs.

3. Set the reviewer.
   - Add the authenticated GitHub user as reviewer before reviewing when possible.
   - Prefer `gh pr edit <PR> --add-reviewer @me`.
   - If `@me` is unsupported, get the login with `gh api user --jq .login` and run `gh pr edit <PR> --add-reviewer <login>`.
   - If reviewer assignment fails because of permissions, repo settings, or account constraints, continue the review and record the failure in the summary and final response.
   - In comments, identify the reviewer as `Codex` regardless of the GitHub account display name.

4. Review the diff.
   - Prioritize bugs, behavioral regressions, data loss, security issues, migration risks, broken UX, and missing tests.
   - Check whether the implementation matches the PR goal and project conventions.
   - Avoid noisy style-only comments unless they hide a real maintenance or correctness risk.
   - Do not assume intent when the code is ambiguous; state the uncertainty and the concrete risk.

5. Run relevant verification.
   - Run focused tests, lint, type checks, or build commands that are relevant and feasible.
   - If a command cannot be run, record the command and the reason.
   - Do not run destructive commands or overwrite user work.

6. Prepare review comments in Japanese.
   - Sort findings by priority: `High`, `Medium`, then `Low`.
   - Use `優先度`, not `重大度`.
   - Post each finding as a separate PR comment.
   - Prefer line comments when a file and line are unambiguous.
   - Use a normal PR comment for cross-file, design-level, or line-ambiguous findings.
   - If there are no findings, post only the summary comment.

7. Post the summary comment after individual findings.
   - Include the review result, commands run, verification outcome, residual risks, and GitHub operations performed.
   - Mention reviewer assignment success or failure.
   - State that individual findings were posted separately when applicable.
   - Report the posted comment actions in the final response.

## Finding Comment Format

Use this shape for each individual finding:

```markdown
**Codex レビュー**

[優先度: High]

問題:
...

影響:
...

対応案:
...
```

Use `High` for release-blocking correctness, data loss, security, or clear regression risks.
Use `Medium` for likely bugs under specific conditions, specification gaps, maintainability risks that can cause defects, or meaningful test gaps.
Use `Low` for minor improvements that are useful but not required before merge.

## Summary Comment Format

When findings exist:

```markdown
## Codex レビュー結果

指摘を個別コメントとして投稿しました。

## 確認内容

- `<command>`: <result>

## 残リスク

- <not verified / remaining uncertainty>

## GitHub 操作

- PR 情報を確認
- レビュワーを設定
- 差分を確認
- レビューコメントを投稿
```

When no findings exist:

```markdown
## Codex レビュー結果

優先して対応すべき指摘はありませんでした。

## 確認内容

- `<command>`: <result>

## 残リスク

- <not verified / remaining uncertainty>

## GitHub 操作

- PR 情報を確認
- レビュワーを設定
- 差分を確認
- レビューコメントを投稿
```

## Posting Guidance

- Use `gh pr comment <PR> --body-file <file>` for normal PR comments.
- Use GitHub review APIs or `gh api` only when line-specific comments are needed and the required commit, path, side, and line are known.
- Create temporary comment body files outside the repository or ensure they are not committed.
- If posting fails, keep the review result in the final response and explain which GitHub operation failed.
- Keep final responses concise: include PR number, reviewer assignment result, number of findings posted, verification commands, and any failures.
