# Phase 3 implementation plan — first playable slice

Date: **2026-10-06, Europe/Athens**. Status: readiness design; **Phase 3
implementation has not started**. The owner authorizes this plan, documentation
closure and synthetic review tooling under D45, based on protected main
`93db59893b076925b1fdb5fadfa5abb9dfb274ac`. Certification evidence belongs in the
[readiness report](PHASE_3_READINESS_REPORT.md). Each implementation stage needs
its own explicit owner Goal; this plan is the reviewable scope for those Goals.

Sources: [Phase 1 closure](PHASE_1_COMPLETION_REPORT.md), [roadmap](ROADMAP.md),
[operating model](CODEX_OPERATING_MODEL.md), [register](DECISION_REGISTER.md),
[application contracts](APPLICATION_PORTS.md), [data model](LEARNER_DATA_MODEL.md),
[proposed adaptation](ADAPTIVE_LEARNING_MODEL.md),
[testing](TESTING_STRATEGY.md), [security](SECURITY_THREAT_MODEL.md),
[accessibility](ACCESSIBILITY.md), [languages/speech](LOCALISATION_AND_SPEECH.md),
[open questions](OPEN_QUESTIONS.md), accepted ADRs 0003/0009/0010/0012 and
**proposed ADR-0006**. Readiness selects engineering rehearsals without accepting
retention, profiling defaults, educational thresholds or release policy.

## Containment and authority

3A/3B/3C development can proceed under a separately authorized Goal with
**synthetic/local developer profiles only**. No unresolved launch decision needs
to block that bounded work. A local profile can still contain real learner data;
the word “local” grants no real-child-use permission.

The future synthetic harness must be a separate developer entry/build on an
isolated loopback origin, absent from the normal production entry. A query flag
or “synthetic” name alone is insufficient containment. Seed a fixed allowlist of
obviously synthetic IDs and neutral labels, with no nickname/free-text/history
import. Tests must prove the normal child composition never imports/opens the
adapter or adaptation engine. Startup without the developer capability must
fail closed, not fall back to a real-user database. Developer origin, database
name and fixtures are distinct from any eventual learner deployment. Synthetic
capture starts with a fresh controlled browser context; never inspect a daily
profile or an arbitrary existing database. This readiness task opens no database.

Class A covers scope-bound implementation, synthetic fixtures, reviews, repair,
docs and local commits. Class B covers feature pushes, PRs and ordinary CI repair
after clean full/fresh certification and merged-base reconciliation. Class C
retains protected-main merge, deployment, release, accepted-policy/ADR changes,
real learners, retention/legal decisions and credentials/access expansion.
Neither a certified plan nor a green synthetic build starts the next stage.

## Stage 3A — local data foundation

**Entry:** owner authorizes the synthetic-only 3A Goal; verified merged base
includes Phase 1/2; clean candidate and pinned frozen installation; read the
[persistence design](PHASE_3_PERSISTENCE_DESIGN.md), ADR-0010 and codec/conformance
source. No product-policy decision is needed for this confined implementation.

**Deliverable:** the smallest browser-standard IndexedDB adapter behind
`AtomicRecordRepository<T>` plus a bounded synthetic learner aggregate codec.
Production-quality transaction behavior is exercised only through the separate
developer harness. No normal child UI integration, adaptive decisions, real
data, dependency wrapper, export UI or background retention service is included.

Required work:

- Exact schema/envelope validation, monotonic database/record versions, one
  profile aggregate and globally scoped control/receipt stores; opaque IDs,
  record-local revisions and safe-integer global epoch.
- Validation → epoch → exact success receipt → expected revision inside the
  real transaction; payload/revision/receipt commit together. Resolve “saved”
  only on transaction completion. No upsert, partial write or dedupe bypass.
- Profile partitioning, explicit create and fresh IDs, global delete fence,
  survivor preservation, stale-tab refusal and bounded receipt-capacity refusal
  for new create/update only, without pruning retryable success receipts. Exact
  retries, delete and full clear remain available through their normal checked
  transactions; native errors/overflow still apply. Revisions/epochs never wrap.
- Forward migration rehearsals with explicit synthetic fixture versions,
  bounded validated checkpoint, abort/reopen/recovery and future-schema refusal.
  Blocked `versionchange` asks clients to close; it never deletes the database.
- Denied storage/quota/abort/eviction states, read-only recovery and visibly
  unsaved memory-only continuation without an automatic later write queue.
