# Phase 2 independent red-team review

Review date: **2026-10-06 (Europe/Athens)**. Candidate inspected: `480a01a56a9f08f29bf36da76ed31a5c3afc4350`, branch `codex/phase-2-deterministic-family-proof`, protected-main base `a286c97fc26e5b17fa7b6a8466825c15db86f0d7`. Parent PR #4 was already owner-merged. [Phase 2 PR #5](https://github.com/kkazantzphone-droid/Math-Adventure/pull/5) was open/non-draft with both required checks passing on the original candidate before this review.

Status: **LOCAL RED-TEAM REVIEW AND REPAIR PASS**. The repaired full and fresh-install gates pass 514 tests/27 files; advisory, hygiene and artifact checks pass. The repaired-head hosted checks are the remaining publication gate; their actual results and commit SHA are recorded in the final handoff. Protected-main merge remains the owner's action.

## Independence and method

Three fresh specialist agents received repository instructions and review tasks without the predecessor's implementation conversation. They separately challenged mathematics/oracles, replay/codec/architecture boundaries and presentation/accessibility. The coordinating lead had participated in the original implementation and is not represented as an independent mathematical reviewer. The new mathematical and boundary models/tests were written by the fresh reviewers; the lead reproduced the presentation failures, performed a new mutation set, repaired the UI and exercised the browser. Existing reports were treated as claims to check, not proof.

Reviewed authority includes AGENTS, accepted ADRs (particularly 0009/0010/0012), the decision register, puzzle/testing/accessibility guidance, traceability and the original completion report. The review covers this deliberately bounded production mathematical-content proof, not a playable learner loop, educational-effectiveness claim, official language support or full WCAG/assistive-technology certification.

## Material findings and disposition

| Finding                                                                      | Reproduction and consequence                                                                                                                                                                                                 | Repair / independent recheck                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1 — mixed-language traversal controls                                       | Greek Next/Start labels inside German instructions inherited `de-DE`; live browser DOM and independent inherited-language assertion reproduced the mismatch.                                                                 | Both native buttons now declare effective UI locale. Independent tests cover three mixed role combinations; browser observed `el-GR` buttons and German step text.                                                                                                             |
| R2 — traversal updates lacked announcement semantics                         | Beginning/A→B/H→I/end changed a plain paragraph while keyboard focus stayed on Next. No live semantics exposed those changes. This is a source/markup defect; actual screen-reader behavior was not observed.                | One concise polite/atomic unit paragraph carries each step/reset/end update. Removed its duplicate Next-button description. Independent tests verify one occurrence of the step announcement, no announced total and two distinct-purpose live containers only in measurement. |
| R3 — unavailable replay removed feedback and lacked field association        | Submitting `not-a-seed` removed the task/status region; the ordinary recovery paragraph had no live semantics, and seed had no invalid/description association. Browser DOM showed zero live regions.                        | Task panel and `proof-feedback` outcome status persist through available/unavailable states. Invalid seed declares `aria-invalid` and references the recovery message. Browser confirmed association, successful correction and retained control focus.                        |
| R4 — exhaustive fixture truth was not exhaustive generated-instance coverage | Original 91/1,792/144 exhaustive checks called truth helpers on independently constructed inputs; generated comparisons were sampled. Those counts remain valid but did not establish complete generator dimension coverage. | Four new independent tests cover all 2,027 actual generated dimension/spec tuples and 6,561 small-grid geometry inputs. No mathematical correctness defect was found.                                                                                                          |
| R5 — current publication wording lagged observed state                       | Current documents still described first commit/push/PR/hosted checks as future after candidate `480a01a` and PR #5 existed and were green.                                                                                   | Current-state wording and this review supplement distinguish the observed original publication from the new repaired-head gates. Original historical counts/artifact hashes remain preserved.                                                                                  |

All three new accessibility contracts failed by assertion on the original source before repair, then passed. The focused combined review run passed 32 tests/four files; the fresh accessibility reviewer independently rechecked 22 tests/two files after repair. Initial aggregate review verification caught formatting of the new markup test; formatting was corrected before the complete passing gate. No quality gate was waived.

## Mathematical truth and oracle independence

The three existing families remain unchanged: `number.addition` / `addition-bounded-v1`, `geometry.quadrilateral` / `quadrilateral-bounded-v1`, and `measurement.unit-length` / `unit-length-bounded-v1`, catalog `phase2-content-v1`.

