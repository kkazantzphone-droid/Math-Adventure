# Development

Phase 1A implements the scaffold, Phase 1B pure exact mathematical/replay foundations, Phase 1C bounded application ports/integrity with a test-only synthetic repository and Phase 1V a scripted visual prototype with bounded human-UAT reconciliation. Phase 1V is **FINAL PASS — OWNER CONFIRMED**, including Space, Shapes, Show me, Explore and the final one-top-side root view. It is not a playable game or an installable/offline PWA. There is no backend, real learner data, learner evidence, production persistence, adaptation, official localisation, speech provider or service worker. Tiny incomplete el-GR/en-GB copy is prototype-only; German remains deferred to Phase 1D. The owner separately authorizes checkpoint 6 Phase 1D after complete Phase 1V verification/local commit with clean status, and conditional checkpoint 7 Phase 1E after complete verified/committed Phase 1D and meaningful browser lifecycle proof. Both later phases remain unstarted at this closure.

## Prerequisites and installation

The verified baseline is Node **24.21.0** (LTS), npm **11.19.0**, Corepack **0.36.0** and pnpm **12.9.1**. `.node-version` pins the Node patch, `package.json` pins pnpm, and `pnpm-lock.yaml` pins the dependency graph. Node is a contributor/build requirement only. Git is needed for contributions; no end-user development runtime is implied.

Verify the tools already installed:

```sh
node --version
npm --version
corepack --version
git --version
```

Invoke pnpm through Corepack; a global pnpm installation or global Corepack activation is unnecessary. In PowerShell, use these process-local cache settings before the commands below:

```powershell
$env:COREPACK_HOME = Join-Path (Get-Location) '.cache/corepack'
$env:COREPACK_DEFAULT_TO_LATEST = '0'
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
```

For a POSIX shell, the equivalent is:

```sh
export COREPACK_HOME="$PWD/.cache/corepack"
export COREPACK_DEFAULT_TO_LATEST=0
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
```

Then, from the repository root:

```sh
corepack pnpm --version
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The first Corepack invocation may download the exact pnpm binary. Dependency installation accesses public package registries; the visual prototype uses local assets only. The development server binds to `127.0.0.1` and prints its URL. The reconciliation QA server used port 5174 because 5173 was already occupied; do not stop another listener. Prepare `http://127.0.0.1:5174/?lang=el` or `http://127.0.0.1:5174/?lang=en`, substituting the port Vite prints on your run. Space is the fixed visual baseline and all legacy `variant` queries are ignored. Only one exact `lang=en` selects English; absence, unsupported values such as `de` or `en-GB`, case changes, malformed encoding and repeated parameters select Greek. This is a documented prototype default, not locale negotiation; no German copy exists. Refresh resets state. The [confirmation UAT protocol](PHASE_1V_UAT_PROTOCOL.md) records the completed owner gate and private-safe procedure. Stop your server with Ctrl+C; do not bind to the LAN or open firewall rules.

pnpm 12 reads project settings from `pnpm-workspace.yaml`. This file has no `packages` field and includes only the root application; the repository remains one package. Store and download cache paths are local and ignored. Dependency lifecycle scripts are denied unless deliberately reviewed and added to `allowBuilds`; strict build approval is enabled. No approval is currently needed by this graph.

Corepack selects/pins pnpm from `packageManager`; `pmOnFail: ignore` intentionally disables pnpm's redundant automatic package-manager checking/switching. This OWNER/QC correction after the initial Phase 1A pass allows a single-document application lockfile for external lockfile consumers/security tooling. Exact pnpm engines and frozen installation remain required. Regenerate lockfiles through the pinned manager, never by editing graph entries. Local one-document validation does not guarantee GitHub dependency graph or Dependabot behavior; hosted validation remains required after an authorized push.

