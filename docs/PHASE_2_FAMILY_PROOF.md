# Phase 2 deterministic family proof

Status: **LOCAL ENGINEERING PASS** for the bounded implementation under [D40](DECISION_REGISTER.md), with observed independent/full/fresh/browser evidence and remaining publication gates in the [completion report](PHASE_2_COMPLETION_REPORT.md). This is production mathematical-content proof, not a playable learner loop or an educational-effectiveness claim. The branch began STACKED / DEPENDENT on parent PR #4. The owner merged that parent, and the unpublished branch is now reconciled to tree-equivalent protected-main `a286c97fc26e5b17fa7b6a8466825c15db86f0d7`; final complete reverification/staged preservation precede authorized publication and actual hosted checks.

## Selection and bounds

Three small families exercise genuinely different answer contracts while allowing complete finite enumeration. Addition uses exact values, quadrilateral classification requires all applicable classes, and measurement requires an exact quantity with an explicit unit and dimension. They reuse existing [semantic contracts](PUZZLE_ARCHITECTURE.md), [exact values](DOMAIN_VALUE_MODEL.md) and [replay](DETERMINISTIC_REPLAY.md), rather than relocating the historical scripted UI choices.

| Family ID                 | Immutable generator ID     | Spec and generated dimensions                                                                                                                                           | Answer                                                                      |
| ------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `number.addition`         | `addition-bounded-v1`      | `maximum` is an integer 0–5; each operand independently lies in 0–maximum; result is 0–10; no negative operand/result                                                   | Canonical exact rational DTO for the sum                                    |
| `geometry.quadrilateral`  | `quadrilateral-bounded-v1` | `maximum` is an integer 1–3; width/height independently lie in 1–maximum; shear is 0 or 1; four quarter turns, scales 1 or 2, four cyclic starts and two winding orders | Every applicable class from parallelogram, rectangle and square             |
| `measurement.unit-length` | `unit-length-bounded-v1`   | `maximum` is an integer 1–8; length is 1–maximum; four quarter turns; one logical step is one declared unit                                                             | Exact quantity, `unit.length-step`, dimension `length`; required exact unit |

The static ordered catalog has content version **`phase2-content-v1`**. Application version, content version and generator identity remain distinct. Old identifiers **`xoshiro128ss-v1`, `canonical-json-v1`, `replay-v1`, `semantic-v1`** and their accepted seed mapping/transitions are unchanged. Changed generator behavior must receive a new identifier rather than silently changing a supported replay.

Geometry generates the convex parallelogram with base vertices `(0,0)`, `(width,0)`, `(width+shear,height)`, `(shear,height)` before the declared transformations. Exact integer coordinates stay in −8…8. The predicate rejects degenerate/non-parallelogram input in this bounded proof; it does not claim a general polygon classification engine. Opposite edges, squared side lengths and adjacent dot products determine inclusive classes: every square is also a rectangle and parallelogram. Rotation, scale, cyclic ordering and winding must preserve the class set. Pixels, SVG size, CSS and screenshots have no truth authority.

Measurement uses one axis-aligned logical segment and its quarter-turn rotations. Unit segments are semantic coordinate steps without gaps/overlaps. This unit is not a centimetre, a physical screen distance, a square unit or a general conversion catalog. Submitted area dimensions or other units are invalid for the task; exact truth uses no floating tolerance.

## Concept graph and evidence declarations

The eight canonical nodes are `counting.cardinality`, `addition.part-whole`, `measurement.length.unit-iteration`, `geometry.quadrilateral.attributes`, `geometry.square.attributes`, `geometry.square-unit-array`, `powers.square-numbers` and `roots.perfect-square`. Seven links connect them: five `related` edges, one `representationOf` from the square-unit array to square numbers, and one `inverseOf` from nonnegative square numbers to principal perfect-square roots. There are **no prerequisite edges**, artificial gates, age/year labels or global levels. Existing graph validation retains identifier/cycle/resource checks.

Each family declares exactly one future evidence pair:

| Family        | Concept                             | Representation                       |
| ------------- | ----------------------------------- | ------------------------------------ |
| Addition      | `addition.part-whole`               | `representation.addition-groups`     |
| Quadrilateral | `geometry.quadrilateral.attributes` | `representation.geometry-attributes` |
| Unit length   | `measurement.length.unit-iteration` | `representation.unit-iteration`      |

These contracts say what a future properly scoped observation could support. They do not create an observation, award mastery or credit every related node. Attribute-based classification is not evidence of independent visual shape recognition; sequential unit traversal is not evidence of unaided visual estimation. Hint use and changed modalities would need explicit future interpretation. The developer screen keeps responses/feedback only in React memory and never emits learner evidence.

Existing typed power/root expressions and the graph's representation/inverse links show catalog readiness without adding another family. Principal `√16 = 4` remains distinct from both real solutions of `x² = 16`. The accepted unscored sixteen-tile Explore experience is preserved.

## Generation, validation and hints

The domain owns immutable metadata, bounded spec validation, generation, answer validation and semantic hint derivation. It uses only the existing injected/versioned RNG and unbiased bounded choices: two draws for addition, seven for quadrilateral dimensions and two for measurement, each subject to the existing finite rejection-sampling bound. Unsupported identifiers/specs/seeds and exhausted draws produce typed failures; no hidden time, entropy, locale ordering or unbounded search is introduced.