- Addition: maximum 0–5, operands 0–maximum, exact natural result 0–10. Independent disjoint token counting derives sums.
- Geometry: maximum 1–3, bounded width/height, shear 0/1, four quarter turns, scales 1/2, four cyclic starts and two windings; exact coordinates −8…8. Production edge/dot predicates were challenged by BigInt diagonal bisection/equality/perpendicularity, pair distances and Pythagorean angle facts. Square remains a rectangle and parallelogram. Degenerate/non-parallelogram input is rejected.
- Measurement: maximum 1–8, equal logical unit iteration and four orientations. Independent walked endpoints derive exact quantities; the required unit and length dimension reject area/same-number substitute units. Screen/device pixels have no truth authority.

The retained actual-generator tests compare every supported dimension tuple: **91 addition + 1,792 geometry + 144 length = 2,027**. Seed witnesses use the existing independently reviewed BigInt RNG reference and a finite synthetic seed inventory, bounded at 32,768 candidates per spec. Executed witness discovery used 13,482 candidate/spec scans; largest individual search was 8,991. Each generated task, expected contract and acceptance of independently derived answers is checked. This does not enumerate all 128-bit seeds or prove empirical distribution.

The independent geometry challenge also checks **9⁴ = 6,561 ordered vertex quadruples** on the 3×3 grid, including duplicate, collinear, crossing and invalid input. The original three 1,000-case properties and six golden family/seed fixtures remain intact. Principal √16 = 4 stays distinct from both real solutions of x² = 16; no fourth production family was added.

## New mutation sensitivity

| Temporary production defect                                         | Focused assertion failure                             |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| Undercount every positive addition result by one                    | Independent token-cardinality assertion failed.       |
| Classify every rectangle as square, dropping equal-side requirement | Independent diagonal-classification assertion failed. |
| Invert measurement magnitude equality                               | Exact quantity validation assertion failed.           |

Each run exited 1 with one failed/28 skipped tests and a relevant `AssertionError`. Before/after/current `src/domain/families/proofs.ts` SHA-256 matched exactly: **`6BC2D6D15B1F08D7DA0E21F849531D251EA8BBB68A992BF3AEE5AB0C8E558600`**. The independent boundary reviewer inspected the script, all three logs and restoration evidence. Full verification passed after restoration. Mutations and logs are ignored local evidence, never committed production changes.

## Replay, boundary, evidence and scope verdict

Generation uses only versioned project bounded choices. Existing seed mapping, `xoshiro128ss-v1`, `canonical-json-v1`, `replay-v1` and `semantic-v1` remain unchanged. Complete family/spec/seed/generator/content tuples reconstruct canonical semantic instances; locale/theme/speech do not enter generation. No hidden time/randomness/platform ordering was found.

Six additional adversarial boundary tests cover direct/cross-family dispatch, ten noninvoked getter sites, dangerous keys/prototypes/symbols/decorated inputs, toJSON/cycles/depth/text/node bounds, detached aliases and valid-schema task/scope/order tampering. Regeneration rejects altered canonical instances. These decoded-data contracts are not a sandbox for executable JavaScript Proxies.

The static frozen eight-node/seven-link graph has no prerequisite gates/global level or automatic cross-credit. Every family declares one prospective concept/representation pair; UI receives no expected answer/evidence contract and creates no observation/mastery transition. Exploration remains separate and unscored. Domain owns truth and unit segmentation; application is stateless; presentation owns wording; infrastructure speech cannot choose correctness. Phase 1C integrity modules and old RNG/canonical/speech behavior are unchanged.

No IndexedDB, persistence, learner records, adaptation/mastery, rewards, production Number Lab, playable session, worker/PWA lifecycle, backend, telemetry, accounts, deployment, release or real learner data was introduced. Phase 1E remains independently blocked/unimplemented. No accepted product/ADR decision changed.

## Browser and representation recheck

The available in-app browser independently reproduced R1/R3 and checked their repaired DOM contracts. Mixed Greek UI/German instructions retained distinct effective languages; keyboard Next traversed A→B through H→I, end and reset while focus stayed on the activated control. Seven units were rejected and eight accepted; help and recovery remained usable. Greek 2+5 rejected 6, accepted 7 and retry cleared response/help/feedback while preserving task and focus. English measurement remained fully usable without a Listen control on this observed surface; Greek exposed its optional Listen control. No speech-policy or mathematical-generation change occurred.

