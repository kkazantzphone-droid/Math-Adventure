# Repository structure and versioning

Current Phase 3C and Phase 3 acceptance: **PASS — bounded synthetic scope**.
The owner's 2026-10-07 [observation](evidence/phase3c-closure/owner-observation.json)
reports current Chrome native 200% zoom, delivered Windows 11 / Chrome / Narrator
content and focus, and an actual externally disconnected-device restart with
synthetic persistence/reopen checks all PASS on the bound production surface.
[Closure evidence](PHASE_3_COMPLETION_REPORT.md) retains the precise limits.
Final closure requires this candidate's complete local/fresh, independent,
exact-head hosted and protected merge gates; actual final results and merge state
are recorded in PR #14. Unchanged V2 automatic_when_eligible applies to D52;
D51's owner_merge milestone is historical after merged PR #13. Owner-approved
UX, exact engine and conservative evidence scopes remain. No broader device,
WCAG, language, educational or real-child certification, release, deployment or
Phase 4 follows. Earlier checkpoint descriptions below retain historical scope.

Phase 3A adds `src/infrastructure/persistence/{adapter,layout,maintenance,envelope}.ts`,
`vite.persistence.config.ts`, `tests/browser/phase3/`, `tests/integration/` and
focused boundary/mutation tooling. The developer entry builds separately under
ignored `.cache/`; normal composition is unchanged and no synthetic artifacts ship
in its production output.
[Completion evidence](PHASE_3A_COMPLETION_REPORT.md) records exact synthetic schema
and native gates. No `domain/learning` or adaptation engine is added.

Merged D44 additions: `public/manifest.webmanifest`, the original local icon, `scripts/pwa-build.ts`, `src/infrastructure/offline/`, `src/presentation/offline/`, `src/ui/offline/` and focused tests. Developer-only proof adds native production lifecycle assertions and an owned loopback transport gate outside shipped artifacts. See [design](PHASE_1E_OFFLINE_DESIGN.md) and [completion](PHASE_1E_COMPLETION_REPORT.md). Shell protocol/schema/release identities do not replace generator/content/semantic/canonicalization/application versions.

Status: the owner-supplied protected-main closure baseline `93db59893b076925b1fdb5fadfa5abb9dfb274ac` contains completed Phase 1A/1B/1C, owner-confirmed Phase 1V, bounded Phase 1D and production Phase 1E. Phase 2, proof enablement and autonomy governance are also merged. [Consolidated closure](PHASE_1_COMPLETION_REPORT.md) records exact revisions and evidence limits. The first tree describes implemented modules; the second describes the broader future application. Empty conceptual layers are not scaffolded.

Merged Phase 2 supplies three bounded family modules, a stateless application facade and deliberate developer view. [Design](PHASE_2_FAMILY_PROOF.md), [original report](PHASE_2_COMPLETION_REPORT.md) and [red-team report](PHASE_2_RED_TEAM_REPORT.md) preserve exact mathematical/version/modality limits, 501-test original proof and 514-test review/repair proof. Their historical publication status does not describe the current merged dependency sequence; future candidates require their own checks.

