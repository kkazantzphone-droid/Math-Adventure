# Development

Phase 3C has an implemented separate fixed-profile developer loop; its
[current report](PHASE_3C_COMPLETION_REPORT.md) records final engineering evidence
separately from the unavailable actual device/AT and disconnected-restart gates.
Use the pinned process-local Corepack setup below. Launch only on the deliberate
loopback origin with an explicit port; normal `dev`/`build` composition does not
enable or silently open learner persistence. No free-text learner input is supported.

```powershell
corepack pnpm exec vite --config vite.slice.config.ts --host 127.0.0.1 --port 4178
corepack pnpm exec vite build --config vite.slice.config.ts
$env:PHASE3C_BROWSER = 'chrome'
corepack pnpm exec vitest run --config vite.slice.config.ts
$env:PHASE3C_BROWSER = 'msedge'
corepack pnpm exec vitest run --config vite.slice.config.ts
```

The installed-browser suite builds real releases in fresh disposable synthetic
contexts and owns its loopback servers/root/subpath checks. It retains sanitized
counts/hashes rather than raw browser profiles, traces, screenshots/audio or
database dumps. Once source is stable and no other builds/tests/proofs are running,
run serially `corepack pnpm exec node scripts/slice-mutations.mjs` and
`corepack pnpm exec node scripts/phase3c-loop-mutations.mjs`; every intended
assertion defect must be detected and exact bytes restored. Canonical/full fresh
verification and inherited Phase 1E/3A/3B regressions remain separate gates. Do not
infer complete 3C certification or reduce the mandatory observation gate to merge.

Phase 3B exposes a fixed memory-only adaptation simulation through the same
separate capability-gated Phase 3A developer entry. It adds no normal child
selection or record writing. After the canonical gate, run serially
`corepack pnpm exec node scripts/adaptation-mutations.mjs` and
`corepack pnpm exec node scripts/adaptation-proof.mjs` (optionally
`PHASE3_BROWSER=msedge`). Source must be stable and no other test/build running
during mutation proof. [Completion evidence](PHASE_3B_COMPLETION_REPORT.md)
records experimental policy, finite universes, review, restored assertions and
native summary limits. Educator-approved policy and 3C remain separate gates.

Phase 3A has a separate synthetic developer build and isolated loopback browser
proof, with no entry in normal navigation. After `corepack pnpm verify`, run
`corepack pnpm persistence:proof` once with `PHASE3_BROWSER=chrome` and once with
`PHASE3_BROWSER=msedge`. Each uses the installed exact browser product in a fresh
disposable synthetic profile. `corepack pnpm persistence:mutations` runs the six
restored assertion mutations serially; do not run other builds/proofs concurrently.
Follow each channel's native proof with `corepack pnpm persistence:offline-proof`
for the selected compatible synthetic shell, stopped-listener restart and owned
cache cleanup. Its test worker is separate from the child PWA worker.
No browser download, runtime dependency, arbitrary profile/file input or normal
learner storage is enabled. [Phase 3A report](PHASE_3A_COMPLETION_REPORT.md) records
layout, evidence and policy/device limits.

Current merged Phase 1E shell uses unchanged exact pins. Run frozen install and `corepack pnpm verify`, then sequentially `corepack pnpm browser:proof`; browser proof owns three actual release builds and ephemeral loopback resources. An owned transport proxy complements native Chromium offline mode without fabricating cache responses. No global tool/browser installation is needed. [Design](PHASE_1E_OFFLINE_DESIGN.md) and [completion evidence](PHASE_1E_COMPLETION_REPORT.md) define bounded claims; [Phase 1 closure](PHASE_1_COMPLETION_REPORT.md) records merged dependency revisions.

Phase 1 technical foundations, final owner-confirmed visual prototype, draft locale/local-only speech infrastructure and bounded offline shell are complete and merged at `93db59893b076925b1fdb5fadfa5abb9dfb274ac`. Phase 2's three deterministic families, autonomy governance and DEV/TEST browser proof enablement are also merged. Normal play and the deliberate family-proof path remain transient, with no learner records/evidence, persistence or adaptation. Historical full/fresh, hosted and browser observations retain their exact original candidates in the phase reports. Real storage and the first playable learner loop require the separately bounded Phase 3 stages; no real learner trials, public hosting, release or deployment follows from these foundations.

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