- Multi-tab command/delete/full-clear races and origin-owned cleanup. Database
  fence commit and cache cleanup are separate steps; report cleanup pending if
  client/cache cleanup cannot finish. No cross-API atomicity claim.
- Future export/import envelope compatibility specified and fuzzed with
  synthetic records; importing UI and accepting private files remain deferred.

**Exit:** the existing reusable repository suite runs against the actual adapter;
every row in the persistence conformance matrix has observed real-browser
evidence or is explicitly blocked. Deterministic fault injection establishes
error-path atomicity, while genuine browser quota/denial/eviction evidence is
reported separately. Actual Windows Chrome and Edge must each exercise native
transactions, two clients, reopen, interrupted migration, blocked upgrade and
unknown-schema write refusal.
Independent persistence/security/test reviews close ordinary findings. Full and
isolated-fresh verify, audit, mutation detection/restoration, local links,
privacy/artifact/lock review pass. Chrome loopback evidence alone cannot certify
target-device storage durability; list untested surfaces precisely. No real-data
use or retention policy is approved by the 3A exit.

**Rollback:** abort failed transactions; reopen the previous compatible schema
or read-only recovery. Never downgrade a migrated database or reset on an error.
A code rollback must have a compatible schema range; otherwise ship a forward
fix. Preserve checkpoint within the synthetic bound and refuse new writes while
recovery is unresolved. Adapter availability is independent of gameplay truth.

## Stage 3B — explainable adaptation foundation

**Entry:** separate synthetic-only 3B Goal after 3A exit, or an explicitly
authorized memory-only parallel review; no persistence coupling before 3A passes.
Read the [simulation review](PHASE_3_ADAPTATION_REVIEW.md), all proposed policy
gaps and the content/evidence declarations. ADR-0006 stays PROPOSED.

**Deliverable:** a framework-independent deterministic state machine and explicit
versioned proposed policy configuration, exercised with synthetic histories.
Inputs include frozen evidence, catalog/scope, manual/child intent, supplied day,
session/checkpoint and selection seed. Platform time, locale, speech, UI,
achievements and hidden randomness cannot decide truth or progression.

Required work:

- Freeze classification using the pre-event window; first meaningful independent
  submission, mathematical hints, retries and solution exposure are distinct.
  Accessibility/read-aloud/input recovery are neutral. Skips, invalid tasks,
  adapter failure and exploration/Number Lab do not enter evidence denominators.
- Canonical concept/representation state with no global level or duplicate
  credit from domain tags. Geometry/measurement and arithmetic remain independent.
- Unseen/Emerging/Developing/Secure evidence and separate limitedEvidence,
  needsSupport/reviewDue flags, counts/coverage and reason codes. Achievements
  survive a single error/time away; recommendations expose uncertainty.
- Deterministic staged revisit schedule, stable-session flags/support hysteresis,
  clock-uncertainty suspension, manual selection and child overrides.
- Explicit fairness, bounded candidate generation, anti-repetition, priority
  blocks and menu/help/stop alternatives; no infinite support/review loop.
- Finite-universe and representation attainability proofs for each catalog
  evidence scope. Do not grant Secure merely because test histories invent
  evidence that no actual family can produce.

The current 5/10 windows, 3/8 success counts, 2-day delayed duplicates, revisit
2/7/21/30 days and repetition cap 3 are **simulation hypotheses**. Before a real
learner engine is enabled, educators must resolve coverage/finite-catalog issues
and the owner must approve/version policy. Synthetic variants may compare
corrections while recording which proposal they simulate; they do not replace
policy-v1 silently. A scope with impossible coverage reports limited evidence.
The proposed strict Developing-before-new priority can also alternate two
Developing concepts indefinitely while a ready Unseen concept waits. Test that
counterexample and compare explicitly versioned proposal variants for a bounded
lower-priority opportunity; equal-priority fairness and repetition caps alone
cannot certify global nonstarvation. A single-family geometry scope must enumerate
meaningful evidence cases for its actual bound: transformed parameter tuples are
not automatically independent educational variation.

**Exit:** hand-scripted histories plus independent expected state/reasons cover
all readiness scenarios and threshold boundaries, finite reachability, frozen
replay, profile/domain isolation, support clearing, due offers, clock rollback,
retention eviction, fairness and manual mode. Mutation assertions catch hint
credit, cross-domain promotion, duplicate credit and starvation defects. Fresh
adaptation/education-logic and test reviewers inspect raw inputs/expectations;
their engineering review is not credentialed educator approval or efficacy
evidence. Full/fresh gates pass. Production default remains disabled and no real
profiling policy is accepted.

