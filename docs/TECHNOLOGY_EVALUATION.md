# Technology evaluation

Status: requirements-first recommendations, **nothing installed**. Public primary documentation and release pages inspected 2026-10-04; [research ledger](RESEARCH_EVIDENCE.md) records identities and limits. A visible release is evidence of activity, not a security/maintenance guarantee or a tested compatible stack.

## Recommended minimal stack

| Tool / role | Requirement and recommendation | Simpler alternative | Maintenance evidence / portability / lock-in / privacy |
| --- | --- | --- | --- |
| React | Accepted accessible interactive UI framework | Vanilla DOM, Preact, Svelte | Official docs and 19.3.0 release observed; UI-only dependency, browser bundle, no implied network |
| TypeScript | Accepted typed domain/contracts; strict checking | JS + runtime checks | Official docs and 7.0.2 release observed; version/tool compatibility must be checked, types do not validate imported data |
| Vite | Proposed static dev/build tool | Manual bundler or another lightweight build tool | Current guide and 8.3.2 release observed; base/build target explicit; dev Node is not end-user Node |
| pnpm | Proposed reproducible developer installs/pin | npm lockfile | 12.9.1 release and install/security docs observed; no guaranteed bundled Corepack assumption, scripts need review |
| Vitest | Proposed unit/integration harness near Vite | Node test runner | 5.0.3 release/docs observed; pure Node domain tests plus real-browser adapter tests; test environment never proves browser storage |
| fast-check | Proposed generator/property fuzzing and replay | Exhaustive bounded cases/manual fuzz loops | 4.10.2 release/docs observed; dev-only, failure seeds useful, independent oracle still needed |
| Playwright | Proposed browser/E2E/update tests | Manual browser checklist | 1.63.0 release/docs observed; downloaded dev browsers later, not actual iPad certification |
| axe-core | Proposed automated accessibility subset | Manual accessibility review | 4.13.0 release/readme observed; incomplete cases require humans; no conformance promise |
| idb | Provisionally small typed IndexedDB adapter | Raw IndexedDB | README/type/transaction APIs inspected; releases page does not provide a useful current release history, maintenance depth unverified; thin replaceable port |
| Intl MessageFormat | Proposed ICU-style complete messages | Native Intl + hand-maintained plural logic | FormatJS docs/multi-package releases visible; exact package/version not selected, use plain-text messages; no automatic number spellout |
| vite-plugin-pwa + Workbox | Proposed explicit injectManifest lifecycle/asset integration | Reviewed raw worker or generateSW | 1.3.0 release/docs observed; transitive scope/build compatibility needs proof, no zero-config correctness claim |
| Tauri | Preferred future packaging candidate only | PWA alone, Electron, native app | Current platform/release docs inspected, no immediate pin; distinct WebViews/native privileges/signing and voice tests required |
| ESLint/typescript-eslint + Prettier | Proposed readable code/import boundary checks | Compiler + manual formatting | Exact current compatible versions not verified in Phase 0; recheck at checkpoint 1, dev-only |

Build/runtime dependencies should be separate. Justify each direct package in a small inventory with version, license, purpose, scripts, transitive risks and replacement path. Self-host bundled dependencies; no CDN execution or remote fonts. Native browser Intl, speech and storage are preferred standards, but capability checks remain necessary. Do not add animation, global state, content CMS, analytics or “AI SDK” dependencies speculatively.

**Verified current constraints:** [Node release table](https://nodejs.org/en/about/previous-releases) labels Node 24 and 22 LTS and Node 26 Current on the access date. Proposed developer baseline is latest supported patched Node 24 LTS, rechecked at Phase 1. [Vite guide](https://vite.dev/guide/) lists Node 20.19+/22.12+ minimums; [Vitest guide](https://vitest.dev/guide/) lists Node >=22.12 and Vite >=6.4. Older minimums are not recommendations to use EOL Node. [pnpm documentation](https://pnpm.io/installation) currently describes native pnpm 12 and an npm installer requiring Node >=22.13; avoid copying a historical pnpm/Corepack recipe blindly. These observations do **not** verify cross-tool compatibility.

Pin one exact Node patch, pnpm version/packageManager and dependency lock after testing the chosen combination. Do not use floating latest commands as a reproducibility specification. Review install scripts and registry provenance; frozen-lockfile prevents drift, not a compromised dependency. Never disable Defender or elevate because vendor setup advice suggests it. No tooling changes happen now.

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

Accept standards/domain constraints now; keep exact dependency versions, RNG implementation specification, browser minimums and worker integration provisional until Phase 1 proofs. Maintainer longevity, package license compatibility, advisories, actual bundle size, install reproducibility and actual-device performance are still unverified. A source document is not a benchmark. [Phase 1 plan](PHASE_1_IMPLEMENTATION_PLAN.md) gives decision/rollback points.
