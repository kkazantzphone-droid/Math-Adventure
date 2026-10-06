# Explainable adaptive learning model

Status: PROPOSED rule policy under [ADR-0006](adr/ADR-0006.md). Product principles are accepted; all thresholds and schedules below are **unvalidated starting hypotheses**, versioned as policy-v1 and subject to educator review before child trials. This model reports observed task evidence, not intelligence, diagnosis or school grades.

The [Phase 3 synthetic review](PHASE_3_ADAPTATION_REVIEW.md) exercises this proposal
without accepting it. Default two-representation Secure coverage is not reachable
from a Phase 2 family that declares only one representation. With at most two
credits per evidence fingerprint, a universe of four fingerprints also cannot
fill ten observations. Family coverage/diversity must be demonstrated and
reviewed, not manufactured through cosmetic changes. Proposed corrections and
ambiguous rule interpretations stay explicit in the review; no numeric policy
is changed here. [Stage 3B](PHASE_3_IMPLEMENTATION_PLAN.md) remains a separately
authorized synthetic implementation, not permission for real-child profiling.
The review also identifies cross-priority starvation: strict Developing-before-new
selection can alternate two Developing concepts while never offering a ready
Unseen concept. A reviewed bounded lower-priority opportunity is a correction
proposal; the rule below is preserved rather than silently amended.

## Alternatives and selection

| Approach | Strength | Limitation here | Decision |
| --- | --- | --- | --- |
| Simple success threshold | Easy to implement/explain | Guesses, repeated items and a single view may inflate success; weak recovery rules | Use explicit conditions within a state machine |
| Weighted evidence | Compact flexible aggregation | Arbitrary hint/recency weights imply false precision | Defer until specific evidence justifies weights |
| Deterministic state machine | Auditable states, hysteresis and reason codes | Thresholds still require evaluation | Proposed V1 |
| Bayesian/BKT-style estimates | Explicit uncertainty and learning/guess/slip models | Parameter/content calibration and skill mapping; early-math transfer unverified | Research alternative, not V1 |
| Elo-like ratings | Compact learner/item ordering | Flattening dimensions; calibrated item difficulty required; timing variants conflict with policy | Defer |
| Opaque ML | Potential fitted prediction | Insufficient data, privacy and explanation burden | Reject V1 |

[BKT sources and research limits](EDUCATIONAL_RESEARCH.md) do not validate any V1 threshold. There is no percentage marketed as mastery probability.

## Observation and independence

Learner state is keyed by canonical concept and representation, with independent but related domain views: number sense, arithmetic, patterns/sequences, multiplication/division, geometry/spatial reasoning, measurement, exponentiation/roots, fractions, decimals/percentages, algebra, logic and probability/combinatorics. There is no stored global math level or whole-domain gate. An advanced arithmetic learner may have Emerging spatial skills without being moved back in arithmetic.

Cross-domain prerequisites are explicit concept edges with rationale/probe routes. Related/inverse/representation links (arrays/multiplication, squares/powers, roots/inverse powers, fractions/area, coordinates/geometry, measurement/arithmetic) do not grant mastery. A shared canonical concept appears in multiple domain views once; a multi-concept task contributes only to its declared independently assessable evidence scopes, with no duplicate credit simply from domain tags. Parent views show concept scope/uncertainty by domain, never a comparative domain rank.

One logical observation per completed practice instance includes concept/representation, task fingerprint, evidence fingerprint, session ordinal, coarse local day, outcome, meaningful attempt count (capped), highest mathematical hint tier, exposure-to-solution flag, mode and policy/generator versions. Outcomes are independentSuccess, supportedSuccess, unsuccessful or excluded. Determine eligibility against the pre-event window and freeze the recorded classification; replay never compares an observation against itself.

