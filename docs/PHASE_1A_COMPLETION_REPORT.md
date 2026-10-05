# Phase 1A completion report

Date: **2026-10-05, Europe/Athens**.

## Status

**PASS — OWNER/QC remediation complete, with unrelated decisions still open.** Both required post-initial-pass corrections and all required local Phase 1A gates passed, including another fresh frozen-lockfile installation. The approved architecture is preserved. Remaining decisions concern later implementation, public governance and release evidence; none is silently closed by this scaffold.

Phase 1A implements checkpoints 1–3 and the initial CI foundation only. Phase 1B, mathematical contracts/generators, learner behavior and offline work were not started.

## Baseline and authority

Starting and final HEAD: `131559a1a3670bcd4c6382aafdd7cc49702b7b6f`, exactly the approved Phase 0 baseline. Local `main` and `origin/main` pointed to that commit. The active checkout is the existing Codex-managed `185d/Math_Adventure` worktree, detached HEAD; initial Git status was clean. The normal `main` checkout and the other worktree were not modified. No new branch or commit was created.

The attachment's Phase 1A specification was read together with AGENTS, the required architecture/security/testing/planning documents, decision register, open questions, traceability and all eight ADRs. Accepted ADRs remain unchanged; proposed ADR-0006/0007 remain proposed. D26/Q01 now record bounded owner approval, while D10/Q11 distinguish development pins from later adapter/RNG/worker decisions.

The subsequent authoritative OWNER/QC request identified two pre-commit corrections after the initial completion pass: a single-document pnpm application lockfile and removal of Node ambient types from browser production compilation. This report now records the corrected current evidence; initial-pass observations are labelled where retained. Phase 0 history is unchanged.

## Verified toolchain

| Tool                                  | Exact version             | Evidence / purpose                                                                       |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Node.js                               | 24.21.0                   | Installed DEV executable independently verified; supported LTS line; `.node-version` pin |
| npm                                   | 11.19.0                   | Independently verified installed baseline; not used to install global tools              |
| Corepack                              | 0.36.0                    | Independently verified installed baseline; direct project-managed pnpm invocation        |
| Git                                   | 2.56.0.windows.1          | Independently verified                                                                   |
| pnpm                                  | 12.9.1                    | Downloaded through Corepack into ignored local cache; `packageManager` and engines pins  |
| React / React DOM                     | 19.3.0 / 19.3.0           | Exact runtime pins                                                                       |
| TypeScript                            | 6.0.3                     | Strict compiler; compatible with TypeScript ESLint's declared `<6.1` range               |
| Vite / React plugin                   | 8.3.2 / 6.1.1             | Static build/development and React transforms                                            |
| Vitest / fast-check                   | 5.0.3 / 4.10.2            | Unit/property harness                                                                    |
| ESLint / @eslint/js                   | 10.12.0 / 10.0.1          | Flat lint configuration                                                                  |
| TypeScript ESLint                     | 8.71.0                    | Type-aware correctness rules                                                             |
| React Hooks / Refresh lint plugins    | 7.1.1 / 0.5.7             | React correctness and safe fast refresh exports                                          |
| Prettier                              | 3.9.9                     | Deterministic LF formatting                                                              |
| Node / React / React DOM declarations | 24.19.1 / 19.3.0 / 19.3.0 | Development-only type declarations                                                       |

The initial agent PATH selected bundled Node 24.19.0/pnpm 11.25.0 and did not expose npm/Corepack. After the authoritative steer, the installed baseline was independently verified using process-local tool selection. Node, npm and Corepack were neither installed nor changed. No persistent PATH/global configuration, administrator elevation or global pnpm installation was used.

The same installed baseline was independently reverified during OWNER/QC remediation: Node `v24.21.0` at `C:\Program Files\nodejs\node.exe`, npm `11.19.0`, Corepack `0.36.0`, Git `2.56.0.windows.1` and Corepack-selected pnpm `12.9.1`. `.node-version` remains `24.21.0`, `packageManager` remains `pnpm@12.9.1`, and engines remain Node `>=24.21.0 <25` / exact pnpm `12.9.1`.

