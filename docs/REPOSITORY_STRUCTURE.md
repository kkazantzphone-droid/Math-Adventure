# Repository structure and versioning

Status: Phase 1A creates the technical foundation, Phase 1B adds pure domain modules and Phase 1C adds bounded application ports/integrity and synthetic conformance. Historical reports remain unchanged. The second tree describes the broader future application; empty conceptual layers are not scaffolded.

```text
/
  package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version
  index.html vite.config.ts eslint.config.mjs .prettierrc.json .prettierignore
  tsconfig.base.json tsconfig.json tsconfig.domain.json tsconfig.application.json tsconfig.tools.json
  .github/workflows/ci.yml       # workflow file; no remote run performed
  public/THIRD_PARTY_NOTICES.txt # exact bundled runtime license notice
  src/
    application/core/ ports/ repository/ # integrity and contracts only
    composition/main.tsx        # mounts the static shell
    ui/App.tsx styles.css
    domain/
      core/ math/ random/ replay/ concepts/
      expressions/ geometry/ measurement/ puzzles/ # foundations/contracts only
  tests/
    fakes/ conformance/         # synthetic adapter and reusable suite
    unit/                      # shell and architecture checks
    property/                  # original harness + domain properties
    oracle/                    # independent math/RNG reference models
    fixtures/golden/           # synthetic vectors/provenance
    fixtures/synthetic/        # cross-domain semantic contracts
    fixtures/architecture/     # positive/negative technical fixtures
  scripts/domain-boundary.mjs   # narrow lint rule
  scripts/browser-boundary.mjs  # excludes Node modules from production src
  scripts/application-boundary.mjs # application/domain imports only
  docs/DEVELOPMENT.md docs/PHASE_1A_COMPLETION_REPORT.md
  docs/DOMAIN_VALUE_MODEL.md docs/DETERMINISTIC_REPLAY.md
  docs/PHASE_1B_COMPLETION_REPORT.md docs/adr/ADR-0009.md
```

The root `pnpm-workspace.yaml` configures project-local installation policy; this remains one application, not a monorepo. `node_modules`, build outputs and local tool caches are untracked artifacts.

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