A task fingerprint captures mathematical operands/relationships. A family-defined evidence fingerprint also includes educator-reviewed meaningful variation (representation, spatial arrangement, unknown position or strategy demand); it excludes locale, instance ID and cosmetics. “Independent success” means first meaningful submission correct, no mathematical hint/solution exposure, valid accessible task, and qualifying evidence diversity. Immediate identical evidence is excluded. Proposed delayed retrieval rule: an identical evidence fingerprint may count again after at least 2 coarse days and in a distinct session, at most twice in a retained window. Meaningful layouts can distinguish small-quantity tasks; arbitrary cosmetic relocation cannot. Each finite concept must demonstrate that its coverage/threshold is attainable, or declare an educator-reviewed family-specific threshold with finite-universe rationale.

Speech replay, screen-reader use, enlarged text, alternate controls and instruction clarification are accessibility support, **not mathematical hints**. Input/UI errors do not count as mathematical submissions. Count solution-equivalent tasks with identical operands/relationships as the same fingerprint even if translated, relaid out or assigned a new instance ID.

Supported success is a learning experience; it is not independent evidence. Unsuccessful completed practice indicates a need for support, not punishment. Exclude skipped, interrupted, adapter-failed, abandoned, solution-exposed and nonqualifying repeated tasks, Number Lab and ahead exploration from the practice windows entirely. A supported success before full solution exposure remains eligible but non-independent. A family must declare which observation is educationally interpretable. No raw speech, keystrokes or free-form response logs are needed.

For multiple-choice tasks, lucky answers are possible; varied tasks, representations and open/transfer responses where accessible limit overstatement. Distractor properties alone cannot diagnose a misconception. Repeated domain-defined error tags can request a strategy/representation; parent wording is “this relationship may benefit from another example.”

## States, flags and coverage

Each concept starts Unseen (parent display: “Not enough evidence”). After one meaningful completed learning/practice experience it is Emerging. Eligible practice completions have one of independentSuccess, supportedSuccess or unsuccessful outcomes; excluded observations cannot enter the denominator. Developing requires a full 5-observation window, at least 3 independent successes and at least 2 distinct evidence fingerprints.

Secure requires a full 10-observation window, at least 8 independent successes, across at least 2 sessions, the concept's declared representation coverage, and at least 2 distinct transfer/variation tasks within those successes. Default coverage is at least 2 independent successes in each of 2 pedagogically relevant representation families. Concepts that inherently assess one representation, such as visual subitizing, must declare an educator-reviewed single-family coverage rule with layout/quantity transfer cases instead. Do not invent a second family merely to satisfy the default.

The latest window is bounded by the storage retention limits: at most 10 per concept, at most 500 across a learner, at most 60 days. Eviction yields “insufficient recent evidence”; no completion is invented. A recent state transition uses available observations only. Session means a stored local ordinal advanced on explicit session start/resume after an actual end, not every refresh. Distinct sessions are a weak diversity safeguard, not proof of long-term learning.

Secure is an attained evidence state with recorded coverage and a minimal promotion summary; a single failure or elapsed time cannot erase it. Separate flags govern current recommendations:
- needsSupport: a full 5-observation window contains at least 3 non-independent eligible completions across 2 sessions; assisted success and unsuccessful completion are distinguished in explanations.
- reviewDue: a staged local schedule described below. One revisit opportunity per session, no overdue penalty or forced backlog.
- limitedEvidence: current evidence is too sparse or required coverage inaccessible/unobserved.

Clear needsSupport only after 3 varied independent revisit successes across 2 sessions. An immediate pair of unsuccessful/high-hint experiences offers easier work, another representation, a worked example or stopping; it need not wait for a state transition. Flags change at a stable session checkpoint. Prior accomplishments remain visible; no score drops. If sustained evidence conflicts with earlier Secure status, display “Previously demonstrated; needs another look” with evidence, not a claim of current universal competence.

Persist reviewStage and nextReviewDay. On first independent readiness confirmation, stage 0 schedules day +2. A due revisit completed independently advances to stage 1 with completion day +7, then stage 2 with completion day +21, then stage 3 with completion day +30; subsequent successful due revisits keep stage 3 and +30. Skips, support and unsuccessful completions leave the stage/date unchanged and use the per-session offer cap. Unrelated practice does not reset the schedule. If overdue, offer one current revisit, not every missed date. Clock uncertainty suspends date-based changes pending parent resolution. These intervals/stages are hypotheses, not a forgetting model.