**Rollback:** retain attained summaries with their policy/scope IDs; do not
reinterpret old frozen evidence under an old ID. Unsupported versions yield
manual play/read-only evidence rather than recomputation/reset. Recommendation
failure yields a safe bounded menu, never loss of mathematical access.

## Stage 3C — first playable child loop, synthetic developer build

**Entry:** separate 3C Goal after 3A/3B exits; narrow catalog and modality scopes
reviewed; schema/update compatibility plan and draft message inventory complete.
The first synthetic milestone can use manual selection while proposed adaptive
recommendations remain visibly developer simulations. Official translations,
real-child trials and public release are distinct later human gates.

**Deliverable:** select a synthetic profile → deterministically generate a task →
answer or hint/replay/skip → atomically commit eligible bounded outcome → next
choice/reason → safe save/restart. Include language switching, verified offline
use, update freeze/recovery, unsaved/read-only paths and stop/help. Demonstrate
two independent profiles in tests. A small optional cosmetic discovery may
acknowledge activity; it cannot affect access, evidence or save correctness.

Gameplay requirements:

- Regenerate/validate against immutable family replay before evaluating a
  structured answer. UI never supplies expected truth or evidence attribution.
- In explicit proposed-policy simulation mode, a task terminal command commits
  observation, relevant concept/flags,
  recommendation metadata and any cosmetic event/dedupe atomically. Failed save
  leaves the persisted state unchanged; do not reclassify a retried observation.
  In no-evidence/manual mode, save preferences/session progress only, without
  observations or derived profiling state.
- Track session ordinal across actual end/resume, not each refresh. Reload of a
  pending command reconciles epoch and operation receipt before resubmission;
  profile switch cancels obsolete work and clears exploratory memory/speech.
- Child can select another activity, help, skip or stop without penalty. Replay
  speech is explicit, exact-region and localService-only; unavailable speech
  preserves all visual controls. Unsupported generated speech stays absent until
  a bounded fixed semantic plan is reviewed, never arbitrary learner text.
- Save status and offline shell readiness are separate. A cached shell does not
  promise saved learner progress. Quota/denial/read-only recovery offers unsaved
  play, adult help or stop without confusing success/punishment messages.
- Adaptation off/manual selection neither collects evidence for later profiling
  by surprise nor enables a hidden recommendation engine. The synthetic harness
  exercises separate “no evidence” and explicit “simulate proposed policy” modes.

**Exit:** actual synthetic E2E correct/incorrect/support/skip/stop paths, restart,
mixed roles/language changes, two profiles, storage failure, deletion during
pending answer, stale tabs and complete learner-data/update compatibility proof.
Use real build at root and subpath, disconnected/offline restart, all-tab freeze,
abort/blocked update and compatible/incompatible schema releases. A transaction
in flight or unknown reconciliation state prevents update readiness; all clients
must be drained/fenced and acknowledge before activation, then validate epoch,
record schema and version before interaction resumes. Reuse Phase 1E controls
with these additional data guards; a Home screen alone is no longer sufficient.

Rendered acceptance uses keyboard/touch/native controls, clear focus before and
after feedback/dialogs, ≥44px child targets, 320/375/768/1024px widths,
portrait/landscape, 200% text and actual zoom where available, no colour-only
feedback, reduced motion, mixed language semantics and screen-reader delivery
on target devices. The complete 3C exit requires at least one observed target
device/browser/assistive-technology combination and actual disconnected restart.
If either required observation is unavailable, record BLOCKED — EVIDENCE
UNAVAILABLE for the full stage; a separately authorized narrower engineering
milestone may be preserved with those gates still open. Additional untested
devices cannot receive support claims. Provide geometry/unit alternatives without answer leakage;
declare modality-specific scope rather than inventing visual evidence. Review
draft strings in all three locales and preserve the four planned manifests.
Run request inventories without learner values, artifact/privacy review,
independent accessibility/child-UX/security/truth/QC reviews and full/fresh gates.
Actual-device gaps block corresponding support claims; synthetic loop closure
does not imply consented child use, official packs, release or effectiveness.

**Rollback:** stop new commands and cancel speech; reconcile transaction outcome,
epoch and receipts. Keep compatible shell/data pair. A failed staged update
retains the usable shell; incompatible data keeps the app read-only with adult
recovery/manual unsaved alternatives. Never restore old checkpoints over the
destination deletion fence. No automatic rollback that downgrades data.

## Smallest staged catalog

