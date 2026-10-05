# Technology evaluation

Status: Phase 0 recommendations are reconciled with selected Phase 1A development pins. Public primary documentation and release pages inspected 2026-10-04 remain historical research; [research ledger](RESEARCH_EVIDENCE.md) records identities and limits. A visible release is evidence of activity, not a security/maintenance guarantee or a tested compatible stack.

Phase 1A uses the independently verified installed DEV baseline: Node 24.21.0, npm 11.19.0, Corepack 0.36.0 and Git 2.56.0.windows.1. The selected project package manager is pnpm 12.9.1 through Corepack. `package.json`, `.node-version` and `pnpm-lock.yaml` record the exact project pins; [development](DEVELOPMENT.md) records safe commands and the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md) records verification, package review and limitations. The installed Node/npm/Corepack baseline is preserved; no global pnpm installation is required.

The scaffold selects React/ReactDOM 19.3.0, TypeScript 6.0.3, Vite 8.3.2, Vitest 5.0.3, fast-check 4.10.2, ESLint 10.12.0 and Prettier 3.9.9, with exact supporting dependency pins in `package.json`. These selections do not accept the proposed storage, localisation, PWA, E2E, accessibility or desktop dependencies below. Current gate outcomes must be read from the completion report; Phase 0 release observations are not the dependency manifest.

OWNER/QC review after the initial Phase 1A pass required two corrections, with no dependency-version changes: Corepack remains the authoritative selector while `pmOnFail: ignore` disables redundant pnpm automatic package-manager checking/switching, producing one application-lockfile YAML document for external consumers/security tooling; production browser TypeScript now excludes Node ambient types, while tests/build configuration have a separate Node-enabled project and pure-domain compilation remains stricter. Browser lint and negative fixtures enforce Node-module exclusion. These choices preserve ADR-0001/0002, not a new runtime architecture. Local lockfile compatibility is not proof of hosted GitHub dependency graph/Dependabot behavior.

