---
name: math-adventure-math-truth-review
description: Independently review Math Adventure mathematical semantics, bounded families and immutable replay using exact oracles, enumeration and meaningful mutations. Use for domain truth changes or mathematical certification.
---

# Math Adventure mathematical truth review

Own truth evidence, not UI appearance or publication gates. Read [AGENTS.md](../../../AGENTS.md), the [operating model](../../../docs/CODEX_OPERATING_MODEL.md), [decision register](../../../docs/DECISION_REGISTER.md) and relevant accepted ADRs. Use [exact values](../../../docs/DOMAIN_VALUE_MODEL.md), [semantic contracts](../../../docs/PUZZLE_ARCHITECTURE.md), [deterministic replay](../../../docs/DETERMINISTIC_REPLAY.md), [testing strategy](../../../docs/TESTING_STRATEGY.md) and the authorized [family design](../../../docs/PHASE_2_FAMILY_PROOF.md) when applicable. Do not promote a proposed or future family to authorized implementation.

## Independent proof

Establish the declared mathematical domain, accepted inputs, answer equivalence, resource bounds and excluded cases before reviewing implementation. Build hand-derived anchors and a genuinely separate oracle or enumerator without production generator/validator/truth imports; renamed production helpers and generate-then-validate agreement are insufficient. Review oracle assumptions independently. Exhaust the supported finite domain where practical and add deterministic properties/golden fixtures for generation and malformed inputs. State whether counts cover parameter tuples, unique tasks, seeds or a separate small-grid model; do not equate one with another.

- Exact integers must preserve safe intermediates. Rationals/decimals must retain canonical exact arithmetic, signs, zero/division rules and explicit bounded DTOs. No floating epsilon or silent rounding establishes exact truth; raw BigInt is not wire data. Keep explicitly approximate measures distinct.
- Geometry truth comes from exact semantic predicates, independent of SVG/CSS/pixels. Check degeneracy, winding/order and supported transformations. Inclusive classification requires every applicable class: a square is also a rectangle and parallelogram. Reject unsupported/generalized claims outside the family contract.
- Measurement answers preserve magnitude, required unit and dimension. Length, area and physical screen distance are different quantities. Verify equal-unit iteration, gap/overlap boundaries and supported orientation/scale meaning independently.
- Powers represent bounded repeated multiplication; inspect exponent-zero, excluded `0^0`, negative/unsupported domains and work/output bounds. Principal `√16 = 4` differs from the real solution set of `x² = 16`, which contains `−4` and `4`. Nonperfect roots must not become silently rounded integers.

## Replay and evidence boundaries

Check seed-to-word mapping, transition order, unbiased bounded sampling/exhaustion, canonical JSON and versioned exact DTO spellings against independent vectors. Accepted `xoshiro128ss-v1` and other supported behavior IDs cannot acquire new interpretations. Detect/reject an immutable replay break; any semantic replacement needs its own applicable identifier and the required accepted-decision review, never regenerated old goldens that conceal the break. Locale, speech, UI state, hidden time and cosmetic randomness cannot decide mathematical truth. See [truth ADR](../../../docs/adr/ADR-0004.md) and [replay ADR](../../../docs/adr/ADR-0009.md).

Review semantic hints, accessible equivalents and declared concept/representation evidence separately from correctness. Related concepts do not create a global learner level or duplicate mastery. Number Lab exposure is session-only and cannot become persistent mastery evidence. An assisted/worked answer cannot silently count as independent demonstration; no review creates learner records or authorizes future adaptation.

Mutate a meaningful affected truth boundary, require a failing mathematical assertion, then restore exact original bytes and rerun the affected proof. Keep minimal synthetic counterexamples with complete replay/spec/version data. Return verified bounds, oracle independence, coverage limits, mutation results and unresolved findings to [quality-gate](../math-adventure-quality-gate/SKILL.md). Repair ordinary failures within the authorized task; a Class C accepted-policy change needs `HUMAN DECISION REQUIRED`, and an unobtainable required proof needs `BLOCKED — EVIDENCE UNAVAILABLE`. This skill grants no wider scope or publication authority.