```text
/
  package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version
  index.html vite.config.ts eslint.config.mjs .prettierrc.json .prettierignore
  tsconfig.base.json tsconfig.json tsconfig.domain.json tsconfig.application.json tsconfig.tools.json
  .github/workflows/ci.yml       # unchanged required Ubuntu/Windows verification contexts
  public/THIRD_PARTY_NOTICES.txt # exact bundled runtime license notice
  public/manifest.webmanifest icons/math-adventure.svg # local coherent PWA shell assets
  src/
    application/core/ ports/ repository/ # integrity and contracts only
    application/family-proof.ts # stateless public view/submit facade; no learner command
    composition/main.tsx        # mounts the local visual prototype
    presentation/localisation/ # exact manifests/preferences/schema/draft packs/native Intl
    presentation/speech/       # fixed semantic nonpersonal prototype plans
    presentation/offline/      # shell capability/update contracts and draft status wording
    infrastructure/speech/     # browser speech/capability adapter, no learner storage
    infrastructure/offline/    # native worker/cache/update shell effects
    ui/App.tsx styles.css
    ui/prototype/              # scripted model/fixtures, tiny copy/options, selected Space view/CSS
    ui/family-proof/           # deliberately enabled generated-task Space developer proof
    ui/offline/                # truthful shell status and explicit adult Home update
    domain/
      core/ math/ random/ replay/ concepts/
      expressions/ geometry/ measurement/ puzzles/ # foundations/contracts only
      families/               # bounded executable proofs and static connected metadata graph
  tests/
    fakes/ conformance/         # synthetic adapter and reusable suite
    unit/                      # prototype, shell composition and architecture checks
    property/                  # original harness + domain properties
    oracle/                    # independent math/RNG reference models
    fixtures/golden/           # synthetic vectors/provenance
    fixtures/synthetic/        # cross-domain semantic contracts
    fixtures/architecture/     # positive/negative technical fixtures
    e2e/                       # synthetic native browser/lifecycle proof and fixtures
  scripts/domain-boundary.mjs   # narrow lint rule
  scripts/browser-boundary.mjs  # excludes Node modules from production src
  scripts/application-boundary.mjs # application/domain imports only
  scripts/codex-behavior-evals.mjs # developer-only structured fixture validation/grading
  scripts/pwa-build.ts          # bounded release/hash/worker output, no learner schema
  evals/codex-behavior/           # sixteen synthetic scenarios, schema, example and limits
  .agents/skills/                # three instruction-only repository Codex skills
  docs/CODEX_OPERATING_MODEL.md docs/CODEX_TASK_TEMPLATES.md
  docs/CODEX_AUTONOMY_V1_COMPLETION_REPORT.md # governance evidence, separate from product phases
  docs/DEVELOPMENT.md docs/PHASE_1A_COMPLETION_REPORT.md
  docs/DOMAIN_VALUE_MODEL.md docs/DETERMINISTIC_REPLAY.md
  docs/PHASE_1B_COMPLETION_REPORT.md docs/adr/ADR-0009.md
  docs/PHASE_1V_COMPLETION_REPORT.md docs/PHASE_1V_UAT_PROTOCOL.md
  docs/adr/ADR-0011.md          # owner-confirmed Space baseline and final visual gate
  docs/PHASE_1D_COMPLETION_REPORT.md docs/adr/ADR-0012.md # candidate evidence/policies
  docs/PHASE_2_FAMILY_PROOF.md docs/PHASE_2_COMPLETION_REPORT.md # design and actual evidence
  docs/PHASE_1_COMPLETION_REPORT.md # consolidated merged closure and evidence limits
  docs/PHASE_3_IMPLEMENTATION_PLAN.md # future synthetic-only 3A/3B/3C stage gates
```

The root `pnpm-workspace.yaml` configures project-local installation policy; this remains one application, not a monorepo. `node_modules`, build outputs and local tool caches are untracked artifacts.

The preserved scripted prototype still contains no mathematical family validator, learner schema, application command or persistence adapter. The separate Phase 2 path calls the stateless facade and domain families, with no attempt/evidence store. Synthetic badges/interactions and all preferences remain transient. Historical B/C themes are documented rather than retained as dead production code. The frozen Phase 1V UAT/report/ADR record only the authorized aggregate procedure/findings and owner acceptance, not individual sessions, identifying details, raw child notes or media. **FINAL PASS — OWNER CONFIRMED** closes its human gate for Space, Shapes, Show me, Explore and the final one-top-side root view.

The Phase 1D presentation boundary owns exact seven-locale manifests and independent preferences, typed messages/draft el-GR/en-GB/de-DE packs, native Intl formatting and fixed semantic speech plans. Planned fr-FR/es-ES/it-IT/pt-PT manifests contain no fabricated translations. Infrastructure alone owns SpeechSynthesis/voice enumeration/timers behind the unchanged generic application speech port; composition injects it into UI. Tests use deterministic fake speech/capabilities and fixed nonpersonal data. These additions create no learner records/evidence/storage, remote TTS or worker/PWA module; bounded checkpoint-6 engineering gates passed and were locally preserved at `56ad5182ee3364174c1d335f1d7f90ef8f1cbd8d`.