Primary sources accessed **2026-10-05**: [Node release table](https://nodejs.org/en/about/previous-releases), [Node 24.21.0 release](https://nodejs.org/en/blog/release/v24.21.0), [Corepack 0.36.0 commands](https://github.com/nodejs/corepack/blob/v0.36.0/README.md), [pnpm compatibility](https://pnpm.io/installation), [pnpm project settings](https://pnpm.io/settings), [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/). Direct npm registry metadata supplied version, engines, peer ranges, declared licenses, project repositories and available provenance links; for example [TypeScript ESLint 8.71.0 metadata](https://registry.npmjs.org/typescript-eslint/8.71.0). Provenance availability was inspected, not cryptographically independently verified.

## Changes and dependency rationale

| Area              | Files / resulting behavior                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application       | `index.html`, `src/composition/main.tsx`, `src/ui/App.tsx`, `src/ui/styles.css`: static truthful shell, semantic main/h1, en-GB metadata, local system font, no fake activities |
| Domain guardrails | `src/domain/README.md`, `tsconfig.domain.json`, `scripts/domain-boundary.mjs`: pure future boundary, no production domain implementation                                        |
| Toolchain/build   | `package.json`, `.node-version`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, TypeScript configs, `vite.config.ts`                                                                  |
| Lint/format       | `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`: typed lint, zero warnings, deterministic formatting without mass Phase 0 reformatting                               |
| Tests             | Shell semantic unit test, positive/negative boundary/compiler tests, technical fixtures and labelled seeded property harness                                                    |
| CI                | `.github/workflows/ci.yml`: frozen installation and the canonical local gate on Windows/Linux                                                                                   |
| Notices           | `public/THIRD_PARTY_NOTICES.txt`: exact MIT notice for the three bundled runtime packages, copied into build output                                                             |
| Handoff           | [Development guide](DEVELOPMENT.md), this report and minimal updates to 12 existing current-state documents                                                                     |

Direct browser dependencies are **React** (UI rendering) and **React DOM** (browser mounting). Their sole runtime transitive dependency is **scheduler 0.28.0**. All three declare MIT and have identical installed LICENSE contents; the complete copyright/permission text is retained in static output. The project's Apache-2.0 license does not replace these terms.

Development dependencies are limited to build/React transformation, compiler/declarations, Vitest, fast-check, ESLint with TypeScript/React checks, and Prettier. No DOM simulation, testing-library, browser binary, routing/state/styling library, PWA plugin, persistence wrapper or translation package was added. TypeScript 7 was not selected because of the verified lint-tool compatibility limit. The domain lint rule uses the existing ESLint dependency rather than an architecture framework.

`pnpm-workspace.yaml` has no `packages` field: one root package and one lockfile, not a monorepo. It configures local store/cache paths, exact saves, strict engines and strict dependency-build approval with an empty allowlist. The installed 178-package graph required no preinstall/install/postinstall lifecycle scripts. Maintainer prepare/build scripts observed in metadata were not executed as dependency install scripts.

Corepack is the authoritative pnpm selector. The OWNER/QC correction adds `pmOnFail: ignore` to disable pnpm's redundant automatic package-manager checking/switching. This removes its environment/package-manager YAML document for compatibility with external lockfile consumers/security tooling, while the declared exact pnpm engine policy, strict Node engine policy, Corepack invocation and build restrictions remain intact. pnpm's own package-manager pin check is intentionally skipped; Corepack supplies the exact selection. It does not guarantee hosted GitHub dependency graph or Dependabot behavior; those require validation after a separately authorized push.

## OWNER/QC corrections and exact remediation files

**Lockfile PASS:** YAML documents **2 → 1**. The initial pinned offline `--lockfile-only` invocation retained the existing environment document, and the programmatic assertion caught that. The complete old lockfile was preserved in ignored cache, removed from its active pathname through a checked worktree-local move, and regenerated cleanly by **Corepack/pnpm 12.9.1** using offline lockfile-only resolution. No dependency graph entry was hand-edited. The entire application graph, including settings, importers, package entries, snapshots and integrity records, is deep-equal to the original application document: **0 dependency-version changes**, **2 runtime + 14 development exact pins**, **203 package entries + 203 snapshots**. Only the redundant manager environment graph's 15 entries disappeared. React/React DOM remain `19.3.0`; all development selections in the toolchain table/manifest remain unchanged.

**Browser boundary PASS:** `tsconfig.json` checks production `src/` using ES2023 + DOM + DOM.Iterable, React JSX and only `vite/client` ambient types. `tsconfig.tools.json` separately supplies Node types to tests/Vite configuration. Imported UI is also checked independently by the browser project. `tsconfig.domain.json` is unchanged: ES-only, no ambient packages/Node/DOM/JSX, with existing domain import/determinism guards preserved. `typecheck` now runs all three projects, and type-aware lint explicitly selects them. Browser lint blocks Node globals and `node:*`/bare built-ins in imports, re-exports, dynamic imports and import types; nonliteral specifiers are rejected so computed/template imports cannot skip the check.

**New negative evidence PASS:** 12 browser cases add a positive DOM compilation, a compiler-negative fixture rejecting `process`, `Buffer` and `__dirname`, a React/DOM lint positive, and nine Node-import negatives: fixture `node:fs`, bare `fs`, `fs/promises`, `node:child_process`, re-export, literal dynamic import, computed dynamic import, template dynamic import and import type. Fixtures stay under `tests/fixtures/architecture/browser/` and are excluded from ordinary compilation/lint. Existing 16 domain boundary/compiler cases and the shell test remain intact. Independent read-only review found the initial computed-import gap, verified its correction and separately confirmed compiler rejection of `globalThis.process` and literal `node:fs`.

Exactly **20 files** changed in this remediation relative to the initial Phase 1A completion state (6 newly added, 14 existing Phase 1A files edited):

| Area                   | Exact files                                                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockfile/manager       | `pnpm-workspace.yaml`, `pnpm-lock.yaml`                                                                                                                                                                                                                                       |
| Compiler/lint command  | `package.json`, `tsconfig.json`, **new** `tsconfig.tools.json`, `eslint.config.mjs`, **new** `scripts/browser-boundary.mjs`                                                                                                                                                   |
| Browser probes         | **new** `tests/unit/browser-boundary.test.ts`, **new** `tests/fixtures/architecture/browser/valid.ts`, **new** `tests/fixtures/architecture/browser/node-globals.ts`, **new** `tests/fixtures/architecture/browser/node-module.ts`                                            |
| Material documentation | `docs/DEVELOPMENT.md`, `docs/TECHNOLOGY_EVALUATION.md`, `docs/TESTING_STRATEGY.md`, `docs/SECURITY_THREAT_MODEL.md`, `docs/PHASE_1A_COMPLETION_REPORT.md`, `docs/REPOSITORY_STRUCTURE.md`, `docs/ARCHITECTURE.md`, `docs/DECISION_REGISTER.md`, `docs/TRACEABILITY_MATRIX.md` |

Application source, existing domain config/rule/tests, direct dependency versions and `.github/workflows/ci.yml` were not changed by this remediation. Ignored proof files and dependency-tree backups are local verification artifacts, outside this proposed inventory.

Primary correction sources accessed **2026-10-05**: [pnpm pmOnFail](https://pnpm.io/settings/cli#pmonfail), [pnpm lockfile documents](https://pnpm.io/lockfile#when-a-lockfile-has-two-documents), [upstream Dependabot compatibility report](https://github.com/dependabot/dependabot-core/issues/15904), [upstream pnpm compatibility report](https://github.com/pnpm/pnpm/issues/13805), [TypeScript ambient types](https://www.typescriptlang.org/tsconfig/types.html). Upstream reports establish the concern; programmatic checks establish only this local lockfile result.

All direct packages declare MIT except TypeScript (Apache-2.0). The installed transitive graph also declares ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, BlueOak-1.0.0, CC-BY-4.0 and MPL-2.0. Examples are development-only minimatch, caniuse-lite and lightningcss. This inventory is not a professional license-compliance determination or an approval to distribute development tool binaries.

## Actual quality results

Canonical command: **`corepack pnpm verify`**, the pinned-manager equivalent of `pnpm verify`.

| Check                      | Result / evidence                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial dependency install | PASS, 178 packages; exact lockfile produced                                                                                                                                             |
| Format check               | PASS, source/config/tests/new Phase 1A prose; historical Phase 0 prose preserved                                                                                                        |
| Lint                       | PASS, zero errors/warnings, no suppression directives                                                                                                                                   |
| Typecheck                  | PASS, all three strict browser, pure-domain and test/tool compilations; library checking enabled                                                                                        |
| Unit tests                 | PASS, 29 tests: shell markup, 16 retained domain cases and 12 browser cases                                                                                                             |
| Property harness           | PASS, 2 tests; 1,000 string round-trip cases at seed `20261005`, plus lossy mutant detection/replay                                                                                     |
| Full test suite            | PASS, 4 files / 31 tests (29 unit + 2 property)                                                                                                                                         |
| Mutation sensitivity       | Initial-pass PASS: temporary h1→h2 mutation caused the real shell test to exit 1 (1 failed / 16 passed); original source restored, full verification passed afterward                   |
| Production build           | PASS, 16 transformed modules; HTML, CSS, JS and notice only                                                                                                                             |
| Aggregate verification     | PASS, exit 0 after OWNER/QC corrections and fresh installation                                                                                                                          |
| CI syntax / configuration  | PASS local/static: workflow, workspace settings and single lockfile YAML document parsed using Prettier's existing YAML parser; reviewed permissions, triggers, pins and command parity |
| Lockfile graph correction  | PASS, 2 → 1 YAML documents; full application graph/integrities unchanged; 0 dependency-version changes                                                                                  |
| Repository hygiene         | PASS bounded content/encoding/artifact/ignore/link/whitespace review; final counts recorded below                                                                                       |

The root build outputs approximately 0.53 kB HTML, 0.20 kB CSS and 219.87 kB JavaScript (68.70 kB gzip), plus the runtime license notice. These are scaffold measurements, not a performance target or benchmark for future gameplay.

Initial failures were investigated rather than waived: virtual ESLint probes needed their test-only `disableTypeChecked` override; an unbound TypeScript readFile callback needed an explicit wrapper; nullable fast-check replay paths needed narrowing; an inline import-type positive probe conflicted with the intended type-import style and was changed to an explicit type import. The import-type AST access and global clock/random bypass were corrected during independent review. No `any`, `@ts-ignore`, unchecked non-null assertion or disabled required gate was introduced.

A bare nested pnpm invocation originally selected the agent's unrelated fallback manager and failed engine checks. `verify` now routes every stage through Corepack. Preliminary link scans found the not-yet-authored completion report; final link verification ran after this report existed.

## Fresh installation and sandbox boundary

The initial completion pass preserved the existing dependency tree in `.cache/pre-fresh-node_modules` and completed its first fresh installation. After OWNER/QC correction, the then-current `node_modules` was moved to the separate `.cache/qc-pre-fresh-node_modules` after checking both resolved paths stayed inside this worktree and the destination did not exist. No shared/user caches or unrelated files were deleted. `corepack pnpm install --frozen-lockfile --state-dir .cache/pnpm-state` recreated another fresh dependency tree, reusing the content-addressed store, with **178 packages and exit 0**. The complete gate passed against this recreated tree, and the one-document/full-graph proof was rerun successfully afterward.

Corrected lockfile SHA-256 before and after the OWNER/QC fresh frozen installation (identical):

```text
B4CF9943692ED65897900827B19C23966C9661FA74FDD1C20F0300DC1512AAF0
```

The initial two-document lockfile had SHA-256 `0BDF58512DD32B1BC75E01066C62A88EF608383D9FC0D58BEF4A91232C1611F6`. Its change during pinned regeneration is expected; frozen installation of the corrected lockfile made no further change.

Corepack's default per-user cache was initially denied, so its cache was set inside ignored `.cache/`. pnpm 12's non-auth `.npmrc` settings are unsupported; project settings were moved to its documented YAML configuration. Native pnpm installation still required a per-user Windows lock, whose location is resolved directly by the OS. A TMP/TEMP/state override did not relocate it. Installation and fresh installation succeeded through scoped sandbox execution permission; this was not Windows administrator elevation or a global configuration change. Store, download cache, Corepack cache and other install state remained worktree-local.

The lock implementation was checked in the [pnpm 12.9.1 source](https://github.com/pnpm/pnpm/blob/v12.9.1/pnpm/crates/fs/src/secure_temp_lock.rs). It was not patched, bypassed or replaced with a hidden runtime.

## Browser/build and accessibility evidence

The actual development shell mounted in the Codex in-app browser. Production builds at `/` and explicit `/phase-1a/` were then independently served over loopback and mounted successfully with the restored h1. Browser warning/error logs were empty for both production loads. DOM inspection confirmed en-GB, the meaningful document title, one main landmark, the heading and zero interactive controls. Tab smoke introduced no shell focus trap. A screenshot inspection verified the minimal local CSS layout.

The static text/background palette (`#182b3a` on `#f4f7f9`) has a calculated sRGB relative-luminance contrast ratio of **13.50:1**. No motion or colour-only meaning is present in the shell.

The subpath page referenced only its same-origin hashed JS/CSS assets. Root build uses relative assets by default. Source, HTML and output were inspected for remote resources/private paths. There are no intentional third-party runtime requests, fonts, images or scripts. React diagnostic links/XML namespace strings in its bundled code are not fetched resources; Vite's modulepreload fallback can fetch same-origin assets. Installation and development HMR network activity are distinct from the production application.

The post-QC production build was reviewed again: all four output files (HTML, CSS, JS and notice) are byte-for-byte identical to the initial shell, so no additional application functionality, Node reference or external runtime resource was introduced. HTML still references only the two existing same-origin hashed assets, and the private-path/secret scan remains clean. An identifier scan surfaced pre-existing React/React DOM `process.emit` fallback branches and scheduler `setImmediate` detection; source review confirmed `typeof` guards and browser alternatives. These unchanged library compatibility probes do not require a Node runtime, and the result is not described as zero Node-related identifier text. No browser smoke rerun was needed for byte-identical output; initial root/subpath browser observations above remain initial-pass evidence.

No service worker, manifest, offline readiness proof, network interception suite or full browser/E2E dependency was added. ES2023 output is a technical target, not a certified browser/OS floor. Basic semantic/keyboard/layout evidence is not WCAG conformance, assistive-technology certification or actual target-device support.

## CI foundation

The workflow uses ordinary push/pull_request triggers, `contents: read`, no secrets, no persisted checkout credentials, no privileged pull_request_target, deployment, publishing, release or artifact upload. `ubuntu-24.04` and `windows-2025` both select `.node-version`, install the frozen lockfile and run the same Corepack aggregate gate. Timeout is 15 minutes; failures remain visible.

OWNER/QC static recheck passed with the corrected single-document lockfile and updated canonical all-project typecheck. Workflow commands remain `corepack pnpm install --frozen-lockfile` and `corepack pnpm verify`, so both declared runners consume the corrections without workflow edits. Node pin, repository-local Corepack cache, read-only permissions, pinned actions and credential restrictions remain intact. This is static compatibility evidence, not proof that either hosted runner or dependency-security consumer has executed successfully.

Official Actions were pinned to independently verified commits: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) at `3d3c42e5aac5ba805825da76410c181273ba90b1` and [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0) at `820762786026740c76f36085b0efc47a31fe5020`. Official Node 24.21.0 sources bundle npm 11.19.0/Corepack 0.36.0, matching the DEV baseline. No pnpm setup action or global activation is needed.

**Hosted CI was not run.** Linux execution was not locally performed. Static workflow validation and successful Windows commands cannot prove either outcome. Nothing was pushed or manually dispatched.

## Security/privacy and independent review

The post-QC `corepack pnpm audit --json` completed with **exit 0 and 0 known vulnerabilities at every severity** (203 total application dependencies in audit metadata, down from the initial 218 because the redundant 15-entry manager graph was removed). No high/critical finding remained. No application dependency version changed. The result reflects known registry advisories on the access date, not a guarantee of future or complete safety. Initial metadata/license/provenance and lifecycle-script review remains applicable to the unchanged application graph.

The complete proposed source/config/docs inventory and generated output were checked for common token/private-key patterns, identifying user paths, private artifact extensions, invalid UTF-8, NUL and trailing whitespace. Ignore probes covered dependencies, builds/caches, coverage, environments, secrets, learner paths, captures, logs and databases; the lockfile remained trackable. No real learner fixture, child identifier, export, recording, private database or secret was introduced. The bounded scan and human content review do not guarantee the absence of every possible secret.

Dedicated principal adversarial passes covered scope, architecture, TypeScript, tests, build/tooling, security/privacy, documentation and open-source maintainability. Two independent read-only specialists reviewed architecture/test boundaries and tooling/CI/security. A separate documentation pass reconciled current-state statements while preserving Phase 0 reports and ADR history.

| Material finding                                                                       | Correction / residual                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain import-type AST and virtual typed-lint configuration could break probes         | Correct parser source field and virtual-only typed-rule disabling; positive/negative probes passed                                                         |
| globalThis could expose hidden clocks/randomness                                       | Domain global restriction added; ordinary/globalThis negative cases passed                                                                                 |
| Separate mutant predicate supplied weak sensitivity evidence                           | Same round-trip invariant now receives a lossy test-only mutation; seed/path replay verified; actual shell mutation also failed the test runner            |
| Nested bare pnpm selected an unrelated fallback                                        | Corepack exact selection in every aggregate stage; declared exact pnpm and strict Node engine policies preserved                                           |
| Native pnpm state/locking interacts with restricted Windows sandbox                    | Documented configuration and scoped lock permission; no locking/security bypass or machine changes                                                         |
| Bundle stripped third-party license comments                                           | Exact runtime MIT notice added to public/static output                                                                                                     |
| Current docs still described Phase 0-only state                                        | Twelve small reconciliations plus this report/development guide; historical reports and accepted ADRs unchanged                                            |
| OWNER/QC: multi-document lockfile could confuse external dependency/security consumers | Corepack remains selector; pmOnFail ignore; pinned clean regeneration gives one document and identical application graph; hosted validation still required |
| OWNER/QC: Node ambient types were exposed to production browser source                 | Separate browser/tool projects; all-project typecheck; Node-global/module negative probes; computed-import review gap corrected                            |

Import enforcement is intentionally a lightweight architectural guardrail. It is not a malicious-code security sandbox, a full circular-import analyzer or evidence for future modules. The current source graph has no circular imports. Broader layer enforcement expands only when later modules exist.

## Open decisions and explicit architecture non-actions

No backend, Python/Conda runtime/environment, server database, actual mathematics engine, puzzle generator, production randomness, learner profiles/persistence, adaptive thresholds, translations/localisation system, speech/microphone/camera, rewards, Number Lab, service worker/offline caching, PWA plugin, desktop packaging, accounts, telemetry, AI or deployment was implemented. Domain geometry/measurement/powers/roots and independent progression remain first-class accepted future constraints.

Open gates remain: later implementation approval, RNG/value/port specifications, proposed adaptation/offline ADRs, retention/deletion and legal/privacy decisions, educational calibration, native locale review, specialist accessibility, actual-device/browser support, public maintainer/security/contact/moderation/contribution provenance, and host/release policy. See [decision register](DECISION_REGISTER.md) and [open questions](OPEN_QUESTIONS.md). No additional ADR was needed for these bounded tooling choices.

No push, PR, merge, rebase, reset, remote issue/comment, GitHub settings change, deployment, release/tag or package publication occurred. No remote resource was created. No automatic commit was made.

## Final Git state and handoff

HEAD remains the approved baseline in detached state. All Phase 1A changes are unstaged and uncommitted for human review. Twelve existing files have minimal current-state edits; new files are the application/tool/test/CI/notice/document inventory above. `.gitignore` and `.gitattributes` were sufficient and were preserved without changes.

Generated `node_modules`, store/caches, prior dependency tree and build outputs are ignored. No generated dependency, build, secret/private data artifact is proposed for commit. Temporary loopback verification servers and browser tabs are stopped/closed at handoff.

Final inventory after OWNER/QC: **12 modified existing files, 32 new files, no staged changes; 72 proposed text files, 272 resolving local Markdown links and 16 passing ignore probes.** The final whitespace/content checks found no errors; the corrected lockfile hash remains unchanged after frozen installation. The aggregate gate passes with **4 test files / 31 tests**, including **1,000 property cases plus mutant detection/replay**, and a successful unchanged production build. Initial completion inventory was 12 modified / 26 new files and 19 tests; the six additional files and 12 tests belong only to this remediation.

Modified existing files: `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, and the architecture, decision register, open questions, Phase 1 plan, repository structure, threat model, technology evaluation, testing strategy and traceability documents. New files are exactly the scaffold/config/test/CI/notice inventory above, including this report and the development guide. Historical reports, all ADRs, LICENSE, security policy, ignore and line-ending files have no diff.

**Stop at Phase 1A; no Phase 1B work is authorized by this report.**
