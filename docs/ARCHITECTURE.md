# Architecture

D49/D50/D51 [Phase 3C reconciliation](PHASE_3C_COMPLETION_REPORT.md) retains the
separate capability-gated loopback build, outside normal product composition.
Reusable child answer cards/tokens/shape/layout components adapt direct choices
to existing structured answers; domain still regenerates replay and decides
correctness. Child mode mounts badge identities and Play/Shapes/Explore; the exact
diagnostic TaskView, settings and full family catalog remain in developer mode.
Child shape recognition uses existing inaccessible-scope exclusion rather than
full classification credit. The application aggregate, Phase 3A atomic adapter,
proposed Phase 3B policy, replay and learner-data lifecycle port are preserved;
five new families remain `limitedEvidence`. No ordinary product database import,
backend or new dependency is introduced. Preserved full/fresh source gates and both native
54-case matrices pass; normal eight artifacts are byte-equal to the preserved
engine. Native test/development rendering and the separately reviewed production
renderer bind their own artifacts. On 2026-10-07 the owner confirmed the direct
eight-family child answers, visual help, badges/navigation and separate diagnostics:
**PHASE 3C PLAYABLE SYNTHETIC LOOP + CHILD UX — ENGINEERING/OWNER PASS**.
The documentation-only publication continuation requires new full/fresh and
exact-head required CI evidence; `owner_merge` applies.
**FULL PHASE 3C DEVICE/AT CERTIFICATION — PENDING EXTERNAL EVIDENCE** remains
distinct. No accepted architecture/ADR, real-child use or next-phase change follows.

Merged checkpoint 7 (D44): composition injects a presentation-only offline port. Infrastructure owns native worker/cache/registration/update effects, presentation owns draft copy and capability contracts, and UI owns status and the explicit Home update control. `scripts/pwa-build.ts` emits the bounded hashed release and worker. Domain/application truth, replay and integrity remain unchanged. See [design](PHASE_1E_OFFLINE_DESIGN.md), [evidence](PHASE_1E_COMPLETION_REPORT.md) and [consolidated closure](PHASE_1_COMPLETION_REPORT.md).

Inherited foundation: accepted direction with completed merged Phase 1A/1B/1C foundations, owner-confirmed Phase 1V, bounded Phase 1D localisation/local-only speech and Phase 1E production offline shell. Phase 2 real-family proof and red-team repairs, browser proof tooling and autonomy governance are also merged in closure baseline `93db59893b076925b1fdb5fadfa5abb9dfb274ac`. Their original reports retain candidate-specific local/fresh/hosted/browser limits. D49/D50's separate synthetic loop is recorded above; normal product learner persistence and adaptation remain unwired. The diagram and answer/session flow below describe the fuller target; current ports are maintained in [application ports](APPLICATION_PORTS.md).

## Runtime and dependency direction

Build a single application repository with internal TypeScript modules. Deliver static assets to a browser/PWA; run truth, adaptation and state locally. Node and pnpm are developer/build tools only, now pinned for Phase 1A. Python/FastAPI, backend, account and cloud learner store are outside V1. Tauri is a preferred future packaging candidate, not a present dependency.

```mermaid
flowchart TD
  UI[React child and parent UI] --> APP[Application commands and session orchestration]
  APP --> PUZ[Puzzle families]
  APP --> ADAPT[Learner evidence and adaptive policy]
  APP --> GAME[Personal rewards and Number Lab policy]
  PUZ --> MATH[Exact mathematical operations]
  ADAPT --> SKILLS[Concept graph and evidence types]
  GAME --> TYPES[Domain events and value types]
  APP --> PORTS[Application ports]
  STORE[IndexedDB adapter] -. implements .-> PORTS
  SPEECH[Speech adapter] -. implements .-> PORTS
  LOCALE[Localisation and presentation adapters] -. implements .-> PORTS
  PLATFORM[PWA and future desktop adapters] -. implements .-> PORTS
  ROOT[Composition root] --> APP
  ROOT --> STORE
  ROOT --> SPEECH
  ROOT --> LOCALE
  ROOT --> PLATFORM
```

Arrows mean imports; dotted arrows mean contract implementation. UI imports application view models/commands, not concrete storage/speech adapters. The composition root wires adapters. Infrastructure may use domain values/contracts; domain never imports application, adapters, React, DOM, IndexedDB, speech synthesis, service workers or Tauri. No infrastructure module owns mastery or mathematical truth.

The diagram describes the target architecture. The composition root mounts `src/ui/App.tsx` from `src/composition/main.tsx`; Phase 1V replaces the technical placeholder with `src/ui/prototype/`. `src/domain/README.md` records the implemented pure boundary and links the Phase 1B contracts. Separate TypeScript projects check browser source with ES/DOM/Vite types and no ambient Node types, tests/build tooling with Node types, and domain/application code without DOM or ambient Node/framework types. The OWNER/QC correction adds browser Node-module/global lint guards and negative probes alongside the existing domain restrictions. Historical scaffold gate results and limits belong in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md).

