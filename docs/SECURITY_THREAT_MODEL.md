# Security threat model

Status: architecture controls and tests are planned, not implemented. Scope is a static child-focused PWA with local data; future desktop/network features need an updated model.

## Assets, actors and boundaries

Protect mathematical truth, learner confidentiality/integrity, saved-state availability, release/update authenticity and contributor/asset provenance. Potential actors include malicious PR authors, compromised dependency/maintainer/host, hostile same-device extensions/users, tampered local import files and accidental contributor/parent disclosure.

Trust boundaries are unreviewed content -> build/review; host/update -> installed app; UI/input -> domain; app -> speech/OS; adapter -> IndexedDB; imported file -> staged schema; child play -> parent controls. Parents/device owners can access local data; this design does not offer anti-parent authentication.

| Threat | Prevention/containment | Planned verification / residual |
| --- | --- | --- |
| XSS via nickname/translation/asset | Plain text rendering, no eval or arbitrary HTML; curated bundled SVG/assets; bounded strings | Malicious strings/SVG cases; first-party compromise remains possible |
| Geometry/notation markup or computation abuse | App-authored allowlisted scene/expression primitives only; no arbitrary imported SVG/HTML/TeX, external href/foreignObject/style injection; bounded vertices/output/work before computation | Malicious scene/input bounds, root/power preflight, typesetter-failure tests; no new exposure history |
| Malicious puzzle contribution | Static reviewed modules, independent math oracle, family/accessibility review | Property/boundary tests and deliberate defects; tests are not proof against malicious maintainers |
| Dependency/build compromise | Minimal pinned lockfile, reviewed updates/scripts, provenance/license scan, least-privilege CI | Dependency diff/security review; frozen install alone is insufficient |
| Host/service-worker compromise | HTTPS, self-hosted assets, narrow worker scope, coherent release manifests, security headers where supported | Mixed-release/update tests; compromised origin can replace CSP and hashes |
| Corrupt/stale cache | Namespaced complete precache, wait/safe update, compatible recovery | Partial download, offline restart, missing asset and rollback tests |
| Corrupt/quota/migration failure | Atomic writes/revisions, bounded staging, typed errors, read-only recovery | Crash/abort/quota/versionchange/future-schema cases |
| Concurrent profile writes/delete | Transactional revision and deletion generation fence, cancel pending work | Two-tab stale writes/deletion; no snapshot resurrection |
| Tampered export/import | Bounds/schema validation, no remote refs/code, staging and parent preview | Oversize/depth/prototype keys/version/conflict fuzz cases |
| Accidental telemetry | No analytics SDKs/CDN-only assets/remote fonts, request allowlist and no learner values in requests | Synthetic session network observation, dependency scan and offline run |
| Remote/browser TTS leakage | Explicit localService true voice, fixed reviewed prompts, no personal speech | Disconnected actual-device test; OS traffic not proved blocked by CSP |
| Repository data/secret leak | Synthetic fixture directories, ignore rules, content/asset review and future scans | git tracked-file review; ignore does not protect already tracked files |
| Contribution/CI privilege abuse | Future untrusted PR checks read-only, no secrets/write tokens on fork code, reviewed workflow pins | CI-permission review; no workflows exist yet |
| Public asset rights | Source/license/author/modification inventory, review permission and attribution | Human license check; code license cannot cure asset infringement |
| Future native compromise | Least-privilege Tauri capabilities, no broad shell/filesystem, signed distribution/updater validation | New desktop ADR/tests; not a V1 control |

Proposed production CSP starts from default-src 'self', script-src 'self', object-src 'none', base-uri 'none', connect-src 'self', frame-ancestors 'none' and controlled media/style/font/worker sources. Test actual build needs before finalizing; avoid unsafe-eval/inline exceptions casually. frame-ancestors requires an HTTP header and is not available through a meta CSP. Restrictive Permissions-Policy should deny microphone, camera and geolocation where supported. Header control is a host-selection gate; no claim these policies exist now.

Do not promise a signed release manifest against malicious hosting unless an independent trusted signing/update verification model exists. Web initial delivery fundamentally trusts the origin/TLS chain. Desktop signing/updater keys introduce additional protection and key-management risk.

No real learner information is needed for diagnostics. A standalone seed/spec/content version and synthetic reproduction suffice for most mathematical faults. Memory-only error codes may support local debugging without persisted child logs.

Prioritise privacy leaks, wrong math and irreversible corruption as merge-blocking. A real private security-reporting channel and maintainer/security responsibilities must be established before accepting public contributions; the maintenance window must be approved before public release. [SECURITY.md](../SECURITY.md) deliberately does not invent a contact. [Testing strategy](TESTING_STRATEGY.md) sets gates and [open questions](OPEN_QUESTIONS.md) records remaining decisions.
