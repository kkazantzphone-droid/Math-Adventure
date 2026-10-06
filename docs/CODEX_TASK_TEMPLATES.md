# Codex task templates

Use these short templates with [AGENTS.md](../AGENTS.md), the
[operating model](CODEX_OPERATING_MODEL.md) and the
[decision register](DECISION_REGISTER.md). Replace brackets with concrete bounds;
link the existing safeguards rather than copying the engineering constitution.
Workflow permission and product/task scope remain separate.

## Autonomous Goal

```text
Objective: [concrete problem and required resulting behavior]
Scope authority: [owner instruction / accepted decision / authorized phase]
Source of truth: [relevant docs, ADRs and current completion report]
Non-goals: [excluded behavior, files or phases]
Candidate: [branch/base; independent or stacked; parent/publication conditions]
Acceptance evidence: [required local gates, independent oracle/review,
  applicable mutations/browser evidence and required current-head hosted checks]
Authority: Class A within this scope; Class B standing workflow permission
  subject to the publication conditions above. Class C remains human-only.
Execution: Investigate, implement, review, verify and repair ordinary failures
  autonomously. Preserve unrelated work and use synthetic material only.
Stop conditions: Objective satisfied; required evidence unavailable; or a
  Class C/scope decision needed. Complete unaffected authorized work first.
Report: PASS, BLOCKED — EVIDENCE UNAVAILABLE, or HUMAN DECISION REQUIRED;
  exact candidate/results, bounded claims and remaining gates. Claim READY
  FOR OWNER MERGE only after the operating model's publication/CI gates pass.
```

## Autonomous Review

```text
Review target: [exact revision and full comparison base/diff]
Scope authority and sources: [authorized review, docs/ADRs/current evidence]
Review questions: [truth, architecture, privacy, UI or other concrete risks]
Repair scope: [review-only, or precisely authorized bounded repairs]
Non-goals: [excluded behavior/policy changes]
Acceptance evidence: [independent method, reproductions, required checks;
  do not treat the implementation's claims as independent proof]
Authority: Class A review and scoped repairs; Class B only for an authorized
  candidate whose publication conditions are met; Class C human-only.
Execution: Report/reproduce material findings, repair within authority and
  independently recheck. Continue ordinary failure-repair loops.
Stop/report: Use the three standard outcomes; give revision, finding/evidence,
  disposition, limitations and remaining gates. Review PASS is bounded to
  this review and does not establish product or merge readiness by itself.
```

## Human Decision Request

```text
Outcome: HUMAN DECISION REQUIRED
Objective/candidate: [authorized goal, revision and dependency state]
Decision/action required: [one precise Class C or new-scope decision]
Why gated: [operating-model boundary and relevant accepted decision]
Prepared result: [reviewable proposal/artifacts and completed verification]
Options and recommendation: [concrete choices and their consequences]
Evidence/limitations: [observed facts; unresolved risks or specialist review]
Owner response needed: [precise acceptance/choice/action]
Resume condition: [observable decision/result and permitted remaining work]
State: [unaffected work completed; gated action has not been performed]
```

## Blocked Evidence Report

```text
Outcome: BLOCKED — EVIDENCE UNAVAILABLE
Objective/candidate: [authorized goal, exact revision and dependency state]
Required evidence: [acceptance condition that cannot be observed]
Attempts: [permitted tools/methods tried and their concrete results]
Completed evidence: [passing checks and their actual bounds]
Unverified claims: [what mocks/source/local checks cannot establish]
Blocker: [missing capability/access; do not relabel it as implementation PASS]
Smallest resume condition: [specific tool/device/observation needed]
State: [safe partial work preserved; unaffected work completed; no scope,
  accepted-policy, machine-access or publication-condition expansion]
```
