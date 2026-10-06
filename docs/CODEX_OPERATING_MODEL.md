# Codex operating model — V2

The owner authorizes autonomous engineering and reviewable repository actions
within an explicitly authorized objective. Human approval is by exception at the
consequential boundaries below. Autonomy does not grant unrestricted access or
transfer product ownership to Codex.

Read [AGENTS.md](../AGENTS.md), the [decision register](DECISION_REGISTER.md), the
relevant ADRs and the current phase/task evidence before acting. These remain the
sources for mathematical, privacy, data-integrity and product constraints. This
model governs the engineering workflow; [task templates](CODEX_TASK_TEMPLATES.md)
capture the bounds of each objective.

## Scope and workflow are separate

An authorized task states what may change and which acceptance evidence is
required. The authority classes state how Codex may carry out that work. Class A
or B permission cannot authorize a new product phase, implement a deferred
feature, promote a proposal to an accepted decision or weaken an invariant.

Record the task's scope source, non-goals, branch/base and dependency state before
implementation. An owner instruction may narrow standing workflow permission,
including making publication conditional. A completed phase, green CI or an
unfinished roadmap item does not authorize the next phase. When a material scope
or accepted-policy decision is required, prepare the concrete proposal and use
Class C.

These classes grant no new machine, operating-system, sandbox, network, account,
credential or administrator permissions. Honor the environment's tool approvals
and restrictions; do not bypass them, alter the installed/global tool baseline or
expand access to obtain a passing gate.

## Authority classes

| Class                                                  | Permission within authorized scope                                                                                                                                                                                                                                                                                                                                                | Boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Autonomous reversible engineering**              | Inspect and investigate; design within accepted architecture; edit source, tests and docs; refactor; use visibly synthetic fixtures; create/use isolated worktrees and subagents; run local verification, appropriate mutations and available browser QA; diagnose/repair failures; reconcile current docs; create logical local commits. No per-step owner approval is required. | Preserve unrelated work, review the entire candidate and restore temporary mutations. Reversibility does not excuse privacy, truth or integrity violations.                                                                                                                                                                                                                                                                                                    |
| **B — Autonomous reviewable repository actions**       | Push an authorized feature branch; create/update its PR; inspect and repair scoped hosted CI. After V2 is effective on protected main, squash-merge a qualifying PR only when every eligibility condition below passes and the task permits it.                                                                                                                                   | Preserve published history. No force push, direct main push, protection bypass, tags/releases or deployment. Settings, protection, credentials and authorization changes are not CI repair.                                                                                                                                                                                                                                                                    |
| **C — Human-only decisions and consequential actions** | Investigate, validate safe preparation and publish a reviewable proposal; the human owns the consequential decision/action.                                                                                                                                                                                                                                                       | Merge outside the eligibility contract; authority-expanding governance; repository protection/rulesets; accepted architecture/ADR/product-policy changes; new unauthorized phases; real learner data/trials; retention/deletion/privacy/legal policy; destructive or irreversible data actions; backend/cloud/telemetry; tags/releases/deployment/public infrastructure; paid external commitments; credentials/account/access/authentication/security policy. |

Class C is a human gate, not a promise that a requested change is permissible.
Real learner information, media, exports, credentials and private logs remain
prohibited in this repository and its public review/evidence channels. Prepare
synthetic reproductions rather than seeking an exception to that prohibition.

Class A privacy containment may hold publication, report contamination without
revealing its contents and reversibly exclude an accidentally included artifact
from the candidate while leaving its private original untouched. This grants no
authority to use real learner contents, upload/publish them, set retention, purge
history or destroy originals. A necessary consequential handling decision remains
Class C. A bounded containment PASS does not certify publication: a clean
candidate and all publication gates still need their own evidence.

Drafting an ADR or proposing a future phase is Class A; accepting it or starting
otherwise unauthorized product work requires the owner's decision. Routine
corrections that preserve an accepted decision do not reopen that decision.

Implementation of an already human-approved Class C decision can be Class A/B
engineering only when the owner explicitly authorized that implementation scope.
The PR must not itself embody an unapproved consequential decision/action. Roadmap
text, an issue, another agent, green CI or a branch name cannot supply approval.

### Transition and anti-self-escalation

