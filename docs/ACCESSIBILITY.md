# Accessibility and child-centred interaction

Status: proposed release target WCAG 2.2 AA, no current conformance claim. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) is the normative reference, accessed 2026-10-04. Speech alone does not establish accessibility.

| Area | Required design/test | WCAG reference |
| --- | --- | --- |
| Non-text content and semantics | Meaningful text/semantic alternatives, structured controls and task relations | 1.1.1, 1.3.1 |
| Colour/contrast | No colour-only correctness cues; normal text >=4.5:1, large text >=3:1; essential UI graphics >=3:1 | 1.4.1, 1.4.3, 1.4.11 |
| Zoom/reflow | 200% text; reflow at 320 CSS px where applicable, no clipped answers/settings | 1.4.4, 1.4.10 |
| Keyboard | Every action operable, no traps, sensible focus/order and visible focus | 2.1.1, 2.1.2, 2.4.3, 2.4.7 |
| Obscured focus | Sticky controls/dialogs do not entirely obscure focused controls | 2.4.11 |
| Touch/drag | AA minimum 24x24 CSS px subject to exceptions; single-pointer alternative to dragging | 2.5.8, 2.5.7 |
| Audio/motion | Controls for qualifying autoplay audio; avoid forced motion/timing, offer reduced motion | 1.4.2, 2.2.2; additional project policy |
| Language | Correct page/part language, including mixed instruction/number speech | 3.1.1, 3.1.2 |
| Feedback | Name/role/value, nonintrusive status/error announcements | 4.1.2, 4.1.3 |

Project design recommendation is at least 44x44 CSS px primary child targets with generous spacing; 44x44 corresponds to enhanced AAA target sizing, not the AA minimum. Confirm actual child motor usability rather than treating a standards minimum as sufficient. Avoid arbitrary countdowns and timed answers. Offer touch, click and keyboard equivalents for grouping/ordering/drag tasks.

Keep screens uncluttered and navigation predictable. Show obvious replay/help/skip/stop controls with icon plus meaningful labels. Audio-off users still understand invitations, feedback and actions. Non-readers need visual demonstrations and spoken help; icon interpretation must be tested, not assumed. Parent settings and destructive controls stay out of normal play; their deliberate-entry gate is convenience only.

Use native semantic DOM controls. If a canvas/SVG is needed, maintain a synchronized accessible structure and operable alternatives. Feedback should identify a useful next action, not announce “failure.” Do not rely on red/green, tiny symbols or animation alone. Respect prefers-reduced-motion, remove unnecessary transitions and allow celebrations/audio to be disabled.

For geometry prefer scalable SVG with semantic HTML controls, reviewed title/desc/ARIA relationships and correct language. Author keyboard/touch behavior directly; inspectable vector nodes alone do not supply accessible interaction. Keep square/right-angle proportions when responsive, scale hit targets in CSS pixels, and offer select-then-place/rotate/coordinate alternatives to drag. Shape descriptions must not announce the classification answer and then count it as independent shape recognition.

Native MathML and optional typesetting adapters need actual browser/screen-reader tests for exponents, radicals, fractions and units at zoom and during dynamic changes. Keep reviewed spoken/text semantic explanations for powers/roots/perimeter/area/angles; typesetter speech or hidden MathML is not a seven-locale guarantee. Avoid duplicated assistive output from parallel visual/hidden trees. SVG-AAM draft mappings are not treated as a certification basis.

## Accessible task/evidence contract

Every puzzle family states representation, accessible equivalent, expected response and what concept evidence it actually yields. A visual quantity prompt cannot expose “there are five dots” in an aria-label and then count a correct answer as independent subitizing. A nonvisual structured counting task may assess cardinality or numeral relationships instead; declare its own evidence scope. Equivalent operation access can use an alternate representation, but an inaccessible visual-specific skill remains unobserved rather than penalized.

Automatic TTS and screen-reader announcements should not compete. Use a replay button and concise status live regions, preserve focus after answers/hints, restore focus after parent dialogs, and cancel obsolete speech on context change. Mathematical hint use is recorded separately from accessibility supports. [Adaptive model](ADAPTIVE_LEARNING_MODEL.md) preserves this distinction.

## Verification and remaining questions

Phase 1V is **FINAL PASS — OWNER CONFIRMED** and locally preserved: the owner accepts Space/dark blue/light typography, remediated Shapes, discoverable Show me, Explore and the final one-top-side root view. This bounded founder-family input is not accessibility certification. The prototype keeps native buttons, visible focus and supportive feedback without learner evidence. Its same-shape match displays the same unlabeled square artwork at the same size in target and choices; accessible descriptions state neutral geometric attributes without naming a correct answer. A mint `Show me` / `Δείξε μου` button remains child-controlled near the answers, without flashing, automatic hints or focus theft. Explore keeps one sixteen-tile array in the selected step, using rows/side counts and border/state cues rather than colour alone. The root view uses one top bracket labelled 4, highlights only four top tiles and places concrete square/side meaning before the concluding √16 = 4. Its guide remains empty because unique control descriptions already provide that meaning; there is no duplicate diagram description, automatic scrolling or overlay.

Phase 1D is **ENGINEERING PASS — complete for bounded checkpoint 6**. Effective UI locale labels document language; effective instruction locale labels the instruction region, while requested planned tags remain distinct in diagnostics. This prevents Greek fallback content from being labelled as French/Spanish/Italian/Portuguese. Number/math plans use their independent requested speech locale; planned speech remains unavailable. Replay is explicit, absent when exact local capability is unavailable, and never autoplays or duplicates an aria-live delivery. Navigation/badge/context/locale/disable/replacement cancels obsolete speech; outcome failure cannot change task/navigation state. The adult/developer Voice Check is deliberate and optional, with fixed nonpersonal phrases and no device fingerprint.

Recheck keyboard, new-screen focus, hint/replay focus preservation, 320px reflow, 200% text, portrait/landscape, long German wording, contrast, reduced motion, square proportions and audio-off/missing-voice use after relevant changes. Source/SSR checks, synthetic browser review, owner aggregate UAT and actual assistive-technology/device evidence are distinct; none establishes WCAG conformance or universal comprehension. See the frozen [Phase 1V report](PHASE_1V_COMPLETION_REPORT.md) and current [Phase 1D report](PHASE_1D_COMPLETION_REPORT.md) for observed checks and limits. Phase 1D bounded engineering gates have passed, with local preservation following final staged review; conditional Phase 1E remains unstarted. Official language-pack, pronunciation, offline voice and actual-device accessibility gates remain unresolved.

Automation with axe-core plus lint detects only a subset of problems. Manual checks include keyboard-only sessions, touch and switch-friendly controls, screen-reader tasks, 200% text/reflow, high contrast/colour independence, audio-off, reduced motion, long translated phrases and all destructive-action dialogs. Playwright WebKit is useful but does not replace actual iPadOS Safari/PWA testing.

Before a playable slice is called accessible, review with accessibility specialists and relevant users through proportionate consented sessions. No real learner recordings or exports enter the repository. Geometry/visual pattern alternatives, mixed-language screen-reader behavior and cognitive load need family-specific evaluation. Release targets do not imply every concept can be assessed through every modality.

See [localisation/speech](LOCALISATION_AND_SPEECH.md), [puzzle contracts](PUZZLE_ARCHITECTURE.md), [platform matrix](OFFLINE_AND_DISTRIBUTION.md) and [testing gates](TESTING_STRATEGY.md).