An independently derived rotated/oblique witness `8916b9895ee3f554d6f5e0a30e574da6` has ordered vertices (−6,2), (−6,6), (0,4), (0,0), side squares 16/40/16/40, no right angles and only parallelogram membership. German keyboard selection passed. At 320×760 and 760×320 with deliberate `textScale=200`, actual root text was 32px and document client/scroll widths were 305/305 and 745/745. Proportional SVG remained `xMidYMid meet`; native focus outline was 4px solid and clickable class labels exceeded 44px. Temporary viewport override is reset after review.

Neutral SVG labels/semantic HTML do not announce a correct class or length total. Measurement's unit live paragraph and outcome status have different purposes and no duplicated automatic description. All 79 messages and draft/native-pending/official=false metadata for el-GR/en-GB/de-DE remain unchanged; four planned packs remain incomplete. No arbitrary utterance, remote voice, automatic speech, drag-only interaction or colour-only correctness was introduced.

Browser/source checks do not establish actual assistive-technology behavior, native browser zoom, pronunciation, offline speech or complete WCAG conformance. W3C primary guidance reviewed **2026-10-06**: [language of parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html) and [status-message technique](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22). These guide authored semantics, not certification of a device/AT combination.

## Final verification and publication evidence

Observed repaired local canonical gate: **514 tests / 27 files**, formatting, zero-warning lint, four strict TypeScript projects and production build (54 transformed modules). The 13 retained red-team tests are four mathematics, six boundary and three accessibility cases. The original 3,000 property cases/seeds are unchanged.

A new ignored source snapshot contained **185 source/configuration/document files and initially no node_modules**. `corepack pnpm install --frozen-lockfile` completed in 9.9s with the pinned pnpm 12.9.1; `corepack pnpm verify` then passed all **514 tests/27 files** and the complete format/lint/type/build gates. All 185 snapshot files matched the workspace before final evidence wording was added, and all four generated artifacts matched byte for byte. Final evidence wording is also verified before committing.

`corepack pnpm audit --json` reports **zero advisories at every severity**, with 203 dependencies (3 runtime, 200 development; the 27 optional entries are included in that graph). Node 24.21.0, npm 11.19.0 and Corepack 0.36.0 remain unchanged. No dependency or pin changed. Lock SHA-256 remains **`B4CF9943692ED65897900827B19C23966C9661FA74FDD1C20F0300DC1512AAF0`** and the installed YAML parser finds one document.

The full Phase 2 candidate diff includes 43 files. Hygiene checks cover 481 local Markdown links and 55 production source files, with zero issues: valid UTF-8, whitespace, private-data/secret candidates, forbidden persistence/network/time/random APIs and generated-artifact exclusions. Bundle URL literals are React error references and XML namespaces, with no external application asset. Full diff and dependency direction are reviewed; historical Phase 1 reports, accepted ADRs, Phase 1C integrity modules, generator implementations, lockfile and workflow remain unchanged by this review.

| Repaired artifact                |  Bytes | SHA-256 (workspace and fresh build identical)                      |
| -------------------------------- | -----: | ------------------------------------------------------------------ |
| `dist/index.html`                |    518 | `5E285DE9BC5DB650D9C0793C9B0AFD958F1955698506968B13A3FD01EAF99DD4` |
| `dist/assets/index-Ds_aHBaK.js`  | 307303 | `CA2A261974AAE6CC6AAF3738A9479BF7DA87768A7182951A9FDD6CAE45F9D203` |
| `dist/assets/index-CWKLmtyx.css` |  20515 | `C0A3571F9D8DCF5D415A37BA5910E81C32696C3191D2B6E46AD4A049CBD32AEA` |
| `dist/THIRD_PARTY_NOTICES.txt`   |   1384 | `D79545965A59895FC431B6F519FE411BC32A26415C656B7D531DD7DFCD453AAB` |

Original candidate required hosted run was [37374362103](https://github.com/kkazantzphone-droid/Math-Adventure/actions/runs/37374362103), both Ubuntu 24.04 and Windows 2025 successful at `480a01a`. That older run does not certify the repaired head. Exact-head hosted success must be observed after this review/repair commit is pushed; no pending hosted result is counted as a pass.

One coherent review/repair commit extends the original candidate on its authorized feature branch. The final handoff supplies its actual SHA, clean Git/upstream state and repaired-head required CI results. No protected-main merge, force push, tag, release or deployment is performed.