The first Corepack invocation may download the exact pnpm binary. Dependency installation accesses public package registries; the prototype uses local app assets only. The development server binds to `127.0.0.1` and prints its URL; do not stop an unrelated listener. Space is fixed and legacy `variant` queries are ignored. Phase 1D supports one exact `?lang=el`, `?lang=en` or `?lang=de` alias for all language roles together; the aliases are prototype conveniences, not canonical stored locale IDs. Absent, unknown, case-changed, repeated or malformed alias input defaults to el-GR.

Independent inputs are `ui=`, `instruction=` and `speech=` with one exact tag from **el-GR, en-GB, de-DE, fr-FR, es-ES, it-IT, pt-PT**. For example, `?ui=el-GR&instruction=en-GB&speech=de-DE` uses Greek UI, English instructions and German number/math speech plans. An absent field retains the alias/default; invalid/repeated input resets only that field to el-GR. Planned-locale requests preserve their requested identity but expose an effective Greek display fallback with `planned-pack` status in adult diagnostics; planned speech is unavailable, not silently substituted. URLSearchParams decodes once and navigator.language is not authority. Refresh resets prototype/preferences state; no records are stored. See [localisation/speech](LOCALISATION_AND_SPEECH.md) for exact metadata and policy.

The [Phase 1V confirmation protocol](PHASE_1V_UAT_PROTOCOL.md) is a historical accepted procedure, not the current Phase 1D query contract. Stop your server with Ctrl+C; do not bind to the LAN or open firewall rules. Any speech check uses fixed nonpersonal phrases and an explicit exact local voice only; do not install voices, alter machine/firewall settings or imply tested-offline capability from localService.

For optional adult/developer inspection, add **one exact `voiceCheck=1`** parameter, for example `?lang=de&voiceCheck=1`; repeated diagnostic flags disable it. Voice Check shows seven locale statuses, exposed/local counts and transient voice details, explicit fixed-phrase controls where eligible, and the latest test locale/outcome with aria-live off. It performs no automatic speech. Missing exact local voices are valid results. Explicit Stop speech, navigation/context actions, preference changes and pagehide cancel obsolete playback; plans/outcomes never change mathematical or learner state. A reported local voice is not an observed offline or pronunciation-quality result.

pnpm 12 reads project settings from `pnpm-workspace.yaml`. This file has no `packages` field and includes only the root application; the repository remains one package. Store and download cache paths are local and ignored. Dependency lifecycle scripts are denied unless deliberately reviewed and added to `allowBuilds`; strict build approval is enabled. No approval is currently needed by this graph.

Corepack selects/pins pnpm from `packageManager`; `pmOnFail: ignore` intentionally disables pnpm's redundant automatic package-manager checking/switching. This OWNER/QC correction after the initial Phase 1A pass allows a single-document application lockfile for external lockfile consumers/security tooling. Exact pnpm engines and frozen installation remain required. Regenerate lockfiles through the pinned manager, never by editing graph entries. Local one-document validation does not guarantee GitHub dependency graph or Dependabot behavior; hosted validation remains required after an authorized push.

Native pnpm 12 also creates per-user coordination locks in Windows LocalAppData, independently of its store/cache settings. A filesystem sandbox may need scoped permission for that operation. Changing TMP/TEMP cannot relocate these locks; do not disable locking, elevate to administrator or alter machine settings to work around a denial. A restricted operator can add `--state-dir .cache/pnpm-state` to installation to keep other pnpm state local.

## Commands

Use `corepack pnpm <script>` for every command. This guarantees the repository's pinned manager even when another pnpm is on PATH.