The preserved Phase 1V intentionally imported only local UI/prototype modules, without an application command, session engine, repository, domain evaluator, speech or persistence adapter. Its fixed reducer/fixtures and tiny el-GR/en-GB copy supplied a bounded visual candidate. The owner-selected [Space visual baseline](adr/ADR-0011.md) replaces the historical three-alternative production switch; legacy `variant` queries remain ignored. Phase 1D changes the presentation boundary and composition wiring, while preserving scripted fixtures/reducer and accepted visuals. Typed message schemas and locale manifests own wording/formatting; semantic fixed speech plans own nonpersonal utterance construction. Infrastructure implements the existing generic speech port with browser SpeechSynthesis; composition injects it into the UI. UI does not call browser speech globals, and application/domain gain no DOM, timer, random or speech API dependency. See [ADR-0012](adr/ADR-0012.md).

The reconciliation makes shape matching visibly concrete and keeps help child-controlled near answers. Explore begins with one sixteen-tile array before the ordered representations. After a selection, that single array remains inside its step, retaining identical cells/coordinates and four-by-four sides/rows; there are no extra diagrams, overlays or automatic scrolling. The final root view highlights only four top tiles under one bracket labelled 4, with concrete square/side meaning before the concluding √16 = 4. Scripted outcomes must never become production mathematical truth. Badge/activity/exploration selections and all three language preferences remain transient, reset on reload and create no learner or exploratoryExposure evidence. This prototype does not implement the answer/commit flow below or accept the proposed general SVG/MathML strategies. Phase 1V's owner gate and Phase 1D bounded engineering gate are complete; Phase 1E's merged shell lifecycle does not introduce learner persistence or migration.

Phase 1D knows seven exact locales, with three draft prototype schemas and four planned/incomplete manifests. `uiLocale` owns chrome/navigation/accessibility UI wording; `instructionLocale` owns task/hint/relationship instruction wording; `numberSpeechLocale` owns spoken number/math plans. Browser language is not selection authority. Structured typed messages and Intl.PluralRules/Intl.NumberFormat require no new runtime dependency or generic ICU parser. Messages format fixed semantic values; they do not decide correctness or calculate a relationship. Principal √16 = 4 remains distinct from the solution set of x² = 16.

| Module | Owns | Cannot own |
| --- | --- | --- |
| domain/math | Exact values/operations, domain errors | Formatted text, storage, learner state |
| domain/puzzles | Semantic tasks, generators, validation, semantic hints | React rendering, translated strings |
| domain/learning | Graph, evidence transitions, recommendations/reasons | Device clocks, I/O, diagnoses |
| domain/game | Personal milestones/reward events, exploration policy | Mathematical access or correctness |
| application | Session commands, injected seed/time, ports, atomic effects | Reimplementing validation in handlers |
| presentation | Localised view/utterance plans, answer input parsing | Ground truth |
| infrastructure | Browser/native persistence, speech, caching, capability adapters | Pedagogical policy |
| ui | Accessible interaction and focus | Stored evidence mutation directly |

The application coordinates an answer: parse a structured answer at the presentation boundary; validate it in domain; produce one logical attempt outcome; compute evidence/recommendation and reward events; commit atomically through a persistence port; acknowledge save status; render localised feedback; optionally speak it. A failed save cannot be displayed as saved. Use operation IDs/revision checks to prevent duplicate submission or stale-tab overwrites.

Phase 2 implements only the stateless generation/answer-validation subset. `src/domain/families/` owns three bounded generators, semantic tasks/hints, catalog metadata and exact validators. `src/application/family-proof.ts` returns task/replay and semantic attributes/unit segments while omitting expected answers; submission regenerates the instance and delegates correctness to domain. `src/ui/family-proof/` owns native controls, response encoding, transient feedback and SVG/HTML layout. It has no mathematical validator, observation, repository command, mastery update or next-task selector. The deliberate developer path preserves the normal Phase 1V flow. [Family design](PHASE_2_FAMILY_PROOF.md) records exact bounds, representation/evidence limits and independent oracle requirements; D29/D30 remain proposed.

Pure functions take explicit policy/configuration and immutable data. Inject clocks, random seeds and capability results at ports. No hidden Date.now(), Math.random() or platform reads in the domain. Randomness is for variation, never security.

## Contract sketches

```ts
type DomainResult<T> = { ok: true; value: T } | { ok: false; code: string };
interface LearnerRepository {
  load(id: string): Promise<DomainResult<LearnerSnapshot>>;
  commit(command: PersistCommand, expectedRevision: number):
    Promise<DomainResult<{ revision: number }>>;
}
interface SpeechService {
  capabilities(locales: readonly string[]): Promise<SpeechCapability[]>;
  speak(plan: UtterancePlan): Promise<SpeechOutcome>;
  cancel(): void;
}
```