Phase 2 families/replay IDs are immutable and reusable where their evidence
matches the intended task. The accepted scripted Phase 1V is a visual reference,
not a generator/validator. Add bounded families incrementally under the 3C Goal.

| Activity            | Proposed finite bound / implementation order                                  | Truth and evidence limit                                                                                           |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Addition            | First loop proof; reuse `number.addition` maximum 5 (sum 0–10)                | Part-whole evidence for the declared groups representation; no automatic counting credit                           |
| Shape/spatial       | Reuse inclusive `geometry.quadrilateral`, maximum 1–3                         | Attribute-based square/rectangle/parallelogram classification, not unaided recognition; no arithmetic prerequisite |
| Exact unit length   | Reuse `measurement.unit-length`, maximum 8                                    | Iterate 1–8 equal logical length units; no physical centimetres or visual-estimation claim                         |
| Numeral recognition | New family, numerals 0–5 paired with structured quantity/numeral alternatives | Distinguish numeral relationship from inaccessible visual subitizing; exhaustive six values                        |
| Counting            | New family, 0–5 items with reviewed meaningful layouts                        | One-to-one/cardinality scope; quantity answer must not be given by alt text and credited as visual recognition     |
| Comparison          | New family, each quantity 0–5; include equality                               | Exhaustive 36 ordered pairs, exact less/equal/greater; no speed inference                                          |
| Subtraction         | New family, total 0–5 and removed 0–total                                     | Exhaustive 21 pairs, nonnegative result; independent token-removal oracle                                          |
| Missing number      | New family, `a + b = c`, a,b 0–5; one declared unknown position               | 36 operand pairs × 3 positions; classify unknown-position variation explicitly, avoid double addition credit       |

First integrate the three proved families, then the five small new bounded
families to complete the roadmap catalog. Each requires new immutable behavior
and content version where appropriate, runtime answer/hint/scope codecs,
independent exact enumeration, golden seeds, meaningful mutation and rendered
modality review before entry. No counting-layout diversity is invented by cosmetic
pixel relocation. Broader geometry/measurement and powers/roots remain future
content; the existing sixteen-tile powers/root exploration remains unscored,
session-only and separate from demonstrated mastery. No full world or economy.

## Human decisions by latest necessary gate

| Gate                                | Minimum decision                                                                                                                                                                                                                                                                   | Owner / treatment now                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A — before code                     | Explicit new Goal authorizing the named stage and synthetic developer containment                                                                                                                                                                                                  | Owner scope authorization; no product-policy choice needed before synthetic 3A. This readiness Goal does not start it |
| A — before code outside containment | Permission to wire persistence/profiling into normal child composition                                                                                                                                                                                                             | Outside planned development authority; do not request it to start synthetic 3A                                        |
| B — before real-child use           | One retention package: observation counts/window (proposed 10/concept, 500/profile, 60 days), summary/profile inactivity (proposed 12 months), renewal notice/grace/final deletion, checkpoint maximum (proposed 7 days), clock uncertainty and limitations of closed-app deletion | Q03/D19/D20; owner + qualified privacy/legal review. Synthetic caps are test parameters, not policy                   |
| B — before real-child use           | Adaptation on/off default, clear opt-in/control if applicable, manual/parent override and collection behavior when off; educator-approved evidence/coverage/threshold/revisit policy                                                                                               | Q04/Q08, D06/D18/D21; owner + educators/privacy/legal adviser. No production policy silently accepted                 |
| B — before real-child use           | Trial operator/territory/lawful basis, storage-access/profiling assessment, parent/child notices/consent plan and actual-device accessibility/storage suitability                                                                                                                  | Q04/Q05/Q10/Q13; qualified review and owner. No real learner material enters public evidence even after authorization |
| B — before real-child use           | Contextual safety/math/wording review of the bounded child loop                                                                                                                                                                                                                    | Native-language/education/accessibility reviewers; official-pack promotion remains a separate gate                    |
| C — before public release           | Official el-GR/en-GB/de-DE pack review, supported browser/device floor, offline/storage/speech claims, implemented parent backup/import before reliance, approved host/headers/provider metadata/rollback, security channel/responsibilities/maintenance and public notices        | Q06/Q07/Q09/Q10/Q12 plus applicable B decisions; owner release/deployment actions remain Class C                      |

Profile delete/full-clear integrity is accepted engineering behavior. Synthetic
confirmation and removal can be tested now; real-data grace/automatic expiry
remain B decisions. Parent manual mode is available by design, with no covert
collection. `PROPOSED` documentation is retained until the relevant decision is
actually supplied. No extra launch questions are prerequisites to synthetic 3A.

