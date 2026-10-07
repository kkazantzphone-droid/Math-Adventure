# Phase 3 closure evidence

Updated: **2026-10-07, Europe/Athens**. Full Phase 3C and Phase 3 status:
**BLOCKED — EVIDENCE UNAVAILABLE**. Neither stage is formally closed.

The owner's new Goal (D52) requests full evidence-backed closure after the
owner-confirmed synthetic playable loop and child UX milestone was merged.
[PR #13](https://github.com/kkazantzphone-droid/Math-Adventure/pull/13) is positively
observed merged at `2026-10-07T05:23:57Z`, protected-main squash
`ce4eccb87b731a15034950db66c01be9d94e07c8`, tree
`6ed58ac5e332340940017665fbbdd95433a7d88e`. Its source tree equals the preserved
feature head `4e1f6823297fd0f59f49cf3e174ef7b2ea7c5de0`. Closure work starts on
`codex/phase-3c-closure-evidence` from that exact main revision. No engine or
owner-approved presentation is discarded or redesigned.

The historical `owner_merge` restriction applied to the now-merged D50/D51
milestone. D52 permits qualifying Class A/B work under the unchanged V2
`automatic_when_eligible` contract. This full-closure candidate is currently
**ineligible for automatic merge**: operating-model gates D and G require the
missing mandatory observations. A smaller preparatory result does not silently
replace this Goal. No policy waiver, Phase 4, real-child use, release, deployment,
backend, telemetry or access expansion is authorized.

## Acceptance reconciliation

The [accepted staged plan](PHASE_3_IMPLEMENTATION_PLAN.md) is unchanged. Its
complete 3C exit expressly requires at least one observed target
device/browser/assistive-technology combination **and** an actual disconnected
restart. Engineering, owner product confirmation, DOM semantics and browser
offline mechanisms cannot substitute for those observations.

| Area                                   | Evidence and final bound                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3A persistence                         | [Frozen report](PHASE_3A_COMPLETION_REPORT.md): actual installed-browser IndexedDB conformance, migration, receipts, delete fences, stale tabs and recovery. Natural quota/eviction, crash/power-loss and live restore remain explicitly unobserved; no universal durability claim.                                                                                                                                                                                                                    |
| 3B adaptation                          | [Frozen report](PHASE_3B_COMPLETION_REPORT.md): exact deterministic state, enumeration, scoped evidence, histories/fairness and restored mutations. Proposed educational policy stays proposed; no real-child default or effectiveness certification.                                                                                                                                                                                                                                                  |
| Eight mathematical families and replay | Preserved exact domain/oracles, structured answers, bounded codecs, immutable replay and atomic engine. Mathematical and adaptation authority remain in the domain.                                                                                                                                                                                                                                                                                                                                    |
| Child presentation                     | Owner confirmation stays closed under D51/Q19. Direct answers, visual Show me, Star/Triangle and Play/Shapes/Explore are preserved. Child shape recognition cannot receive full attribute evidence; five new families retain limited evidence; manual and Explore remain unscored.                                                                                                                                                                                                                     |
| Synthetic lifecycle and updates        | Retained installed Chrome/Edge engineering cases cover correct/retry/support/skip/stop, profiles, locales, failed saves, deletion, stale tabs, cached root/subpath restart and reader/update guards. Their recorded source hashes and mechanisms bound reuse.                                                                                                                                                                                                                                          |
| Explicit layout widths and touch       | This continuation adds all-eight/root/subpath 375/768/1024px observations at 100% and 200% CSS text, retaining 320px and landscape checks. Fresh browser touch emulation tests wrong/retry/help/correct/next and manual evidence against an independent public-task oracle. Physical touch-device support remains unobserved. Current runs are recorded below when completed.                                                                                                                          |
| Actual browser zoom                    | Historical merged-ce4 production Chrome at actual 200% zoom was observed across all eight initial tasks and visual help, with addition keyboard answer/feedback focus. CSS root text remained 16px; DPR changed 1→2 and viewport 929×861→464×430. This is distinct from CSS text scaling. [Native observation](evidence/phase3c-closure/native-observation.json) records its limits. Current-source native zoom remains pending after the CSS repair and is included in the owner observation session. |
| Actual screen-reader delivery          | **REQUIRED / UNOBSERVED.** Preinstalled Narrator launched, but its window exceeded the Computer Use helper's Windows integrity level. UIA/DOM/control names and process presence cannot establish spoken delivery. No elevation, voice installation, recording or security setting change was used.                                                                                                                                                                                                    |
| Actual physically disconnected restart | **REQUIRED / UNOBSERVED.** The agent has no permitted physical network-disconnection/device-restart observation. Stopped listeners, proxies and browser offline settings are distinct evidence. No network or machine access was expanded.                                                                                                                                                                                                                                                             |
| Language, education and release        | Prototype drafts and optional exact-local speech remain bounded. Official packs, native-language/educator review, consent/retention/legal decisions, release device floor and offline voices remain separate future gates. They are not silently accepted or invented as prerequisites for contained synthetic closure.                                                                                                                                                                                |

Independent acceptance audit verified that the retained 27 engine source
bindings and 22 child/production-renderer bindings matched merged main before
the new test coverage. Changes to the proof test itself require a new child run;
prior case counts do not certify this candidate. Historical 3A/3B reports and
all previously retained evidence remain untouched.

## Current engineering verification

The new layout checks detected Greek geometry-card overflow at 375px: two cards
had 90px client widths and 93/95px scroll widths. A geometry-only 7.5rem grid
minimum repairs that defect without changing other families or mathematical
semantics. The targeted Chrome touch and root/subpath layout checks then passed
(3 cases); no assertion was weakened. The final complete installed-browser runs
passed all 55 cases in each product: the retained 36 engine cases and 19 child
cases, including the added layout/touch coverage. Both commands exited 0.

| Current gate                               | Observed result and retained sanitized evidence                                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed Chrome                           | **PASS**, 55 cases, 150.21 seconds; [engine record](evidence/phase3c-closure/chrome-engine.json) and [child record](evidence/phase3c-closure/chrome-child.json).                                                                                                     |
| Installed Edge                             | **PASS**, 55 cases, 152.60 seconds; [engine record](evidence/phase3c-closure/msedge-engine.json) and [child record](evidence/phase3c-closure/msedge-child.json).                                                                                                     |
| Relevant mutations                         | **PASS**, all 14 defects were `DETECTED_BY_ASSERTION`: [six child mutations](evidence/phase3c-closure/child-mutations.json) and [eight retained engine mutations](evidence/phase3c-closure/engine-mutations.json). Exact source/report/artifact bytes were restored. |
| Dependency audit                           | Observed **2026-10-07**, zero known advisories; a dated advisory result, not general security certification.                                                                                                                                                         |
| Canonical and isolated fresh verification  | **PENDING** for the complete current candidate.                                                                                                                                                                                                                      |
| Current production binding and native zoom | **PENDING** after the geometry CSS repair.                                                                                                                                                                                                                           |
| Required exact-head hosted verification    | **PENDING**; local browser success does not establish either required PR-specific CI job.                                                                                                                                                                            |

Raw current source hashes were checked against the four browser and two mutation
records before their sanitized retention under `docs/evidence/phase3c-closure/`.
They bind their actual proof inputs and artifacts; they do not certify future
containing documentation, the pending production rebinding or a future CI head.

The recorded native zoom and prepared production identities belong to merged
`ce4eccb`; the CSS repair changes production bytes. They are historical evidence,
not certification of the repaired candidate. Rebuild/rebind the production site
and repeat current-source native zoom before claiming its result. Computer Use
was stopped with the physical Escape key during the subsequent AT investigation;
no further native/browser-control action was performed in that turn. The
documented Narrator live-transcription alternative therefore remains untested.
No unavailable observation is inferred as PASS.

Verification is in progress. Final canonical/fresh, independent, artifact/privacy
and publication results must be observed and bound before preservation/publication.
The current browser, mutation and audit observations above do not resolve those
pending gates, actual AT delivery or physical restart. Pending results are not PASS.
The unchanged engine's prior full/fresh 1,249 tests/62 files, native 54 per
product, 13 restored mutations and production-renderer review remain historical.
The enlarged native matrix requires 36 engine plus 19 child cases per product.

## Concrete remaining owner action

The [prepared observation protocol](PHASE_3_TARGET_OBSERVATION_PROTOCOL.md) and
[unfilled sanitized template](evidence/phase3c-closure/target-observation-template.json)
provide the production build's exact source, shell/release and nine artifact
hashes, stable-origin preview commands and all-eight task checklist. They contain
no claimed external observation. Use only an adult-operated fixed synthetic
session; retain no media, raw database, profile, export or identifying log.

One bounded observation session can supply the remaining native observations:

1. On the rebuilt and bound current production surface, set actual browser zoom
   to **200%** using the browser's native zoom control. Inspect all eight child
   tasks and visual help for usable reflow, and keyboard answer/feedback focus.
   Record the actual zoom setting; CSS text scaling alone does not supply this
   observation. Restore 100% afterwards.
2. Actually hear/read the existing screen reader's task, answer, help, feedback
   and focus delivery on one identified device/browser/AT combination.
3. After verified caching and synthetic saving, stop the owned listener,
   physically disconnect all external networking, restart the device and reopen
   the exact origin in the same synthetic browser profile. Confirm restored
   state, complete a new task and confirm another offline reopen retains it.

Return only the sanitized versions/build binding and pass/fail observations.
Failure must be repaired/rechecked; observation absence is not approval. No
acceptance-criterion waiver is requested. After receipt, reconcile the evidence,
complete the final exact-head local/independent/hosted gates and evaluate merge
eligibility afresh. Full Phase 3 closure remains blocked until those facts exist.