These historical target sketches denote future learner/speech specializations, not the implemented protocol. Phase 1C uses `AtomicRecordRepository<T>`, application results, versioned commands/receipts, revision/epoch/operation IDs and runtime codecs. Phase 1D supplies presentation-owned fixed semantic plans to the unchanged generic speech port; no learner orchestration or storage behavior follows. Application ports contain I/O; pure domain functions described in [puzzles](PUZZLE_ARCHITECTURE.md) and [adaptation](ADAPTIVE_LEARNING_MODEL.md) return values/events.

Use React local state/reducers for transient UI and one application session controller. IndexedDB is durable authority; no parallel global store with separate mastery logic. Reconsider a larger state framework only after a measured coordination problem. Defer router complexity; initial screen navigation can be local state/hash navigation, avoiding static-host history fallback requirements.

## First-class mathematical domains and representations

The content graph covers independent pathways for number sense, arithmetic, patterns/sequences, multiplication/division, geometry/spatial reasoning, measurement, exponentiation/roots, fractions, decimals/percentages, algebra, logic and probability/combinatorics. Canonical concept evidence, not a global math level, is authoritative. A concept may belong to several domain views; typed prerequisite/related/representation/inverse links connect them without duplicating learner evidence. Geometry and measurement begin with early concepts; advanced content is staged, not architecturally secondary.

Domain geometry owns shapes, relations, exact coordinates/units and answer predicates; rendering owns scalable presentation. Prefer declarative SVG for bounded interactive geometry with semantic DOM controls/equivalents, keyboard/touch actions and deterministic view specifications. Canvas is an optional measured rendering adapter, never the sole accessible/truth representation. SVG pixels, DOM bounding boxes and pointer positions are not mathematical ground truth.

Powers/roots use structured expression nodes and inverse/representation links, not merely calculator buttons. Measurement types separate quantity/unit/dimension and exact versus approximate tasks. Presentation supports native MathML or a reviewed typesetting adapter for richer notation; plain semantic DOM plus spoken/text plans remain required. Neither typesetter nor SVG/speech computes correctness. Detailed contracts and limitations are in [puzzles](PUZZLE_ARCHITECTURE.md), [accessibility](ACCESSIBILITY.md) and [technology evaluation](TECHNOLOGY_EVALUATION.md).

## Failure and trust boundaries

Storage denied/full: continue an explicitly unsaved session if parent accepts, avoid false persistence claims, offer retry/recovery. Speech missing: retain visual/accessibility equivalents; offer Voice Check. Offline incomplete: say which resources are missing and offer installed content. Corrupt/future schema: read-only recovery, no automatic reset. Broken rewards: preserve puzzle access. Invalid generated tasks: fail safely and record a synthetic reproducible defect; never present an unvalidated puzzle.

Contributions are untrusted until reviewed/built; there is no runtime downloaded code. Translation text is data and renders without HTML. Imports are untrusted bounded data. The static host and update chain can replace code; CSP cannot rescue a compromised first-party origin. See [threat model](SECURITY_THREAT_MODEL.md).

## Critical evaluation and evolution

Client-side runtime satisfies offline local computation and privacy with little operational burden. Limits include browser eviction, origin-bound data, uncertain speech, device variance and constrained update headers. None currently requires a backend. [Technology evaluation](TECHNOLOGY_EVALUATION.md) compares frameworks and storage choices.

Extract packages only when a second consumer or enforced reuse requires it. Future desktop reuse keeps domain/application contracts; replace persistence/speech/platform adapters as needed, with explicit export/import rather than assuming browser and desktop share storage. New requirements for collaboration, sync or remote AI require a new ADR and privacy review, not silent erosion of ADR-0001.

## Implemented dependency direction

`domain/core` owns data guards/results/IDs. Math imports core; random imports core; replay imports core/random; graph imports core; expression/geometry/measurement import core/math; puzzle contracts import these semantic modules and replay. The family interface uses type-only imports; executable Phase 2 families import existing pure modules and their static concept catalog. No domain module imports packages, UI, DOM, Node or infrastructure. The preserved Phase 1V UI itself imports no domain/application module; the separate Phase 2 proof now bundles its stateless application/domain path deliberately. [Value model](DOMAIN_VALUE_MODEL.md), [replay](DETERMINISTIC_REPLAY.md) and [completion report](PHASE_1B_COMPLETION_REPORT.md) maintain historical foundation contracts and evidence.

Phase 1C adds ES-only application compilation, application/domain-only imports and bounded cycle/inversion probes. Application core owns nonmathematical integrity/results, validation reuses canonical data, and ports declare async I/O/capability facts. The test-only adapter stays outside production source. Production speech/offline adapters exist; no production learner persistence adapter or session engine exists. See [application ports](APPLICATION_PORTS.md).