Correction sources accessed **2026-10-05**: [pnpm pmOnFail](https://pnpm.io/settings/cli#pmonfail), [lockfile document behavior](https://pnpm.io/lockfile#when-a-lockfile-has-two-documents), [upstream Dependabot compatibility report](https://github.com/dependabot/dependabot-core/issues/15904), [TypeScript ambient types](https://www.typescriptlang.org/tsconfig/types.html). Upstream reports explain the compatibility concern; the completion report records the measured local result.

## Recommended minimal stack

| Tool / role | Requirement and recommendation | Simpler alternative | Maintenance evidence / portability / lock-in / privacy |
| --- | --- | --- | --- |
| React | Accepted accessible interactive UI framework | Vanilla DOM, Preact, Svelte | Official docs and 19.3.0 release observed; UI-only dependency, browser bundle, no implied network |
| TypeScript | Accepted typed domain/contracts; strict checking | JS + runtime checks | Phase 0 observed 7.0.2; Phase 1A selects 6.0.3 with supporting package pins; types do not validate imported data |
| Vite | Selected Phase 1A static dev/build tool | Manual bundler or another lightweight build tool | Phase 0 observed guide/release 8.3.2; current pin/build evidence scoped in the Phase 1A report; dev Node is not end-user Node |
| pnpm | Selected reproducible developer installs/pin | npm lockfile | Phase 1A pins 12.9.1 through verified Corepack; scripts/policy reviewed separately; no global installer required |
| Vitest | Selected Phase 1A unit/harness runner | Node test runner | 5.0.3 pinned; pure Node harness now, real-browser adapter tests later; test environment never proves browser storage |
| fast-check | Selected Phase 1A property harness and replay | Exhaustive bounded cases/manual fuzz loops | 4.10.2 pinned; dev-only, failure seeds useful, independent mathematical oracle still needed later |
| Playwright | Proposed browser/E2E/update tests | Manual browser checklist | 1.63.0 release/docs observed; downloaded dev browsers later, not actual iPad certification |
| axe-core | Proposed automated accessibility subset | Manual accessibility review | 4.13.0 release/readme observed; incomplete cases require humans; no conformance promise |
| idb | Provisionally small typed IndexedDB adapter | Raw IndexedDB | README/type/transaction APIs inspected; releases page does not provide a useful current release history, maintenance depth unverified; thin replaceable port |
| Intl MessageFormat | Proposed ICU-style complete messages | Native Intl + hand-maintained plural logic | FormatJS docs/multi-package releases visible; exact package/version not selected, use plain-text messages; no automatic number spellout |
| vite-plugin-pwa + Workbox | Proposed explicit injectManifest lifecycle/asset integration | Reviewed raw worker or generateSW | 1.3.0 release/docs observed; transitive scope/build compatibility needs proof, no zero-config correctness claim |
| Tauri | Preferred future packaging candidate only | PWA alone, Electron, native app | Current platform/release docs inspected, no immediate pin; distinct WebViews/native privileges/signing and voice tests required |
| ESLint/typescript-eslint + Prettier | Selected Phase 1A code/import checks and formatting | Compiler + manual formatting | Exact pins selected at checkpoint 1; current gate evidence in the Phase 1A report, dev-only |

Build/runtime dependencies should be separate. Justify each direct package in a small inventory with version, license, purpose, scripts, transitive risks and replacement path. Self-host bundled dependencies; no CDN execution or remote fonts. Native browser Intl, speech and storage are preferred standards, but capability checks remain necessary. Do not add animation, global state, content CMS, analytics or “AI SDK” dependencies speculatively.

**Phase 0 source observations (accessed 2026-10-04):** [Node release table](https://nodejs.org/en/about/previous-releases) labels Node 24 and 22 LTS and Node 26 Current on that access date. Phase 0 recommended patched Node 24 LTS; Phase 1A preserves the independently verified installed Node 24.21.0 baseline. [Vite guide](https://vite.dev/guide/) listed Node 20.19+/22.12+ minimums; [Vitest guide](https://vitest.dev/guide/) listed Node >=22.12 and Vite >=6.4. Older minimums are not recommendations to use EOL Node. [pnpm documentation](https://pnpm.io/installation) described native pnpm 12 and an npm installer requiring Node >=22.13; avoid copying a historical pnpm/Corepack recipe blindly. These historical observations do **not** verify the selected cross-tool compatibility.

Phase 1A pins one exact Node patch, pnpm version/packageManager and dependency lock. Do not use floating latest commands as a reproducibility specification. Review install scripts and registry provenance; frozen-lockfile prevents drift, not a compromised dependency. Never disable Defender or elevate because vendor setup advice suggests it. Only authorized repository-local dependencies are installed; system/global tooling changes remain prohibited.

## React/Vite versus alternatives

React's [official scratch-build guide](https://react.dev/learn/build-a-react-app-from-scratch) documents framework tradeoffs and Vite as an option. React is authoritative here; Vite is justified because gameplay is local, static and modestly routed. Framework facilities for server data/SSR/RSC do not solve a current requirement. Revisit if public content SEO/server rendering becomes materially necessary, keeping the offline domain independent.

| Alternative | Benefits | Current cost/decision |
| --- | --- | --- |
| Next.js/server-rendered framework | Routing/SSR/data integration; static export can exist | No current SSR/server-data need; adds conventions and risk of backend assumptions. Defer, do not claim it always requires a server |
| Backend framework / FastAPI | Shared accounts/sync/remote services | No requirement, harms offline/privacy simplicity. Reject V1; Python optional future research tools only |
| Vanilla/Preact/Svelte | Less runtime/different ergonomics | Viable alternatives, no material requirement overturns accepted React constraint |
| Electron | Bundled browser can reduce engine variance | Larger distribution and Node/native attack surface; defer unless platform capability requires it |
| Tauri now | Native adapters/packaging | Adds Rust/build/signing/platform burden before web need validated. Future candidate |
| Monorepo/packages | Explicit publishing/reuse | Single consumer today; internal import checks sufficient. Defer until real second consumer |
| Large state framework | Coordination/debug tooling | Session controller/local reducers plus persistence port adequate; add only for measured complexity |

## Storage, exact math and i18n alternatives

Raw IndexedDB has no wrapper risk but substantial transaction/error boilerplate. idb exposes existing IDB concepts with promises and types; prefer it provisionally behind a port. Dexie adds richer query/schema conveniences; not justified by small bounded records. localStorage lacks multi-store transactions and is poor evidence storage. SQLite requires WASM/OPFS browser complexity or a native adapter; future desktop only unless a measured requirement arises. No database server.

Native safe integers suffice for bounded V1; introduce exact rational/decimal types before those concepts, with reviewed BigInt serialization. A large algebra library is premature. Native Intl alone handles number/plural formatting but not complete translated grammar or spellout; small message formatting is preferable to custom concatenation. A full translation platform can be evaluated later; checked-in reviewed packs are enough initially.

## Geometry and mathematical notation evaluation

Prefer **browser-native SVG plus semantic HTML** for bounded interactive geometry: scalable viewBox coordinates, inspectable nodes and deterministic scene data suit responsive testing, keyboard/touch controls and locale-provided labels. [SVG coordinates](https://www.w3.org/TR/SVG2/coords.html), [accessibility](https://www.w3.org/TR/SVG2/access.html) and [interaction](https://www.w3.org/TR/SVG2/interact.html) document these facilities. This is a rendering recommendation, not an accessibility guarantee. Keep exact logical geometry separate from viewport/pixels and preserve aspect ratio where mathematical relations require it.

[Canvas](https://html.spec.whatwg.org/multipage/canvas.html) can suit dense scenes but is a bitmap with separately authored functional fallback/hit/focus mapping. No measured need warrants Canvas-only architecture. SVG adds no runtime package; dynamic scene accessibility still needs actual-device/specialist tests. The current [SVG-AAM draft](https://www.w3.org/TR/svg-aam-1.0/) warns it contains outdated/error-prone material; it is not a conformance basis.

| Notation candidate | Fit / simpler alternative | Maintenance/portability/privacy risks | Recommendation |
| --- | --- | --- | --- |
| Native MathML Core | Structured fractions, superscripts and roots from typed expression AST; simple HTML/text remains sufficient for early tasks | [W3C snapshot](https://www.w3.org/TR/mathml-core/) is a Candidate Recommendation; browser/AT/fonts/WebViews vary, no dependency/network inherently required | Preferred first proof for richer notation, no install now |
| KaTeX | Compact optional visual typesetting with HTML+MathML output; simpler native MathML avoids TeX/parser dependency | Current [options](https://katex.org/docs/options) and [security docs](https://katex.org/docs/security) inspected, exact version/activity pin not verified; limit macros/size, trust false, escape errors, self-host CSS/fonts | Defer until native notation fails a measured requirement; no truth/speech authority |
| MathJax4 | Richer expression rendering/exploration/accessibility components; more capability than early shell needs | [Output](https://docs.mathjax.org/en/latest/output/index.html), [accessibility](https://docs.mathjax.org/en/latest/basic/accessibility.html), [self-hosting](https://docs.mathjax.org/en/latest/web/hosting.html) inspected; asynchronous components/font/rule loading, larger integration and exact version/locale review needed | Deferred candidate, not an assumed dependency |

MathJax/Speech Rule Engine locale examples do not establish all seven regional languages or reviewed child phrasing ([options](https://docs.mathjax.org/en/latest/options/accessibility.html), [SRE docs](https://github.com/Speech-Rule-Engine/speech-rule-engine/blob/master/README.md)). Never silently use English fallback for Greek/Portuguese. Typesetting accessibility output must coordinate with screen readers and SpeechService; it cannot replace semantic utterance plans or mathematical validation.

Generate allowlisted markup only from app-authored typed scenes/expressions. No arbitrary learner/community TeX, SVG, HTML, external href/foreignObject or style injection. Native or library rendering remains offline-capable only when all chosen assets/components/fonts/rules are cached. Confirm zoom/dynamic radical/exponent rendering and assistive technology on actual targets; no pixel-identical cross-browser guarantee. No SVG components, MathML implementation or typesetter installation occurs in Phase0.

## Recommendation boundary

Accept standards/domain constraints and the selected Phase 1A development pins; keep RNG implementation specification, browser minimums, adapter versions and worker integration provisional until their later proofs. Current dependency/license/advisory/install/build evidence is scoped in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md); maintainer longevity, future adapter compatibility and actual-device performance remain unverified. A source document is not a benchmark. [Phase 1 plan](PHASE_1_IMPLEMENTATION_PLAN.md) gives decision/rollback points.