Generation passes through the runtime puzzle/scene/value codecs before a task is presented. Validation reparses the submitted instance, regenerates it from its complete replay tuple, and compares canonical instances before checking a structured answer. Forged tasks, hints, answer contracts, evidence scope or instance identities cannot become validation authority. Classification requires the complete applicable set; a canonical square answer containing only `square` is incomplete. Quantity validation preserves magnitude, exact unit and length dimension.

Two bounded hint levels use semantic kinds such as `representationChange`, `focus` and `constraintReminder`; no translated prose or worked answer is stored in domain logic. The addition cue joins groups, the shape cue attends to side/angle attributes, and the measurement cue iterates equal units. Hints preserve the underlying task. The proof path displays a localised cue and never interprets supported success as independent mastery.

The stateless `src/application/family-proof.ts` facade returns only task/replay/hint and presentation-useful semantic attributes or unit segments. It omits expected answer contracts and classification answers. Submission regenerates the domain instance and invokes domain validation. UI selection/parsing creates a structured response; it does not calculate correctness.

## Independent truth and replay plan

The test-only `tests/oracle/family-proof.ts` has no production generator/validator/truth imports. Addition joins disjoint token collections and counts them. Geometry uses a separate BigInt diagonal theorem: bisecting diagonals identify a nondegenerate parallelogram, equal diagonal lengths identify a rectangle, and perpendicular equal diagonals identify a square. This differs from production consecutive-edge/dot-product predicates. Measurement walks and counts independent equal unit intervals. Nine passing hand-derived geometry fixtures include inclusive/rotated/oblique shapes and rejected trapezoid, crossing, collinear and duplicate-vertex cases. Two low-word/mixed-word golden seed/spec fixtures per family reproduce exact semantic tasks, checked against independent RNG/oracle dimensions. Locale, Space rendering and speech capability do not alter generation semantics.

| Enumeration target |       Maximum-spec parameter tuples | Tuples over every supported maximum |
| ------------------ | ----------------------------------: | ----------------------------------: |
| Addition           |                        `6 × 6 = 36` |  `1² + 2² + 3² + 4² + 5² + 6² = 91` |
| Quadrilateral      | `3 × 3 × 2 × 4 × 2 × 4 × 2 = 1,152` |      `(1² + 2² + 3²) × 128 = 1,792` |
| Unit length        |                        `8 × 4 = 32` |             `(1 + … + 8) × 4 = 144` |

These are parameter-tuple counts, not claims of unique visual shapes, unique class sets or empirical uniform distribution. Equivalent transformed/order tuples can share truth or semantic content. The complete counts above passed; each family additionally passed 1,000 generated property cases, 3,000 total. Meaningful +1 arithmetic, inverted rectangle-predicate and removed unit/dimension-guard mutations each failed by assertion and were restored to exact source bytes before full/fresh 501-test verification. Exact seeds, hashes/results and remaining publication gates belong in the completion report.

## Accessible presentation boundary

The deliberate `?familyProof=1` developer path uses the accepted Space visual language; normal Phase 1V navigation remains available outside it. Exact one-flag parsing prevents accidental activation. `family` chooses one declared ID and `seed` supplies a 32-hex replay seed; invalid explicit seeds are rejected rather than silently replaced. Default seed is `0123456789abcdeffedcba9876543210`. Settings and responses remain unsaved and unscheduled.

| Proof         | Representation/equivalent                                                                                 | Response and modality limit                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Addition      | Semantic operands in HTML; optional two-group dots with a localised counting cue                          | Native numeric selection; part-whole/counting relationship, not visual subitizing                       |
| Quadrilateral | Proportion-preserving SVG outline; semantic HTML listing exact squared side lengths and right-angle facts | Native all-applicable checkboxes; attribute-based inclusive classification, not pure visual recognition |
| Unit length   | SVG semantic unit segments; native step-by-step traversal of labelled endpoints                           | Native unit-count selection; iterative length counting, not device-distance estimation                  |

Neutral SVG labels do not name a correct class. The accessible equivalent describes task facts, with no expected class list or total length answer hidden in an accessible label. Native actions avoid drag-only input. Bounded browser/source review passed keyboard/focus, ≥44px label targets, concise single-region feedback, hint focus preservation, no colour-only correctness, reduced-motion behavior and 320px/200% proof-text reflow. The text-scale path was observed; native browser zoom was not exposed by the tool. Browser/source review cannot replace actual assistive-technology or consented user evidence. D29 remains proposed beyond this bounded SVG+HTML proof.

Thirty-four minimal new messages extend all three draft el-GR/en-GB/de-DE prototype schemas to 79 required IDs, with pack version `0.2.0-prototype` and schema `prototype-messages-v2`; presentation content remains `scripted-prototype-v1`, separate from the mathematical catalog replay version. Four planned/incomplete packs receive no fabricated child copy. Official status remains false and native review pending. UI/instruction/number-speech preferences remain independent. Optional explicit fixed nonpersonal speech continues the exact-region `localService === true` policy, with no arbitrary generated utterance or offline claim. Missing voices cannot affect generation, correctness or visual operation.

## Remaining boundaries

No learner profile/observation store, persistence command, IndexedDB, adaptation/mastery/recommendation, reward economy, playable session, production Number Lab, service worker, backend, telemetry, account, deployment or real learner data is introduced. ADR-0006 and ADR-0007 remain proposed. Phase 1E remains **BLOCKED/PARTIAL — BROWSER LIFECYCLE EVIDENCE REQUIRED** independently of the parent-merge publication dependency. Local completion cannot waive either lifecycle evidence or protected-main history requirements.
