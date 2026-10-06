---
name: math-adventure-ui-acceptance
description: Review Math Adventure rendered interaction, reflow, accessibility and child-safe feedback against accepted visuals and domain truth. Use for UI acceptance; source or mocked checks alone cannot certify browser behavior.
---

# Math Adventure UI acceptance

Own bounded rendered-interaction evidence. Read [AGENTS.md](../../../AGENTS.md), the [operating model](../../../docs/CODEX_OPERATING_MODEL.md), [decision register](../../../docs/DECISION_REGISTER.md), [accessibility](../../../docs/ACCESSIBILITY.md), [testing strategy](../../../docs/TESTING_STRATEGY.md) and the task's design/completion report. Preserve the accepted [Space/Shapes/help/root baseline](../../../docs/adr/ADR-0011.md) and [independent locale/local-only speech boundary](../../../docs/adr/ADR-0012.md). Ordinary coding/QA does not require another owner approval; changing accepted product policy is Class C.

## Rendered inspection

Use an available real browser on the candidate build with synthetic fixtures. Reproduce affected initial, hint, wrong-answer, retry, success, navigation and unavailable/recovery states. Inspect every changed control for a reachable useful action; no dead controls, punitive retry, speed gate, focus theft or automatic help. Preserve child-controlled help/replay and audio-off operation.

Check reflow at 320 CSS px and 200% text, portrait and landscape, plus relevant larger viewports and long/mixed-language copy. Verify no clipped answers, unreachable controls or distorted shape proportions. Native zoom, deliberate text scaling and a narrowed viewport are distinct evidence: report the mechanism actually available rather than relabeling one as another.

Exercise keyboard-only control order, activation, native response input, visible/unobscured focus, navigation focus and hint/retry focus preservation. Inspect semantic names/roles, one concise outcome-status purpose, useful recovery associations and nonduplicated announcements. Drag interactions need a single-pointer/keyboard alternative; source or SSR associations do not prove screen-reader delivery.

Measure relevant text contrast (normal text at least 4.5:1; large text 3:1) and essential UI graphics (3:1). Verify colour-independent meaning, primary child targets at least 44×44 CSS px with spacing, reduced motion and no forced timing. The project's 44px recommendation exceeds the WCAG AA target minimum; neither measurements nor automated checks establish complete conformance. See the accessibility document for definitions and exceptions.

## Truth and modality

The domain validator owns mathematical correctness. Repair UI disagreement rather than inventing a second UI oracle. Review shape proportions, unit diagrams and the concrete-to-symbol relationship against semantic task data; pixels and speech glyphs are not mathematical truth. The accepted sixteen-tile root view keeps one top side labelled `4` and principal `√16 = 4`, distinct from both solutions of `x² = 16`.

Check accessible names, descriptions, hidden markup, speech and pre-answer feedback for answer leakage. A declared worked example may intentionally show its solution, but it cannot count as independent evidence. Attribute classification, nonvisual counting and visual recognition have different evidence scopes; inaccessible visual skills remain unobserved rather than penalized. See [task/evidence contracts](../../../docs/PUZZLE_ARCHITECTURE.md) and the applicable [family design](../../../docs/PHASE_2_FAMILY_PROOF.md).

Keep UI, instruction and number-speech locales independent and label effective content accurately. Missing voices retain visual interaction. Accept only exposed exact-locale voices with `localService === true`; en-US cannot substitute for en-GB, remote/default voices cannot fill the gap, and reported local capability is not tested-offline proof. Speech stays explicit and fixed/nonpersonal, with no arbitrary learner text or autoplay.

## Evidence handoff

Record candidate/build, browser/tool, viewport/text mechanism, exercised states, observations and unavailable modalities in the completion evidence. Keep screenshots/logs synthetic and privacy-safe. Distinguish source/SSR, rendered browser, actual device/assistive technology and owner design input; none substitutes for the others or proves educational effectiveness.

Repair ordinary defects and recheck affected states, then send findings to [quality-gate](../math-adventure-quality-gate/SKILL.md). If required browser evidence cannot be obtained, use `BLOCKED — EVIDENCE UNAVAILABLE` with observed partial evidence. For an authorized offline/update change, actual disconnected-cache and two-tab lifecycle proofs remain required; mocks do not replace the native evidence described in [Phase 1E completion](../../../docs/PHASE_1E_COMPLETION_REPORT.md). This skill does not authorize a new product phase, broader learner behavior, Class C actions or external publication.