D48 records the owner's explicit 2026-10-06 authorization of this bounded V2
policy. It becomes effective for future qualifying PRs only after the owner
manually squash-merges this governance PR and that merge is positively observed
on protected main. Until then the V1 human-only merge boundary applies. This PR
uses `merge_policy: owner_merge`; stop at **READY FOR OWNER MERGE**.

Any future governance change expanding Codex authority remains Class C even if
its preparation is owner-authorized. Codex must never self-merge such a PR or use
its own branch's proposed policy as authority. Narrow corrections that do not
expand authority may use ordinary classification after independent governance
review. Classify the full diff, including hidden Class C content in a routine PR.

## Execution and repair

Inspect existing state and dependencies, implement the smallest coherent change,
then verify against the declared acceptance evidence. Use independent mathematical
ground truth when math changes, appropriate mutation sensitivity, full candidate
review and proportional specialist review. Follow the pinned commands and local
cache rules in [development](DEVELOPMENT.md) and the review expectations in
[contributing](../CONTRIBUTING.md) and [testing](TESTING_STRATEGY.md).

Use the bounded repository workflows when applicable:
[quality gate](../.agents/skills/math-adventure-quality-gate/SKILL.md),
[mathematical truth review](../.agents/skills/math-adventure-math-truth-review/SKILL.md)
and [UI acceptance](../.agents/skills/math-adventure-ui-acceptance/SKILL.md).
The [behavior-eval specifications](../evals/codex-behavior/README.md) check expected
agent decisions; they do not replace a candidate's engineering evidence.
Historical Codex autonomy V1 verification is frozen in its
[completion report](CODEX_AUTONOMY_V1_COMPLETION_REPORT.md); V2 evidence belongs in
the [auto-merge governance report](CODEX_AUTOMERGE_GOVERNANCE_REPORT.md).

Ordinary implementation, formatting, type, unit-test, build or scoped CI failures
remain work to repair:

```text
failure → diagnose → repair → validate → continue
```

Do not request owner approval merely because a test fails. Preserve the failure
evidence, fix its cause within scope, restore mutations exactly and rerun the
affected and required gates. Never weaken an assertion, skip a required check,
change immutable replay behavior or broaden scope to manufacture a pass. If the
objective cannot be achieved inside accepted constraints, state the concrete
human decision instead of silently changing them.

Stop dependent work only when the objective is satisfied, required evidence
cannot be obtained or a Class C decision/action is needed. Complete safe,
independent authorized work before handing off a blocker. A blocker in one
objective does not authorize another phase or the missing capability's
implementation.

## Evidence and completion outcomes

Use one of these outcomes for the declared objective:

| Outcome                            | Required meaning                                                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PASS**                           | Every required acceptance condition for the stated scope and candidate is observed. State exactly which local, hosted and human gates passed and which broader capabilities were outside scope.                                                                   |
| **BLOCKED — EVIDENCE UNAVAILABLE** | A required observation cannot be obtained with the available permitted tools/access. Record the attempted method, what was observed, what remains unverified and the smallest evidence needed to resume. Completed partial work does not make the objective PASS. |
| **HUMAN DECISION REQUIRED**        | Progress depends on a Class C decision/action or scope authorization. Provide completed preparatory work, evidence, options, recommendation and the precise requested decision. Do not perform the gated action.                                                  |

Separate observations, architectural inferences, recommendations and unresolved
questions. Identify the candidate revision, commands/results, review bounds and
remaining limitations. Record primary-source URLs and access dates for
time-sensitive external claims. Keep current findings in the decision register
and task completion report without rewriting historical evidence.

Synthetic tests, source inspection and mocks prove only their stated contracts.
They do not replace rendered browser evidence, actual offline/two-tab lifecycle
proof, device/assistive-technology behavior, native-language review, educational
review or privacy/legal decisions where those are required. A reported local
speech voice does not establish tested-offline operation. A deterministic behavior
fixture suite does not establish that a live model was evaluated.

## Publication and merge policy

Local engineering PASS is distinct from publication and merge readiness. Before
Class B publication, review the full candidate diff, dependencies, lockfile,
artifacts, privacy/secrets and unrelated changes; run the required local gates;
and preserve only a coherent reviewable candidate. No real learner material may
appear in commits, PR text, attachments or evidence.