Native pnpm 12 also creates per-user coordination locks in Windows LocalAppData, independently of its store/cache settings. A filesystem sandbox may need scoped permission for that operation. Changing TMP/TEMP cannot relocate these locks; do not disable locking, elevate to administrator or alter machine settings to work around a denial. A restricted operator can add `--state-dir .cache/pnpm-state` to installation to keep other pnpm state local.

## Commands

Use `corepack pnpm <script>` for every command. This guarantees the repository's pinned manager even when another pnpm is on PATH.

| Script                        | Purpose                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `dev`                         | Local Vite development server                                                |
| `preview`                     | Local preview of the production build                                        |
| `format` / `format:check`     | Apply/check Prettier formatting                                              |
| `lint`                        | Type-aware TypeScript/React lint, browser/domain restrictions, zero warnings |
| `typecheck`                   | Separate strict browser, domain, application and test/tool compilations      |
| `test`                        | Interactive Vitest watch mode                                                |
| `test:run`                    | All unit and property tests, once                                            |
| `test:unit` / `test:property` | Run a harness subset                                                         |
| `build`                       | Static production output in ignored `dist/`                                  |
| `verify`                      | Format check → lint → typecheck → tests → build; stops on first failure      |

The canonical quality gate is:

```sh
corepack pnpm verify
```

The `verify` script itself invokes Corepack for each stage, avoiding accidental fallback to an unrelated pnpm. It writes generated build output and ignored tool/test caches. CI uses the same gate after frozen-lockfile installation on Linux and Windows; hosted execution is not verified by local tests. No workflow deploys or publishes anything.

Prettier covers source/config/tests and the new Phase 1A documents. Historical Phase 0 prose is excluded to preserve its existing tables/layout; review touched historical prose with Git diff, whitespace and local-link checks. LF remains authoritative under `.gitattributes`.

## Boundaries and test limits

`src/composition/main.tsx` mounts React, while `src/ui/prototype/` contains isolated Phase 1V scripted fixtures/reducer, tiny copy, language-only `options.ts` and the selected Space view/CSS. Retired B/C switching stays historical documentation. React memory never calls domain/application/repository/speech/persistence APIs; scripted outcomes must never become production mathematical truth. `src/domain/` implements the bounded pure Phase 1B foundation, documented in the [value model](DOMAIN_VALUE_MODEL.md), [replay contract](DETERMINISTIC_REPLAY.md) and [Phase 1B report](PHASE_1B_COMPLETION_REPORT.md). Phase 1C introduces application core/ports/validation; production presentation and real adapters remain absent. See [application ports](APPLICATION_PORTS.md), [repository structure](REPOSITORY_STRUCTURE.md) and [architecture](ARCHITECTURE.md).

All strict TypeScript checks are enabled, including indexed access, exact optional properties, unknown catch values, explicit return paths, fallthrough and unused-code checks. Library typechecking remains enabled. Relative imports suffice; no aliases or barrels are introduced.

`tsconfig.json` checks production `src/` with ES2023, DOM/DOM.Iterable and `vite/client`, without ambient Node types. `tsconfig.tools.json` supplies Node types for tests and Vite configuration; imported UI is still checked independently by the browser project. `tsconfig.domain.json` retains ES-only compilation with no ambient package types or JSX. `tsconfig.application.json` adds ES-only application compilation with no ambient types or JSX. The canonical `typecheck` checks all four, and typed lint explicitly selects these projects. Removing Node ambient types rejects globals such as `process`, `Buffer` and `__dirname`; imported declarations are a separate concern, so browser lint also rejects `node:*` and bare Node built-ins across imports, re-exports, dynamic imports and import types. Nonliteral dynamic specifiers are rejected so this check cannot be silently skipped. Node tooling remains outside `src/`.

Domain lint prevents imports from leaving that folder or importing packages, and rejects browser/Node globals, clock/random reads and JSX. Test-only compiler/lint fixtures cover positive DOM/pure code, forbidden Node globals/modules and deliberate domain escapes. These controls are engineering guardrails, not a security sandbox for malicious code. The browser split and new negative probes are the second OWNER/QC correction after the initial completion pass.

