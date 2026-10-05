# Codex operating model — V1

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

| Class                                                  | Permission within authorized scope                                                                                                                                                                                                                                                                                                                                                | Boundary                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Autonomous reversible engineering**              | Inspect and investigate; design within accepted architecture; edit source, tests and docs; refactor; use visibly synthetic fixtures; create/use isolated worktrees and subagents; run local verification, appropriate mutations and available browser QA; diagnose/repair failures; reconcile current docs; create logical local commits. No per-step owner approval is required. | Preserve unrelated work, review the entire candidate and restore temporary mutations. Reversibility does not excuse privacy, truth or integrity violations.                                                                                                                                                                                                                                       |
| **B — Autonomous reviewable repository actions**       | Under standing project authorization, push an authorized feature branch to the existing repository; create/update its PR; inspect hosted CI; repair scoped CI failures and push follow-up fixes. No per-step owner approval is required once the task's publication conditions are satisfied.                                                                                     | Protect main and published history. Do not force-push, merge, tag, release or deploy. Repository settings, protection rules, credentials and authorization changes are not routine CI repair.                                                                                                                                                                                                     |
| **C — Human-only decisions and consequential actions** | Codex may investigate, validate safe preparatory work and draft a reviewable proposal; the human owns the decision/action.                                                                                                                                                                                                                                                        | Protected-main merge; tags/releases; deployment; production/public infrastructure mutation; changing accepted architecture, ADRs or product policy; real learner data use; retention/privacy/legal decisions; destructive or irreversible data actions; adding backend/cloud/telemetry; paid/external service commitments; credentials, account access or security/authentication-policy changes. |

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
agent decisions; they do not replace a candidate's engineering evidence. Current
Codex autonomy V1 verification is recorded in its
[completion report](CODEX_AUTONOMY_V1_COMPLETION_REPORT.md).

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

## Publication and human merge gate

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

Use **READY FOR OWNER MERGE** only when the scope, dependency/base, full local
verification, required independent review, publication and required current-head
hosted checks all satisfy the declared gates. Report PR URL, exact head, observed
checks and remaining bounded limitations. Protected-main merge remains the
human's action. PASS never implies release, deployment, broader product
certification or authorization of the next phase.
