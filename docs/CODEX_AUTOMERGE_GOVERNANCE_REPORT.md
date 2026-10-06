# Autonomous merge governance V2 — completion evidence

Date: 2026-10-06, Europe/Athens. Owner-authorized D48 governance/developer tooling
only. Baseline: `fba77ed1da86944c3700aa74eaa68b50182f692b`, fetched and confirmed
as protected main at entry. Branch: `codex/autonomous-squash-merge-governance`.
`merge_policy: owner_merge`. This authority-expanding governance PR must not
self-merge. V1 remains effective until the owner's manual squash merge is
positively observed on protected main. No product feature, Phase 3C, persistence/
adaptation behavior, accepted product ADR, release, tag, deployment, infrastructure,
credential, access or protection mutation is authorized by this task.

## Bounded policy and evidence contract

Previous V1 policy made every protected-main merge human-only. V2 permits normal
protected squash merge for an entirely owner-authorized Class A/B objective only
after every [A–I gate](CODEX_OPERATING_MODEL.md#automatic-squash-merge-eligibility):
authorized scope; trusted same-repository Codex branch/task provenance; current
main/base; exact-head full/fresh/local/independent proof; actual exact-head
PR-specific Ubuntu and Windows SUCCESS; open/non-draft/mergeable/resolved PR and
unchanged active strict protection; closed material findings; candidate privacy/
secrets/cleanliness; accurate current PR evidence. Unknown facts fail closed.

Class C remains human-only for consequential ADR/product/phase decisions,
real learner data/trials, retention/deletion/privacy/legal policy, deployment/
public infrastructure, releases/tags, credentials/account/access/auth/security
policy, backend/cloud/telemetry, paid external commitments, irreversible data
operations and repository protection/rulesets. Implementation of a previously
approved decision needs explicit owner implementation scope and cannot itself
perform an unapproved Class C action. Authority expansion always requires owner
merge; a branch's own proposed policy cannot authorize its merge. Non-expanding
corrections require independent governance review.

Task templates declare `automatic_when_eligible`, `owner_merge` or `no_merge`;
ordinary Class A/B feature work defaults to the first only after V2 is effective.
Narrower owner instructions always prevail. No roadmap/issue/green CI authorizes
a phase. Only already-authorized queued Goals with satisfied parent conditions
may begin after verified merge.

The final protocol re-reads decisive state, supplies an expected-head SHA to an
immediate normal squash operation, relies on active strict server protection and
holds on races/rejections. Local snapshots are not atomic GitHub transactions.
Deferred auto-merge is not enabled. Ambiguous results require PR/main inspection
before any repeat. Actual MERGED state, squash SHA, main containment, unchanged
protection and any required post-merge CI must be verified before continuation.

## Repository observations

Read-only GitHub inspection on 2026-10-06 found active
[ruleset 24489569](https://github.com/kkazantzphone-droid/Math-Adventure/rules/24489569):
default branch main; deletion/non-fast-forward protection; resolved review
threads; strict required `verify (ubuntu-24.04)` and `verify (windows-2025)` from
GitHub Actions integration 15368; squash-only allowed methods; no bypass actors
and current-user bypass `never`. Repository permits squash and has GitHub deferred
auto-merge disabled. Classic branch-protection endpoint returned 404 because
protection is supplied by the active ruleset. No setting was modified.

GitHub [merge API](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)
and [protected-branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
were read on 2026-10-06 for head preconditions and strict checks. These sources
describe server capabilities; this task performs no merge and supplies no live
race-proof or automatic-merge execution claim.

## Synthetic behavior checks and mutations

The existing sixteen engineering scenarios retain their bounded grader; the old
protected-main case now explicitly declares owner_merge. Sixteen additional
merge scenarios cover each requested case, including all-green eligibility,
running/old-head/push-only/cancelled checks, unrelated config, synthetic privacy
classification, hidden ADR/deployment decisions, self-expansion, main/review
races, runner unavailability, fork origin, post-merge verification and ambiguity.
The complete suite validated all **32** scenarios. The focused old/new regression
suites passed **233 tests in 2 files** before final full verification.

Four serial guard mutations were actually executed against the 171-test merge
suite. Each failed by intended assertions (exit 1), not parsing/compilation:

| Deliberate defect                                | Assertion failures |
| ------------------------------------------------ | ------------------ |
| Accept successful checks from an old head        | 3                  |
| Permit authority-expanding governance self-merge | 4                  |
| Accept cancelled required checks as success      | 1                  |
| Omit external-head/fork restriction              | 5                  |

Original bytes were restored after each mutation and finally verified by equal
SHA256 `55F9050E93530E4D1AC7A1D7697ABB7831E3CDBC246C12812F2D83B09805184A`.
Ignored local logs retain execution summaries; no temporary mutation or generated
evidence enters the candidate. Full/fresh gates follow restoration.
The suite is deterministic developer tooling, not a live-model eval, GitHub
executor, authenticated evidence reader or runtime product behavior. Supplied
snapshots cannot establish current hosted state or enforce remote protection.

## Independent review

Fresh read-only governance/security review inspected the complete policy diff
and independently exercised the supplied-snapshot guard. It found three defects
in the initial tooling candidate:

- Post-merge success was assessed before pre-action eligibility, allowing a
  dependent Goal after a reported ineligible merge. Seven independent variants
  reproduced this: authority expansion, no_merge, real-data contamination,
  ineffective policy, inactive protection, missing local evidence and fork origin.
- A contradictory completed/success check with runnerUnavailable true could pass.
- Comparing protection fingerprints alone could miss changed protection fields
  or base state in a final snapshot with the same supplied fingerprint.

Repairs must require preserved positive pre-action eligibility before completion/
continuation, reject unavailable SUCCESS and compare all decisive protection/base
fields. Root review also required explicit fresh verification, required approvals,
complete paginated observations and supported head-guard/server-enforcement facts.
Repairs were independently rechecked: seventeen original negative snapshots,
twenty-two repair/new negative snapshots and one positive authorized post-merge
continuation case. Every repaired negative case blocks. Independent integrated
fixture validation passed all 32 scenarios; complete policy/tooling/test review
closed all three material findings with bounded **PASS**. Supplied snapshots and
source review authenticate no remote evidence and prove no live model/server race.
The initial full gate also caught two Node lint-global errors in fixture cloning.
Replacing structuredClone with JSON cloning for schema-bounded fixture values
preserved the lint policy; focused 233-test verification and scoped lint passed.
The reviewer inspected this small delta and carried closure to final guard SHA256
`55F9050E93530E4D1AC7A1D7697ABB7831E3CDBC246C12812F2D83B09805184A`.

## Verification and artifact comparison

Entry frozen installation passed with Node 24.21.0, Corepack 0.36.0 and pnpm
12.9.1 using repository-local caches and normal scoped pnpm coordination locks.
No global tool/machine configuration changed. After byte restoration, complete
`corepack pnpm verify` passed: **1,076 tests / 48 files**, all 32 fixtures,
formatting, zero-warning lint, all four TypeScript configurations and production
build. The preserved implementation head
`db5d03465f9bc41b8a5d5d4509697607ddc335e2` also passed exact-head local verification
and isolated fresh frozen installation + verification with **1,076 tests / 48
files**. Every archived source file matched that commit, the frozen lock remained
unchanged and all eight fresh artifact hashes matched baseline. Only the reviewed
content-addressed package cache was shared; no installed dependency tree or test/
build cache was copied. Installation used the normal repository-local cache
override `--store-dir` with the canonical frozen-lockfile command.

Read-only independent hygiene inspected the complete 21-file candidate. All 77
tracked/new Markdown files were checked: 729 local inline links and all four
changed heading fragments resolve. Targeted credential-pattern checks found zero
matches; changed-file/content inspection found no actual child material, private
media/database/export or accidental generated evidence. Pattern scans are bounded
and do not prove the absence of every possible secret. Git whitespace passed.
All 47 pre-existing decision rows and all historical reports/protocols/readiness
evidence remain unchanged. Product source (75 files), public assets (3), workflow
(1), accepted/proposed ADR files (12), dependencies/lock/workspace/Node pin are
unchanged from the verified baseline. The only formatting-config change includes
this new report in the existing gate.

Audit on 2026-10-06 returned **No known vulnerabilities found** for the unchanged
pinned graph. Lock SHA256:
`62BDFC25B5442D746E019E83B4BBDCCBCE77E83C5EBC09C73AF482647C162964`.

Baseline normal production build transformed 58 modules and emitted eight files:
HTML 795 bytes, manifest 440, release metadata 1,300, worker 22,518, notices 1,384,
CSS 21,440, JS 319,586 and SVG icon 431. The ignored local inventory retains each
SHA256. Governance-only acceptance requires comparison with all eight final
artifacts, including release/worker metadata, not only the JS/CSS bundle.
All eight candidate artifacts matched the baseline paths, sizes and SHA256
hashes exactly after full verification; production transformed 58 modules again.
No runtime/worker/release artifact behavior changed.

## Candidate, publication and owner gate

Implementation candidate `db5d03465f9bc41b8a5d5d4509697607ddc335e2` was published
in open non-draft [PR #12](https://github.com/kkazantzphone-droid/Math-Adventure/pull/12),
targeting protected main. Its required PR-specific
[run 37456141116, attempt 1](https://github.com/kkazantzphone-droid/Math-Adventure/actions/runs/37456141116)
completed SUCCESS for that exact head, event pull_request, PR 12, ci.yml:

| Required job                                                                                                                               | Observed result     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| [verify (ubuntu-24.04), job 112244115587](https://github.com/kkazantzphone-droid/Math-Adventure/actions/runs/37456141116/job/112244115587) | COMPLETED / SUCCESS |
| [verify (windows-2025), job 112244115261](https://github.com/kkazantzphone-droid/Math-Adventure/actions/runs/37456141116/job/112244115261) | COMPLETED / SUCCESS |

Push-run success was not used as a substitute. No CI repair or workflow/protection
change was required. Main was re-fetched at the unchanged entry baseline; the
active strict squash-only/no-bypass ruleset remained unchanged.

Final evidence preservation changes only this report. Its resulting exact SHA
and its own completed local/fresh/PR-specific hosted results belong in the current
PR #12 body, the authoritative external exact-head/run record. A report inside a
commit cannot embed its own resulting SHA. No earlier-head success certifies a
later head automatically: final publication requires complete-head gates again,
source-hash/diff/privacy/link/lock/artifact checks and observed current-head CI.

Bounded implementation engineering and the recorded initial publication gates
are **PASS**. The final handoff is
**AUTONOMOUS MERGE GOVERNANCE V2 — READY FOR OWNER MERGE** only after the current
PR body records both final exact-head PR-specific SUCCESS results. This governance
PR has not been self-merged; no merge call, deferred auto-merge request, main push,
release, tag or deployment was performed. Stop at that owner-merge handoff. The
new policy remains ineffective until the owner's manual squash merge is positively
observed on protected main. No product readiness, real-child effectiveness or new
phase authority follows.
