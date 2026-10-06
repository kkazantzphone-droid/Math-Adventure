---
name: math-adventure-quality-gate
description: Certify a Math Adventure candidate before preservation or publication, checking the full diff, repository gates, independent review and evidence limits. Use for completion reviews, not every intermediate edit.
---

# Math Adventure quality gate

Own candidate integrity and the final evidence record. Route mathematical truth to [math-truth-review](../math-adventure-math-truth-review/SKILL.md) and rendered interaction to [ui-acceptance](../math-adventure-ui-acceptance/SKILL.md); do not duplicate their reviews.

Read [AGENTS.md](../../../AGENTS.md), the [operating model](../../../docs/CODEX_OPERATING_MODEL.md), [decision register](../../../docs/DECISION_REGISTER.md) and the task's current phase/completion report. Use [development](../../../docs/DEVELOPMENT.md) for exact tool pins/cache setup and [testing strategy](../../../docs/TESTING_STRATEGY.md) for applicable assurance layers. Historical passing counts and prior CI heads are evidence only for their recorded candidates.

## Candidate review

- Identify the task's authorized scope, review base and candidate revision. Inspect the complete base-to-candidate diff, staged/unstaged changes, untracked files and generated artifact inventory. Green tests do not excuse unrelated configuration or scope contamination. Preserve unrelated user work outside the candidate; repair agent-introduced contamination before publication.
- Review source/config/dependency/lockfile changes, install scripts, licenses and asset provenance. Check exact pins and the one-document lockfile; a frozen install must not change the lockfile. Inventory production output and retained notices. For governance-only work, compare product build bytes/hashes to the verified baseline and investigate any difference.
- Inspect candidate files and proposed PR attachments for secrets, real child material, exports, recordings, databases and identifying logs. Ignore rules or synthetic-looking names are insufficient. Real learner material blocks publication; do not upload it for diagnosis or perform an irreversible history/data purge without the human decision required by the operating model. See [synthetic-only ADR](../../../docs/adr/ADR-0008.md) and [privacy](../../../docs/CHILD_SAFETY_AND_PRIVACY.md).
- Obtain independent review proportional to the changes, giving the reviewer the task and raw candidate rather than a desired verdict. Reconcile findings. Route meaningful mutations to the affected reviewer: an intended assertion must detect the defect, and exact original bytes must be restored before final gates. Compilation failure alone is not mutation sensitivity.

## Gates and handoff

For final certification, run `corepack pnpm verify` on the complete candidate and verify the same candidate in an isolated fresh checkout after `corepack pnpm install --frozen-lockfile`. Run `corepack pnpm audit` and record the observed advisory result/date. Use the existing repository-local cache and pinned baseline; do not install global tools or relax gates to obtain green results. Intermediate edits need proportional checks, followed by the complete final gate. Check Git whitespace and local links, lockfile equality, final artifact inventory and status.

Diagnose, repair and revalidate ordinary failures autonomously. Record commands/results, exact revision or tree, independent findings, mutation detection/restoration, build/lock evidence, and unresolved capabilities in the task's completion report and decision register as appropriate. Local success does not establish hosted checks: publication readiness needs observed required checks for the current PR head, including later documentation commits. Prior-head source evidence can carry forward only under the operating model's explicit documentation-only proof and the changed head's own completed required verification; hosted success always binds the exact current head.

For a necessary Class C request, complete the authorized proposal, readiness checks and independent preparatory review before asking the human. The request must describe that concrete result and come after those checks; do not announce an unfinished proposal as ready or ask first and continue its preparation afterward.

Class B permits task-scoped feature-branch push, PR updates and CI repair under standing project authorization after these gates and once the task's publication and parent/base conditions are satisfied. After V2 is owner-merged into protected main, a qualifying trusted Codex PR may use normal protected squash merge only when every operating-model eligibility condition passes. Re-read decisive head/base/check/review/protection state immediately before the action; changed facts stop merge and require reconciliation/reverification. Missing or non-successful required PR-specific Ubuntu/Windows evidence, contamination, unresolved findings and outstanding blocked/human decisions forbid merge. Neither fixture validation nor a supplied synthetic guard snapshot authenticates GitHub state or replaces these observations.

Never bypass protection, force-push, directly push main, dismiss/fabricate reviews or use administrator merge. Verify MERGED, actual squash SHA, main containment and unchanged protection afterward; inspect an ambiguous result before any retry. A verified merge may enable only an already authorized queued Goal whose declared parent condition is satisfied. This skill never grants Class C authority or expands product scope. Authority-expanding governance must never self-merge, including this V2 governance PR, which stops at **READY FOR OWNER MERGE** for manual owner squash merge. Non-expanding governance corrections require independent governance review. Accepted-policy decisions, release, deployment and all other Class C boundaries remain human-only.

Use the operating model outcomes: `PASS` only for satisfied acceptance evidence; `BLOCKED — EVIDENCE UNAVAILABLE` for required unobtainable proof; `HUMAN DECISION REQUIRED` for a Class C decision. Missing audit/browser/hosted evidence stays visible rather than becoming an inferred pass.
