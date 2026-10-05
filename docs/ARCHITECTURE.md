# Architecture

Status: accepted direction with an unchanged Phase 1A static shell and Phase 1B pure domain foundations. Exact values, replay/PRNG, concept graphs and semantic contracts are implemented; application, presentation, infrastructure, learner and game behavior remain prospective. Interfaces below describe the fuller target rather than implemented ports. See [decision register](DECISION_REGISTER.md) and [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md).

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

The diagram describes the target architecture. Phase 1A mounts `src/ui/App.tsx` from `src/composition/main.tsx`; `src/domain/README.md` records the implemented pure boundary and links the Phase 1B contracts. Separate TypeScript projects check browser source with ES/DOM/Vite types and no ambient Node types, tests/build tooling with Node types, and domain code without DOM or ambient Node/framework types. The OWNER/QC correction adds browser Node-module/global lint guards and negative probes alongside the existing domain restrictions. These establish the initial import/platform boundary with the Phase 1B implementations now checked under the same restrictions and no speculative ports. Gate results and remaining limits belong in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md).

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

Names denote contracts specified in [learner data](LEARNER_DATA_MODEL.md) and [speech](LOCALISATION_AND_SPEECH.md); this is not a type-complete application. Application ports contain I/O; pure domain functions described in [puzzles](PUZZLE_ARCHITECTURE.md) and [adaptation](ADAPTIVE_LEARNING_MODEL.md) return values/events.

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

## Phase 1B dependency direction

`domain/core` owns data guards/results/IDs. Math imports core; random imports core; replay imports core/random; graph imports core; expression/geometry/measurement import core/math; puzzle contracts import these semantic modules and replay. The future executable family interface uses type-only imports. No domain module imports packages, UI, DOM, Node or infrastructure. The UI imports no domain module, preserving the shell bundle. [Value model](DOMAIN_VALUE_MODEL.md), [replay](DETERMINISTIC_REPLAY.md) and [completion report](PHASE_1B_COMPLETION_REPORT.md) maintain concrete contracts and evidence.