## New language/message inventory

All new 3C wording is **prototype-draft/native-review pending** for el-GR, en-GB
and de-DE. The implementation must version a slice-required schema independently
of pack/content/generator versions. Existing play/home/back/continue/retry/success,
showMe/listen/mute and proof relation/unit strings can be reused only where their
meaning fits. No translations or new packs are produced by this readiness task.

The following IDs define the bounded new inventory. Dotted groups list every
suffix, not an open-ended instruction to invent more copy. `count` and `player`
are bounded synthetic numeric slots; family values are exact DTO-derived bounded
numbers; no nickname/history/answer log enters a message or speech plan.

| Audience / role                    | Required new IDs                                                                                                                                                                                                                                                                                                                                                                                      | Intended meaning / typed slots                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Child / UI                         | `slice.profileHeading`, `slice.profileChoice`, `slice.changeProfile`, `slice.chooseActivity`, `slice.skip`, `slice.stop`, `slice.stopped`, `slice.anotherExample`, `slice.workedExample`, `slice.chooseAnother`, `slice.resume`, `slice.startNewSession`                                                                                                                                              | Neutral profile selection (`player`), stopping/help and explicit session choice                                        |
| Child / UI status                  | `slice.saving`, `slice.saved`, `slice.unsaved`, `slice.saveFailed`, `slice.storageUnavailable`, `slice.askAdult`, `slice.readOnly`, `slice.changedElsewhere`, `slice.reloadChoice`, `slice.noTask`, `slice.retrySave`, `slice.checkingSave`                                                                                                                                                           | Save after commit only; neutral recovery without internal error/ID exposure                                            |
| Child / instruction                | `slice.numeralPrompt`, `slice.countPrompt`, `slice.comparePrompt`, `slice.subtractPrompt`, `slice.missingNumberPrompt`, `slice.numeralHint`, `slice.countHint`, `slice.compareHint`, `slice.subtractHint`, `slice.missingNumberHint`, `slice.solutionShown`                                                                                                                                           | Five new-family prompts/hints and worked-answer exposure; family operands/unknownPosition slots                        |
| Child / accessibility UI           | `slice.answerLabel`, `slice.quantityItems`, `slice.comparisonLess`, `slice.comparisonEqual`, `slice.comparisonGreater`, `slice.missingPosition`, `slice.profileSelected`, `slice.sessionRestored`                                                                                                                                                                                                     | Neutral controls/status; descriptions preserve declared evidence and do not announce the answer to a visual task       |
| Adult / UI reasons                 | `recommendation.manual`, `recommendation.requestedHelp`, `recommendation.support`, `recommendation.revisit`, `recommendation.developing`, `recommendation.new`, `recommendation.familiar`, `recommendation.limitedEvidence`, `recommendation.clockUncertain`                                                                                                                                          | Actual reason-code counts/scope, uncertainty and alternatives; no intelligence/mastery-probability claim               |
| Adult / UI controls                | `slice.adultHeading`, `slice.manualMode`, `slice.simulationMode`, `slice.syntheticNotice`, `slice.recoveryHeading`, `slice.closeOtherTabs`, `slice.upgradeBlocked`, `slice.futureSchema`, `slice.migrationFailed`, `slice.recoveryPending`, `slice.clearPending`, `slice.deleteProfile`, `slice.confirmDelete`, `slice.clearLocal`, `slice.confirmClear`, `slice.cancel`, `slice.retainedFenceNotice` | Developer simulation/control/recovery; destructive actions deliberate, never child punishment or authentication claims |
| Adult / independent language roles | `slice.uiLanguage`, `slice.instructionLanguage`, `slice.numberSpeechLanguage`, `slice.languageDraft`, `slice.speechUnavailable`, `slice.speechReportedLocal`                                                                                                                                                                                                                                          | Independent role choices and honest capability/draft labels                                                            |

Shell cached/update statuses already supplied by Phase 1E are reused; the slice
must distinguish them from saved progress and add a data-compatibility/recovery
reason through the adult recovery IDs above. Deletion details, export/import,
retention/default/profiling notices are B/C policy-dependent copy, outside this
synthetic child-loop inventory. A later policy adds reviewed keys deliberately.