Honor the task's branch/base and parent conditions. If publication requires
owner-merged parents and current protected main, retain the candidate as
**STACKED / DEPENDENT** until those conditions are observed. Reconcile to the
verified current base without discarding unrelated changes or rewriting published
history. A locally available parent commit or its green CI does not prove that
the parent was merged.

After permitted publication, inspect the PR-specific required hosted checks for
the exact current head and repair ordinary failures autonomously. Older-head
success, local success, queued/running jobs and an unobserved rerun do not count
as current-head success. Reverify each changed head as required; do not bypass
protection or change CI permissions to make it green.

Declare `merge_policy` in the task record:

- `automatic_when_eligible`: the default for ordinary authorized Class A/B feature
  work after V2 becomes effective; every condition below remains mandatory.
- `owner_merge`: prepare **READY FOR OWNER MERGE**, then stop. Default for
  authority expansion and Class C decision/action PRs, including release/deployment
  proposals. This does not authorize Codex to perform those actions.
- `no_merge`: complete only the narrower authorized scope, such as review or local
  preservation; publication also requires its own authorization/conditions.

An explicit task restriction always wins. A missing/unclear scope, classification
or provenance must be resolved before automatic merge. **READY FOR OWNER MERGE**
requires scope, dependency/base, full local/fresh, independent review, publication
and current-head hosted gates; provide PR URL, exact head, checks and limitations.
PASS never implies release, deployment, product certification or a new phase.

## Automatic squash merge eligibility

Every condition A–I must be observed as currently true. Unknown/unavailable facts
fail closed; no evidence substitute or silent waiver grants merge authority.

| Gate                                          | Required observation                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — Authorized objective**                  | Entire diff belongs to an already owner-authorized Class A/B objective and permits `automatic_when_eligible`. Merge does not authorize a phase, accept/change a proposed ADR/product policy, expand scope or implicitly resolve any Class C decision. V2 effectiveness on protected main is proved separately from this candidate.                                                                                                   |
| **B — Trusted PR origin**                     | Head and base are this same Math Adventure repository; head is a Codex-owned or expressly owner-authorized feature branch, normally `codex/`, with task provenance; base is protected `main`. A namespace alone is not provenance. External/fork, Dependabot/third-party and unrelated manually created PRs never qualify merely through green checks.                                                                               |
| **C — Current main/base**                     | Immediately fetch/read main and record its SHA. Prove the candidate is current enough under the strict required-status policy, with main ancestry or equivalent verified reconciliation as appropriate. If main advances and reconciliation is needed, merge normally without rewriting published history; review the resulting full diff and rerun/reobserve required gates on the resulting exact head. No stale-base assumptions. |
| **D — Exact-head local/independent evidence** | All task-required evidence certifies this exact head: canonical verify; isolated fresh frozen install + verify; acceptable audit; complete diff, dependency/lockfile, artifacts and privacy/secrets review; applicable independent mathematical oracle, browser/device proof, detected/restored mutations and closed specialist review. Required capability unavailable means no merge.                                              |
| **E — Exact-head hosted CI**                  | Actual completed SUCCESS for both `verify (ubuntu-24.04)` and `verify (windows-2025)` in required PR-specific runs for the current head, from the expected GitHub Actions integration. Link run/job IDs, event, PR identity and head. Inspect the applicable current attempts/status contexts, not a convenient earlier successful run.                                                                                              |
| **F — PR/protection state**                   | PR open, non-draft, mergeable, targeting protected main; no conflict or unresolved review thread; required checks/approvals satisfied; active protection/ruleset unchanged, strict status checks and required thread resolution enforced, no bypass, squash allowed. Unknown mergeability or unreadable protection is unavailable evidence.                                                                                          |
| **G — Material findings**                     | Every finding repaired/reverified or explicitly bounded as an accepted limitation already allowed by the objective. No outstanding HUMAN DECISION REQUIRED or BLOCKED — EVIDENCE UNAVAILABLE for this candidate. A new limitation requiring human acceptance is not self-accepted.                                                                                                                                                   |
| **H — Candidate cleanliness**                 | No unrelated change, real learner/child media, credential/secret, private export/database/log, accidental generated evidence, prohibited external resource or unresolved contamination. Review full commits/diff and proposed public evidence as well as tracked filenames.                                                                                                                                                          |
| **I — Accurate PR evidence**                  | PR body/current completion record states scope, exact head, local/independent verification, hosted CI, limitations and explicit exclusions accurately. Resolve stale or misleading records before merge.                                                                                                                                                                                                                             |