Phase 1C adds application-only/domain relative import rules, ES-only compilation, platform/clock/random/timer bans, positive/negative probes and bounded dependency-cycle review. Runtime data/codec validation and test-only synthetic repository conformance are described in [application ports](APPLICATION_PORTS.md). The independent sequence test has a 15-second per-test budget, fixed seed and 1,000 sequences; this preserves the case count under aggregate worker/compiler load.

Prototype tests use local state/fixture checks and `react-dom/server` semantic markup without a DOM simulation package. Current regressions cover Space selection/retired-query behavior, language-only semantics, same-shape presentation, hint/navigation and concrete Explore ordering/linkage, including the single top root guide labelled 4. Historical three-theme equality/mutation evidence remains in the report. Browser mounting/CSS/keyboard/reflow review and completed owner confirmation provide separate evidence; they do not certify accessibility or browser/OS support. ES2023 is a technical output target, not a promised browser support floor. Actual scope, counts, mutations and review limitations belong in the [Phase 1V report](PHASE_1V_COMPLETION_REPORT.md).

The original Phase 1A property tests remain labelled **HARNESS VALIDATION ONLY**. Phase 1B adds separate domain properties and independent oracle/exhaustive/golden tests covered by the same aggregate command. The original harness tests JSON/string preservation with seed `20261005` and 1,000 cases, plus a test-only lossy mutation and counterexample replay. They do not test future mathematical truth. fast-check reports seed and shrink path on failure; replay by setting the reported `seed` and `path` in its parameters. Future domain changes require independent mathematical ground truth.

No arbitrary coverage threshold or browser/E2E dependency is imposed on this visual candidate. Future domain, storage, accessibility and offline work will add checks at their approved checkpoints. A passing harness supplies no evidence about learner outcomes, official translations, speech or offline operation; engineering PASS cannot approve a visual direction for children.

## Dependencies and maintenance

Runtime dependencies are React and ReactDOM only. Vite with its React plugin builds the shell; TypeScript and declarations check it; Vitest/fast-check test it; ESLint/TypeScript ESLint/React plugins and Prettier verify it. Every direct dependency has an exact version. TypeScript 6.0.3 is selected because TypeScript ESLint 8.71.0 declares support below 6.1; TypeScript 7 is not silently forced past that compatibility range.

Review dependency changes, their install scripts, provenance, licenses and `corepack pnpm audit`. Audits access the registry and reflect its known advisories at that time. Frozen installation and a clean audit do not establish complete supply-chain safety. `public/THIRD_PARTY_NOTICES.txt` preserves the exact MIT notice for React, React DOM and scheduler, and Vite copies it into each static build. Review and update it when the runtime graph changes.

Keep build output, caches, logs, credentials and all real learner material out of commits. `.gitignore` protects common paths; inspect the entire proposed diff as well. The [completion report](PHASE_1A_COMPLETION_REPORT.md) records tested versions, results, review findings and remaining gates.

Primary documentation accessed **2026-10-05**: [Node LTS releases](https://nodejs.org/en/about/previous-releases), [Node 24.21.0](https://nodejs.org/en/blog/release/v24.21.0), [Corepack 0.36.0](https://github.com/nodejs/corepack/blob/v0.36.0/README.md), [pnpm installation](https://pnpm.io/installation), [pnpm project settings](https://pnpm.io/settings), [pnpm pmOnFail](https://pnpm.io/settings/cli#pmonfail), [pnpm lockfile documents](https://pnpm.io/lockfile#when-a-lockfile-has-two-documents), [TypeScript ambient types](https://www.typescriptlang.org/tsconfig/types.html), [Vite guide](https://vite.dev/guide/), [Vitest guide](https://vitest.dev/guide/), [TypeScript ESLint compatibility](https://typescript-eslint.io/users/dependency-versions/).
