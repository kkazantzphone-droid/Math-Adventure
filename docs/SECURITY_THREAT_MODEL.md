# Security threat model

Status: Phase 1A implements a static technical shell and initial development controls only. Learner, storage, speech, offline/update and production-host controls below remain planned. Target scope is a static child-focused PWA with local data; future desktop/network features need an updated model.

The current shell has no learner input, persistence, speech, service worker or external asset requirement. Project dependencies are pinned with a lockfile and project-local installation policy; the initial CI workflow declares read-only permissions, pinned actions and frozen installation. These controls do not establish that dependencies are harmless, the future game is private, the host is secured or remote CI has passed. Current evidence and residual risks are recorded in the [Phase 1A report](PHASE_1A_COMPLETION_REPORT.md).

OWNER/QC review after the initial Phase 1A pass corrected two engineering boundaries: `pmOnFail: ignore` disables redundant pnpm self-switching while Corepack retains the exact selector, producing one YAML application graph for external lockfile/security consumers without changing package versions; browser compilation excludes Node ambient types and browser lint rejects Node built-ins/import forms, while test/build tooling retains separate Node types and pure-domain checks remain stricter. Negative fixtures exercise these guards. Neither local parsing/audit nor architectural lint establishes complete supply-chain safety or guarantees hosted GitHub dependency graph/Dependabot processing; hosted validation remains required.

## Assets, actors and boundaries

Protect mathematical truth, learner confidentiality/integrity, saved-state availability, release/update authenticity and contributor/asset provenance. Potential actors include malicious PR authors, compromised dependency/maintainer/host, hostile same-device extensions/users, tampered local import files and accidental contributor/parent disclosure.

Trust boundaries are unreviewed content -> build/review; host/update -> installed app; UI/input -> domain; app -> speech/OS; adapter -> IndexedDB; imported file -> staged schema; child play -> parent controls. Parents/device owners can access local data; this design does not offer anti-parent authentication.

| Threat | Prevention/containment | Planned verification / residual |
| --- | --- | --- |
| XSS via nickname/translation/asset | Plain text rendering, no eval or arbitrary HTML; curated bundled SVG/assets; bounded strings | Malicious strings/SVG cases; first-party compromise remains possible |
| Geometry/notation markup or computation abuse | App-authored allowlisted scene/expression primitives only; no arbitrary imported SVG/HTML/TeX, external href/foreignObject/style injection; bounded vertices/output/work before computation | Malicious scene/input bounds, root/power preflight, typesetter-failure tests; no new exposure history |
| Malicious puzzle contribution | Static reviewed modules, independent math oracle, family/accessibility review | Property/boundary tests and deliberate defects; tests are not proof against malicious maintainers |
| Dependency/build compromise | Minimal pinned lockfile, reviewed updates/scripts, provenance/license scan, least-privilege CI | Dependency diff/security review; frozen install alone is insufficient |
| Accidental Node facilities in browser source | Separate browser/tool/domain compiler options; no browser Node ambient types; Node-module/global lint guards | Test-only negative Node-global/module probes; architectural guardrails do not sandbox malicious code |
| Host/service-worker compromise | HTTPS, self-hosted assets, narrow worker scope, coherent release manifests, security headers where supported | Mixed-release/update tests; compromised origin can replace CSP and hashes |
| Corrupt/stale cache | Namespaced complete precache, wait/safe update, compatible recovery | Partial download, offline restart, missing asset and rollback tests |
| Corrupt/quota/migration failure | Atomic writes/revisions, bounded staging, typed errors, read-only recovery | Crash/abort/quota/versionchange/future-schema cases |
| Concurrent profile writes/delete | Transactional revision and deletion generation fence, cancel pending work | Two-tab stale writes/deletion; no snapshot resurrection |
| Tampered export/import | Bounds/schema validation, no remote refs/code, staging and parent preview | Oversize/depth/prototype keys/version/conflict fuzz cases |
| Accidental telemetry | No analytics SDKs/CDN-only assets/remote fonts, request allowlist and no learner values in requests | Synthetic session network observation, dependency scan and offline run |
| Remote/browser TTS leakage | Explicit localService true voice, fixed reviewed prompts, no personal speech | Disconnected actual-device test; OS traffic not proved blocked by CSP |
| Repository data/secret leak | Synthetic fixture directories, ignore rules, content/asset review and future scans | git tracked-file review; ignore does not protect already tracked files |
| Contribution/CI privilege abuse | Phase 1A workflow declares read-only checks, no secrets/write tokens on fork code, reviewed workflow pins | Static CI-permission review; remote execution unverified, no privileged PR trigger |
| Public asset rights | Source/license/author/modification inventory, review permission and attribution | Human license check; code license cannot cure asset infringement |
| Future native compromise | Least-privilege Tauri capabilities, no broad shell/filesystem, signed distribution/updater validation | New desktop ADR/tests; not a V1 control |

Proposed production CSP starts from default-src 'self', script-src 'self', object-src 'none', base-uri 'none', connect-src 'self', frame-ancestors 'none' and controlled media/style/font/worker sources. Test actual build needs before finalizing; avoid unsafe-eval/inline exceptions casually. frame-ancestors requires an HTTP header and is not available through a meta CSP. Restrictive Permissions-Policy should deny microphone, camera and geolocation where supported. Header control is a host-selection gate; no claim these policies exist now.

Do not promise a signed release manifest against malicious hosting unless an independent trusted signing/update verification model exists. Web initial delivery fundamentally trusts the origin/TLS chain. Desktop signing/updater keys introduce additional protection and key-management risk.

No real learner information is needed for diagnostics. A standalone seed/spec/content version and synthetic reproduction suffice for most mathematical faults. Memory-only error codes may support local debugging without persisted child logs.

Prioritise privacy leaks, wrong math and irreversible corruption as merge-blocking. A real private security-reporting channel and maintainer/security responsibilities must be established before accepting public contributions; the maintenance window must be approved before public release. [SECURITY.md](../SECURITY.md) deliberately does not invent a contact. [Testing strategy](TESTING_STRATEGY.md) sets gates and [open questions](OPEN_QUESTIONS.md) records remaining decisions.