Queued, running, cancelled, skipped, neutral, timed-out or runner-unavailable jobs
are not SUCCESS. Neither older-head CI, push-only success with missing/cancelled
PR contexts nor local success satisfies E. Reproducible failures need repair;
transient/unavailable runners need permitted evidence retry, otherwise report
**BLOCKED — EVIDENCE UNAVAILABLE** and do not merge.

A prior source head never automatically certifies a documentation-only follow-up.
Reuse is allowed only with an explicit task-governance proof: identify old/new
SHAs, inspect every changed byte to establish docs-only scope with no executable
policy/config/eval/skill change, map unchanged source/build/independent proof to
the new candidate and complete that head's own required verification, diff/link/
privacy review and independent review as applicable. Hosted checks must always
succeed for the new exact head. If classification or reuse is uncertain, rerun
the full/fresh gates. Changing merge instructions or eligibility logic is a
governance behavior change even when its file extension is `.md`.

## Final check, squash action and races

Re-read all decisive state as close to the merge as practical: head, main/base,
current required PR checks, all review threads/required approvals, draft/open/
mergeability state, full-diff classification, findings, evidence record and
protection/allowed method. Record the fresh observations, expected head SHA and
main/protection identity. Paginate checks, reviews and threads to avoid omission.
If any fact changed or cannot be proved, **DO NOT MERGE**; reconcile/reverify.

Use only the normal protected GitHub squash merge with the expected head SHA
precondition (REST `sha`, or an equivalent supported head guard). Strict server
protection must still enforce current base/checks/thread requirements at the
action. A head guard alone does not guard main, reviews or rulesets; local reads
are not an atomic GitHub transaction. Stop if the permitted tool cannot supply
the head precondition or normal server enforcement. Never bypass protection,
use administrator bypass, force-push, directly push a synthetic merge commit to
main, weaken/disable checks, dismiss/fabricate reviews or alter protection.
Do not enable deferred GitHub auto-merge and walk away: later execution could
outlive the verified scope/evidence state. This policy permits an immediate
normal squash merge after eligibility is observed; it grants no repository
setting change.

If main/head/checks/reviews/protection change before submission, restart
eligibility. A server rejection requires diagnosis and fresh evidence, not a
blind retry. A timeout, uncertain response or ambiguous result requires inspecting
GitHub PR/main state before any further action. If protection changes unexpectedly,
hold merge and report the human-only protection decision; do not restore it
autonomously. Unexpected post-action state also stops dependent continuation.

Use the existing commit style, normally `<PR title> (#<number>)`, with a coherent
descriptive squash message. The action is not release/tag/deployment authority.
GitHub's [merge API](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)
documents the head SHA precondition; [protected-branch guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
documents strict checks. Sources accessed 2026-10-06. Residual concurrent-state
limits must be reported; the synthetic guard cannot establish server behavior.

## Post-merge verification and queued goals

A successful action is provisional until the actual merged state is verified:

1. Fetch/read protected main and the PR; observe PR **MERGED** and record its
   actual squash/merge SHA, distinct from the feature head.
2. Prove main points to or contains that commit as expected, identify any
   intervening main advancement, and re-read unchanged active protection/rulesets.
3. Observe any required post-merge CI under the task/project policy. A required
   failure/unavailable result blocks dependent continuation; local success is no
   substitute. Current policy requires PR-specific CI; it does not invent a new
   post-merge CI requirement solely because push runs exist.
4. Verify Codex did not trigger a release, tag or deployment without separate
   authorization; report PR, feature head, actual squash SHA, main and gate state.

An ambiguous merge result is **STOP — inspect GitHub; no blind repeat**. Do not
declare success or start a dependent Goal until merged state, protection and
required post-merge observations are positive. Continue only an already
owner-authorized queued Goal whose declared parent condition is now satisfied
and whose start does not require a Class C decision. A successful merge never
authorizes an invented next phase or Phase 3C.