## Proposed later application layout

```text
/
  README.md AGENTS.md CONTRIBUTING.md SECURITY.md .gitignore
  docs/                         # specifications, evidence, review and ADRs
  src/
    domain/
      math/ puzzles/ learning/ game/
    application/
      ports/ commands/ sessions/
    presentation/
      localisation/ tasks/ speech-plans/ input/
    infrastructure/
      persistence/ speech/ platform/ pwa/
    ui/
      child/ parent/ components/
    composition/                # concrete adapter wiring
  content/
    concepts/ puzzle-catalog/    # reviewed language-neutral metadata
    locales/
      el-GR/ en-GB/ de-DE/
      fr-FR/ es-ES/ it-IT/ pt-PT/ # manifests may be beta/planned, not pretend complete
  public/
    assets/                     # curated licensed public material only
  tests/
    fixtures/synthetic/         # visibly fictional learners/history, never exports
    unit/ property/ integration/ e2e/
  scripts/                      # future narrow developer quality checks
```

One application/lockfile is sufficient. Phase 1A supplies import restrictions and browser-free domain compilation without separate published packages. The domain TypeScript configuration excludes DOM libraries and ambient Node/framework types; `tsconfig.json` checks browser source with ES/DOM/Vite types and no Node ambient types; `tsconfig.tools.json` gives tests/Vite configuration Node types separately. The initial ESLint boundary permits only relative imports within domain and rejects JSX and hidden clocks/randomness. The OWNER/QC correction adds a browser Node-module/global guard and positive/negative technical fixtures. Phase 1C adds ES-only application compilation, application/domain-only imports, platform/global guards and bounded cycle/inversion tests. Real adapter boundaries remain later work. See [application ports](APPLICATION_PORTS.md). No domain access to persistence/global clocks is permitted.

Migrate to workspace packages only when a real second consumer/desktop adapter/public library requires independent build/publishing, or import enforcement proves inadequate. Extract domain contracts first, keep internal APIs explicit and update ADR-0002; do not create a monorepo preemptively.

Synthetic files use synthetic-player-001 style IDs and an explicit synthetic marker/schema. Personal runtime material goes outside tracked source or into ignored local-data/private-data/learner-exports directories. Curated screenshots or audio, if later needed, use a reviewed synthetic-assets directory with provenance, not a blanket unignore of captures. .gitignore cannot prevent tracked-file or PR-attachment disclosure.

## Version compatibility

| Version | Format / purpose | Compatibility rule |
| --- | --- | --- |
| Application release | SemVer; pre-alpha 0.x until an explicit stable contract | Publish documented compatibility ranges; a rollback must read current data safely |
| Learner schema | Monotonic integer | Tested forward migration only; old app refuses incompatible writes |
| Generator semantics | Immutable family-scoped behavioral ID | Same seed/spec/versions yield same semantic task; no old ID reuse |
| RNG algorithm | Immutable algorithm ID + seed encoding | Golden cross-runtime vectors; never tied to locale/rewards |
| Content/graph | Manifest version + evidence-scope compatibility | ID changes/coverage changes require explicit mapping/review, not silent mastery transfer |
| Language pack | Pack SemVer + message-schema/content range | Completeness/status manifest and native review; cache coherent with release |
| Export envelope | Integer formatVersion + schema/model/generator metadata | Reject unknown future format; staged migration/preview only |
| Adaptive policy | Immutable policy ID | Store provenance, simulate rule changes; no silent reclassification of historical evidence |

[SemVer](https://semver.org/) describes public API version changes; it does not automatically solve data/content migrations. Pre-1.0 may change interfaces, but user data remains protected. If graph concepts split/merge, preserve old scoped accomplishment and require new evidence/probe; never invent new mastery. Pack versions and application versions are not schema numbers.

See [architecture](ARCHITECTURE.md), [puzzles](PUZZLE_ARCHITECTURE.md), [learner data](LEARNER_DATA_MODEL.md) and [offline strategy](OFFLINE_AND_DISTRIBUTION.md).