| Script                        | Purpose                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `dev`                         | Local Vite development server                                                          |
| `preview`                     | Local preview of the production build                                                  |
| `format` / `format:check`     | Apply/check Prettier formatting                                                        |
| `lint`                        | Type-aware TypeScript/React lint, browser/domain restrictions, zero warnings           |
| `typecheck`                   | Separate strict browser, domain, application and test/tool compilations                |
| `test`                        | Interactive Vitest watch mode                                                          |
| `test:run`                    | All unit and property tests, once                                                      |
| `test:unit` / `test:property` | Run a harness subset                                                                   |
| `evals:validate`              | Validate engineering and merge-governance synthetic fixtures; no model/network call    |
| `build`                       | Static production output in ignored `dist/`                                            |
| `verify`                      | Format → lint → typecheck → fixture validation → tests → build; stops on first failure |

The canonical quality gate is:

```sh
corepack pnpm verify
```

The `verify` script itself invokes Corepack for each stage, avoiding accidental fallback to an unrelated pnpm. It writes generated build output and ignored tool/test caches. CI uses the same gate after frozen-lockfile installation on Linux and Windows; hosted execution is not verified by local tests. No workflow deploys or publishes anything.

Prettier covers source/config/tests and the new Phase 1A documents. Historical Phase 0 prose is excluded to preserve its existing tables/layout; review touched historical prose with Git diff, whitespace and local-link checks. LF remains authoritative under `.gitattributes`.

## Codex governance tooling