A concept may be Secure for a declared accessible scope while a visual-specific concept stays unobserved. Never penalize inability to access a representation or announce a quantity answer to assistive technology and count it as independent visual recognition.

## Readiness and cold start

Start with optional brief unscored probes and familiar visual choices, no age or reading assessment. If declined, use an easy invitation with immediate harder-choice access. Positive probes set local recommendation readiness only for observed skills; they do not mark an entire graph Secure. Necessary prerequisite evidence can be met by Secure in required scope or an explicit recent independent diagnostic confirmation specified by that edge. Recommended teaching edges can be bypassed with a documented reason.

For curious learners, offer child-selected exploration ahead without negative updates to ordinary practice/prerequisite evidence. An independent exploratory success may offer a low-pressure confirmation task in normal practice; it does not automatically promote the concept. Number Lab keeps no scored observations. Parent manual/non-adaptive selection is available in the design; adaptive profiling/legal assessment remains a launch question.

Represent the distinction in application/domain contracts: mode = practice | diagnostic | exploration | numberLab and an event kind = exploratoryExposure distinct from eligibleLearningObservation. Number Lab/exploration can emit session-only exposure events for safe presentation/help, including large numbers, multiplication, powers, squares, roots and patterns; they never enter mastery windows, readiness promotion or negative updates. No persistent exposure history is necessary by default. A later confirmation is a new interpretable observation, not conversion of exposure into evidence.

## Deterministic selection and anti-repetition

Inputs are snapshot, valid catalog, child/parent intent, policy version, coarse day and selection seed. Priority is:
1. explicit child/parent choice (including exploration/manual play);
2. requested help or active needsSupport;
3. one relevant due revisit opportunity;
4. suitable Developing concept;
5. new prerequisite-ready concept or optional probe;
6. familiar varied task or Number Lab/stop offer.

Within a priority, form a canonical-ID-ordered list of equally least-recently-offered eligible concepts, then select with the explicit selection PRNG. Track bounded last-offered summaries; never use hidden platform time. Within a family/concept change only one dimension at a time; moving to another family uses a reviewed prerequisite/difficulty bridge. Proposed cap: 3 consecutive scored tasks in one concept; representation changes may occur within that block. After 3, require a different concept, unscored example or menu/Number Lab/stop offer. Cap the same support/review priority at one offered block per session unless child requests more, so other concepts cannot starve. Failed generation tries the next bounded candidate and then a safe menu.

Time away sets reviewDue/limitedEvidence, not loss of achievement or alleged forgetting. Recovery starts with a choice of familiar work, a gentle probe or exploration. Parent-selected challenge and language changes do not reset mathematical state. Representation-specific support influences presentation, not arbitrary global “level.”

## Explanation and implementation checks

Return a language-neutral Recommendation with reasonCode, selected concept/dimensions, supporting counts/coverage, policy version and alternative choices. Localisation renders the reason; speech cannot add claims. Example: “Another crossing-ten activity is offered because three recent within-ten tasks were solved independently and visual crossing-ten work has begun.” Show this only when actual counts/observations support it.

Parent view might show Addition within 10 — Secure (quantities and symbols observed); Crossing 10 — Developing; Missing addend — Emerging. Show scope and uncertainty, no sibling view/ranking.

Test cold start/declined probes, independent arithmetic/spatial/powers paths, scoped cross-domain evidence without duplication, exploratory exposure that never promotes, full-window boundaries, finite concepts attaining Secure through legitimate variation/delayed retrieval, cosmetic/immediate duplicate and exposed-item exclusion, frozen eligibility, accessibility neutrality, sparse retention, session refresh, support hysteresis, staged revisits, exploration neutrality, time-away, fairness and deterministic replay. [Learner data](LEARNER_DATA_MODEL.md) owns retention/transactions; [testing](TESTING_STRATEGY.md) supplies scenarios. No rule is claimed validated until consented human evaluation and independent educator review.
