# Product scope

Status: planning only. Accepted runtime constraints are in [ADR-0001](adr/ADR-0001.md).

## Intended release scope

V1 is a React + TypeScript client-side PWA: deterministic math and puzzles, local explainable adaptation, independent local profiles, translations, speech behind an adapter and offline normal play after readiness checks. No application backend is assumed. End users need a compatible browser/device, not Node, npm, pnpm, Git, Python, Conda, Rust, Docker, a shell, database server or cloud account. Internet is needed for initial web delivery, updates and uncached optional assets.

Initial language release targets: el-GR, en-GB, de-DE. Architecture accepts fr-FR, es-ES, it-IT, pt-PT and future community packs without changes to mathematical logic. UI/instruction/spoken-number settings are independent. Support is conditional on reviewed translations and device speech capabilities.

The planned concept catalog has independent but connected domains: number sense; arithmetic; patterns/sequences; multiplication/division; geometry/spatial reasoning; measurement; exponentiation/roots; fractions; decimals/percentages (later content); algebra; logic; and probability/combinatorics (later content). They share canonical concepts/relationships where useful, never one global math level. “Planned first-class” defines the architecture, not a promise to implement all content in the initial slice.

Early number content includes counting, visual recognition/subitizing, numeral/quantity matching, comparison/ordering, before/after/missing numbers, addition/subtraction/bonds/missing addends/multiple operands, patterns/targets and grouping/sharing/repeated addition. Geometry begins early with shape recognition/classification, sides/vertices, composition/decomposition and spatial relations; pathways extend through symmetry, grids, angles, coordinates, transformations, triangles/quadrilaterals/circles, similarity/scale and Pythagorean relationships. Measurement connects length/unit comparison, perimeter, unit-square area, units, time/money and later broader measures.

Exponentiation/roots progresses through repeated multiplication, square and cube numbers where appropriate, geometric squares, powers, inverse power/root relationships and exact perfect-square roots first. The semantic relationship 4 × 4 = 16, 4² = 16 and √16 = 4 can be explored through linked representations. Broader exponents/roots, factors/primes, fractions/equivalence, ratios/percentages, signed numbers, algebra and probability expand incrementally with their own exact types/contracts, without replacing these domains.

Number Lab is a planned unscored mode for number machines, large-number exploration, multiplication, squares/powers/roots, patterns, multiple target constructions, spoken numbers and relationships. It allows safe access ahead of recommendations within deterministic resource/domain limits. Exposure is explicitly separate from formal mastery; no automatic promotion or negative practice evidence. Invalid operations, such as division by zero or an unsupported root domain, receive an explanation rather than silent coercion. Exceeding an exact-computation limit offers a smaller example or supported representation, not a wrong mathematical answer.

Child mode uses large predictable actions, minimal reading, replay/help/skip/stop and recovery. Parent mode manages profiles, language/voice settings, explanations and local data. A deliberate hold plus confirmation, with an equivalent deliberate keyboard/switch/tap sequence, is a proposed convenience boundary, not authentication. An adult arithmetic question is unsuitable as a security boundary.

## Non-goals

Early versions exclude cloud accounts, backend APIs, multiplayer, sibling competition, school/class administration, ads, subscriptions/billing/payments, social features, child chat, generative-AI tutors, speech recognition, camera, microphone, biometrics, geolocation, behavioural advertising, remote telemetry and a plugin marketplace. AI may be considered later for contributor tooling or optional presentation under a new privacy/architecture review, never mathematical truth.

Phase 0 is documentation only. Phase 1 is a technical skeleton only. Complete gameplay, real learner use, public release and deployment are later checkpoints; see [roadmap](ROADMAP.md).