The [operating model](CODEX_OPERATING_MODEL.md) separates authorized engineering
workflow from product scope. [Task templates](CODEX_TASK_TEMPLATES.md) and three
instruction-only skills under `.agents/skills/` support recurring review. They
change no Codex configuration, hooks, credentials, sandbox or application runtime.
Required skill frontmatter is a YAML mapping with `name` and `description`; the
repository path and discovery format follow OpenAI's
[skills documentation](https://learn.chatgpt.com/docs/build-skills), accessed
2026-10-06. Optional UI metadata is unnecessary for these instruction-only skills.

The [behavior suites](../evals/codex-behavior/README.md) have sixteen synthetic
engineering scenarios and sixteen synthetic merge-governance scenarios, with
an offline Node fixture validator/structured decision grader and merge guard:

```sh
corepack pnpm evals:validate
node scripts/codex-behavior-evals.mjs grade evals/codex-behavior/self-authored-example.json
corepack pnpm exec vitest run tests/unit/codex-behavior-evals.test.ts tests/unit/codex-behavior-merge.test.ts
```

The aggregate `verify` includes both suites' fixture validation and regressions.
The merge guard consumes supplied structured snapshots; it performs no network
request, GitHub merge or protection enforcement, and cannot authenticate head,
base, checks, reviews or authority. It does not execute a model or prove live
agent behavior. Passing the self-authored
example establishes rubric/format consistency only. Records must distinguish
hypothetical completion from captured actions; references are not authenticated
or opened by the grader. An independent forward exercise uses prompts/facts with
`expectedDecision` removed, retains original responses and declares its method.

V2 permits Class B protected-main squash merge only after every gate in the
[operating model](CODEX_OPERATING_MODEL.md) passes, including exact-head
local/independent evidence, both required PR-specific hosted checks, current
protected main, trusted PR origin, clean candidate and fresh decisive PR state.
Immediately re-read state before merge, stop/reconcile on changed facts and
inspect GitHub before any retry after an ambiguous result. Verify actual merged
state, squash SHA and unchanged protection before continuing an already
authorized dependent Goal. Class C and future authority-expanding governance
remain human-only. This governance PR itself requires manual owner squash merge;
the new permission takes effect only when it is present on protected main.
[V2 completion evidence](CODEX_AUTOMERGE_GOVERNANCE_REPORT.md) records observed
gates and the transition separately from synthetic guard outcomes.

Installed `codex-cli 0.160.0` help was inspected on 2026-10-06: `exec --json` and
`--output-schema` capture model runs, but no top-level cost-free `eval` mechanism
was established. No live run is invoked by repository gates; future runs need
their own explicit execution/cost scope. Official
[evaluation guidance](https://developers.openai.com/blog/eval-skills), accessed
2026-10-06, distinguishes captured runs from deterministic scoring.

## Boundaries and test limits

The separately authorized [Phase 1E proof environment](PHASE_1E_PROOF_ENVIRONMENT.md)
adds exact-pinned development-only `playwright-core` and an explicit
`corepack pnpm browser:proof` command after the ordinary full gate. It reuses a
supported existing Chrome channel in fresh synthetic contexts, or explicitly
acquired local Chromium. No automatic download, production worker/manifest/install
UI or runtime dependency was introduced by that tooling stage. The current command
also proves the separately merged production Phase 1E shell/update lifecycle.
Installed-PWA/device, cold-restart and offline-speech proof remain separate.

`src/composition/main.tsx` mounts React and wires the Phase 1D presentation/speech boundary. `src/ui/prototype/` retains fixed Phase 1V fixtures/reducer and accepted Space/Shapes/help/root presentation; compatibility copy/options delegate typed locale/preference behavior. `src/presentation/localisation/` owns locale manifests, independent preferences, message schema/draft packs and bounded formatting; presentation speech plans remain fixed/nonpersonal. Browser SpeechSynthesis/timers belong only to infrastructure; the UI receives a port instead of calling browser speech globals. The normal scripted path never invokes domain/application truth. Phase 2 deliberately adds `src/ui/family-proof/` → `src/application/family-proof.ts` → `src/domain/families/` for generated content and pure validation, with no repository command or persistence/evidence behavior. Existing replay primitives and Phase 1C integrity/contracts remain protected. See [application ports](APPLICATION_PORTS.md), [repository structure](REPOSITORY_STRUCTURE.md) and [architecture](ARCHITECTURE.md).

Enable the developer proof with exactly one `familyProof=1` query. Optional `family=number.addition`, `family=geometry.quadrilateral` or `family=measurement.unit-length` chooses the statically ordered catalog; optional `seed=` supplies the project 32-hex replay seed. Missing seed uses `0123456789abcdeffedcba9876543210`; invalid/repeated explicit seeds produce unavailable content, not hidden randomness or silent replacement. Existing `lang=el/en/de` and independent canonical `ui`/`instruction`/`speech` inputs keep their roles. For deliberate reflow review, the proof-only `textScale=200` query doubles root text; it is not a learner setting. Native family/seed/replay/answer/hint/retry controls remain unsaved and do not create a session engine.

All strict TypeScript checks are enabled, including indexed access, exact optional properties, unknown catch values, explicit return paths, fallthrough and unused-code checks. Library typechecking remains enabled. Relative imports suffice; two small presentation export facades expose localisation and speech contracts, with no path aliases.

`tsconfig.json` checks production `src/` with ES2023, DOM/DOM.Iterable and `vite/client`, without ambient Node types. `tsconfig.tools.json` supplies Node types for tests and Vite configuration; imported UI is still checked independently by the browser project. `tsconfig.domain.json` retains ES-only compilation with no ambient package types or JSX. `tsconfig.application.json` adds ES-only application compilation with no ambient types or JSX. The canonical `typecheck` checks all four, and typed lint explicitly selects these projects. Removing Node ambient types rejects globals such as `process`, `Buffer` and `__dirname`; imported declarations are a separate concern, so browser lint also rejects `node:*` and bare Node built-ins across imports, re-exports, dynamic imports and import types. Nonliteral dynamic specifiers are rejected so this check cannot be silently skipped. Node tooling remains outside `src/`.

Domain lint prevents imports from leaving that folder or importing packages, and rejects browser/Node globals, clock/random reads and JSX. Test-only compiler/lint fixtures cover positive DOM/pure code, forbidden Node globals/modules and deliberate domain escapes. These controls are engineering guardrails, not a security sandbox for malicious code. The browser split and new negative probes are the second OWNER/QC correction after the initial completion pass.

Phase 1C adds application-only/domain relative import rules, ES-only compilation, platform/clock/random/timer bans, positive/negative probes and bounded dependency-cycle review. Runtime data/codec validation and test-only synthetic repository conformance are described in [application ports](APPLICATION_PORTS.md). The independent sequence test has a 15-second per-test budget, fixed seed and 1,000 sequences; this preserves the case count under aggregate worker/compiler load.

Prototype tests use local state/fixture checks and `react-dom/server` semantic markup without a DOM simulation package. Preserved regressions cover Space, same-shape matching, hint/navigation and concrete Explore, including the single top root guide labelled 4. Phase 1D extends checks with draft schema completeness, structured plural/select/format bounds, exact query/default/planned behavior, independent mixed-language roles and deterministic speech/capability fakes. The [Phase 1D report](PHASE_1D_COMPLETION_REPORT.md) records actual new counts/mutations/full/fresh gates and browser evidence; bounded checkpoint-6 engineering PASS was locally preserved at `56ad5182ee3364174c1d335f1d7f90ef8f1cbd8d`. Historical three-theme/owner evidence is frozen in the Phase 1V report. Neither source/SSR checks nor reported local voices certify screen readers, pronunciation or offline speech. ES2023 remains a technical output target, not a promised browser floor.

The original Phase 1A property tests remain labelled **HARNESS VALIDATION ONLY**. Phase 1B adds separate domain properties and independent oracle/exhaustive/golden tests covered by the same aggregate command. The original harness tests JSON/string preservation with seed `20261005` and 1,000 cases, plus a test-only lossy mutation and counterexample replay. They do not test future mathematical truth. fast-check reports seed and shrink path on failure; replay by setting the reported `seed` and `path` in its parameters. Future domain changes require independent mathematical ground truth.

No arbitrary coverage threshold or browser/E2E dependency is imposed on this candidate. Future domain, storage, accessibility and offline work will add checks at their approved checkpoints. Passing automated gates supplies no evidence about learner outcomes, official translations, pronunciation or offline operation. Phase 1V visual acceptance is separately owner-confirmed; it cannot substitute for Phase 1D engineering/device proof.

## Dependencies and maintenance

Runtime dependencies are React and ReactDOM only. Vite with its React plugin builds the shell; TypeScript and declarations check it; Vitest/fast-check test it; ESLint/TypeScript ESLint/React plugins and Prettier verify it. Every direct dependency has an exact version. TypeScript 6.0.3 is selected because TypeScript ESLint 8.71.0 declares support below 6.1; TypeScript 7 is not silently forced past that compatibility range.

Review dependency changes, their install scripts, provenance, licenses and `corepack pnpm audit`. Audits access the registry and reflect its known advisories at that time. Frozen installation and a clean audit do not establish complete supply-chain safety. `public/THIRD_PARTY_NOTICES.txt` preserves the exact MIT notice for React, React DOM and scheduler, and Vite copies it into each static build. Review and update it when the runtime graph changes.

Keep build output, caches, logs, credentials and all real learner material out of commits. `.gitignore` protects common paths; inspect the entire proposed diff as well. The [completion report](PHASE_1A_COMPLETION_REPORT.md) records tested versions, results, review findings and remaining gates.

Primary documentation accessed **2026-10-05**: [Node LTS releases](https://nodejs.org/en/about/previous-releases), [Node 24.21.0](https://nodejs.org/en/blog/release/v24.21.0), [Corepack 0.36.0](https://github.com/nodejs/corepack/blob/v0.36.0/README.md), [pnpm installation](https://pnpm.io/installation), [pnpm project settings](https://pnpm.io/settings), [pnpm pmOnFail](https://pnpm.io/settings/cli#pmonfail), [pnpm lockfile documents](https://pnpm.io/lockfile#when-a-lockfile-has-two-documents), [TypeScript ambient types](https://www.typescriptlang.org/tsconfig/types.html), [Vite guide](https://vite.dev/guide/), [Vitest guide](https://vitest.dev/guide/), [TypeScript ESLint compatibility](https://typescript-eslint.io/users/dependency-versions/).