Release-required packs cannot hide missing slice keys behind fallback. Test every
typed plural/select/slot and long string, language of UI vs instruction regions,
offline switching without a fetch, planned-locale requested/effective status and
speech unavailable. New fixed semantic speech plans require their own bounded
validation and native review; exact-local speech remains optional and explicit.
No stored voice/device fingerprint or claim of universal offline voice support.

## Phase 3 threat review and acceptance evidence

This is engineering threat analysis under accepted privacy constraints, not a
new legal conclusion. Qualified current-law review remains a B/C gate.

| Threat / boundary                  | Required control and evidence                                                                                                     | Residual / gate                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Accidental real profiles           | Separate developer origin/build, fixed synthetic allowlist, no personal free text/import and negative normal-entry open tests     | Markers alone cannot prove contents synthetic; reviewer inspects provenance and every artifact        |
| Same-device/extension access       | Logical partitioning and deliberate adult entry, plain-text bounded rendering, no authentication/encryption promise               | Same-origin code/extensions/device users and backups can access data; explain before real use         |
| Eviction/denial/quota              | No “saved” before complete transaction; reopen absence triggers explicit recovery/unsaved state; no silent reset/new profile      | Best-effort browser storage is not backup; physical device checks and later backup gate               |
| Stale tabs/lost response           | Transactional global fence, exact receipt retry, revision check and no update upsert; test submit/delete/full-clear races         | BroadcastChannel/locks help UX only; transaction is the integrity authority                           |
| Deletion/checkpoint restore        | Delete all profile-owned aggregate/staging, rotate fence, clear receipts and obsolete memory, preserve survivors                  | Export/OS/browser copies outside app cannot be erased; no complete-byte-erasure claim                 |
| Migration/corruption/future schema | Bounded validated checkpoint, deterministic forward migration, abort/recovery and refusal to write unknown schema                 | Asset rollback cannot downgrade data; blocked upgrade never deletes DB                                |
| Receipts with payload equality     | Internal fingerprints may contain learner data; same retention/partition/delete protection as aggregate, never public errors/logs | No arbitrary pruning of live retries; capacity exhaustion visibly reconciles/refuses                  |
| Export/import                      | Defer UI; versioned exact DTO envelope, bounds, no executable/remote fields, stage/validate and destination fence                 | Private export may outlive deletion; real files never enter repository/diagnostics                    |
| Updates/data compatibility         | Extend all-client readiness to drain/fence repository commands and verify shell/record compatibility on restart                   | Existing shell schema 1–1 is not learner schema; root/subpath A/B/failure proof required              |
| Accidental telemetry               | No gameplay fetch/analytics/remote assets; IDs/evidence absent from URLs, headers/cache names/bodies; synthetic request inventory | Static host metadata and OS speech require distinct review; page interception cannot prove OS privacy |
| Debug/capture leakage              | Stable nonpersonal errors; no record dumps, raw answers or nicknames; fresh synthetic contexts and reviewed artifacts             | Ignore rules alone insufficient; full tracked/untracked/PR-attachment review before publication       |

## Goal dispatch and certification checklist

An owner can issue one Goal with the following concrete objective plus the
template in [CODEX_TASK_TEMPLATES](CODEX_TASK_TEMPLATES.md):

| Goal | Objective                                                                                                                                                             | Stop / publication boundary                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 3A   | Implement the raw IndexedDB adapter and synthetic codec/conformance/recovery harness described here and in the persistence design; normal composition remains unwired | Certify synthetic adapter evidence only; blocked required transaction/device observation is explicit; no live data policy |
| 3B   | Implement/version the proposed deterministic state machine and synthetic simulations, carrying reachability/coverage blockers as explicit proposal results            | Certify engineering behavior, never educator validation or accepted default; missing policy blocks real use only          |
| 3C   | Build the bounded synthetic developer loop/catalog, draft languages and storage/update/UX integration after 3A/3B                                                     | Certify only observed synthetic surfaces; real-child/public gates remain closed                                           |

For each stage record exact base/candidate, authority and non-goals, raw methods,
all ordinary findings/repairs, independent reviewers, retained mutations with
assertion failure and exact restoration, full/fresh frozen verify, audit,
dependency/lock equality, build inventory, local links, privacy/secrets and
browser/device limits. Keep historical reports frozen. Review the complete diff,
not only selected files. Publication requires a clean candidate, merged-base
conditions and observed current-head Ubuntu/Windows checks; protected-main merge
stays human. Diagnose → repair → validate → continue for ordinary failures.

**Plan certification means the bounded implementation can be commissioned. It
does not certify unimplemented persistence, educational policy, actual devices,
official languages, real-child trials or release readiness.**
