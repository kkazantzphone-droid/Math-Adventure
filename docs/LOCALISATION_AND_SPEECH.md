# Localisation and speech

The current [focused multilingual increment](MULTILINGUAL_CHILD_DESIGN.md)
brings native-name language choices into the existing synthetic child entry and
uses the existing fenced record for independent per-badge preferences. Its
[completion evidence](MULTILINGUAL_CHILD_COMPLETION_REPORT.md) binds current
eight-family draft content, optional semantic activity prompts and cached
operation. All three playable languages remain draft/native-review pending;
the four planned packs remain incomplete and absent from the child selector.
Historical prototype/transient and generic-speech descriptions below retain
their original composition/evidence scope.

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

D50 [Phase 3C child presentation](PHASE_3C_COMPLETION_REPORT.md) adds short task,
visual-help and badge/navigation copy to the preserved developer inventory.
el-GR/en-GB/de-DE stay prototype-draft/native-review pending; planned fr-FR/es-ES/
it-IT/pt-PT preferences keep explicit incomplete Greek fallback. Child task
instructions and UI chrome use their independent effective locales; number speech
keeps its separate exact preference. Star/Triangle are fixed badge identities,
with no learner names. Adult-only language/voice diagnostics remain inspectable in
developer view. Optional explicit speech still uses existing fixed generic plans
and visible numeral cardinals 2–5, accepting only exposed exact-region voices with
`localService === true`. Badge/task/view/locale changes cancel obsolete speech;
missing speech preserves play. No arbitrary utterance, autoplay, substitution,
official pack, pronunciation or tested-offline voice claim follows. Shorter Greek
matching/comparison captions and shared normal word boundaries repair observed
narrow text reflow; accessible Left/Right labels remain localized behind visible
side arrows. Preserved mixed-role native tests pass in both products. D51 records
bounded owner product confirmation on 2026-10-07, including eight-family direct
answers, visual help, badge identities/navigation and separate adult diagnostics:
**PHASE 3C PLAYABLE SYNTHETIC LOOP + CHILD UX — ENGINEERING/OWNER PASS**.
Native-language review remains pending; owner acceptance does not certify
translations, pronunciation, WCAG, research or educational effectiveness.
**FULL PHASE 3C DEVICE/AT CERTIFICATION — PENDING EXTERNAL EVIDENCE** retains
actual AT/disconnected proof. Current full/fresh and independent review precede
the authorized narrowed feature PR. Both PR-specific exact-head CI checks must
succeed before the owner-merge handoff; `owner_merge` remains.

Historical Phase 3 readiness inventories the [new slice message IDs and acceptance gates](PHASE_3_IMPLEMENTATION_PLAN.md)
without writing translations or promoting packs. el-GR/en-GB/de-DE remain draft;
the four planned locales remain incomplete. Independent UI/instruction/number
speech roles and optional exact-local-only playback are preserved. Readiness
does not add generated/arbitrary learner utterances, saved preferences or a voice
claim; these require the bounded implementation and review stated in the plan.

Status: accepted separation/policy and preserved **Phase 1D ENGINEERING PASS — bounded checkpoint 6 complete**. Phase 2 extends the prototype draft schema for its developer proof, with passing completeness and bounded browser results in the [Phase 2 report](PHASE_2_COMPLETION_REPORT.md). Actual observation exposed one exact local Greek voice and zero eligible English/German voices; explicit fixed Greek playback completed, with no pronunciation/offline certification. The proof Listen control is generic navigation support, not arbitrary generated math speech. [ADR-0005](adr/ADR-0005.md) governs the boundary; [ADR-0012](adr/ADR-0012.md) records bounded Phase 1D choices. Historical gates/browser findings remain in the frozen Phase 1D report. Earlier primary-source research is recorded in [research evidence](RESEARCH_EVIDENCE.md), accessed 2026-10-04; it is distinct from device evidence.

The preserved owner-confirmed Phase 1V had tiny el-GR/en-GB-only copy, no speech and a documented Greek fallback for lang=de. That historical behavior and founder-family aggregate input remain in its frozen report/protocol; neither establishes official-pack quality or general language support. Phase 1D replaces the presentation boundary with draft current-prototype el-GR/en-GB/de-DE messages, exact seven-locale manifests, three independent transient language preferences and optional explicit local-only speech. German becomes prototype copy with native review pending, not official German support. Production pack promotion, general number wording and actual-device capabilities remain separate gates.

## Locale and pack model

| Exact locale | Release target | Required linguistic review topics |
| --- | --- | --- |
| el-GR | V1 official target | Contextual number inflection, mathematical terminology, natural child speech |
| en-GB | V1 official target | British wording, number reading and notation |
| de-DE | V1 official target | Unit/tens ordering, compound numbers, age-appropriate phrasing |
| fr-FR | Planned official | Irregular number names, plural/context conventions |
| es-ES | Planned official | Regional wording, gender/context and number reading |
| it-IT | Planned official | Elision/context and mathematical wording |
| pt-PT | Planned official | European Portuguese pronunciation/usage; no silent pt-BR replacement |

The Phase 1D implementation provides required-schema completeness for the current prototype in el-GR/en-GB/de-DE, with **prototype-draft / native-review pending** metadata. fr-FR/es-ES/it-IT/pt-PT have **planned/incomplete** manifests only, not child translation coverage. Canonical locale identity is exact; en-US, generic de and pt-BR do not silently replace architecture tags. Schema/version/status metadata separates current prototype completeness from linguistic review. No pack is official or certified. Official promotion requires complete release-required UI/instructions/hints/feedback/accessibility wording and two independent native/fluent reviewers, including at least one native speaker of the exact regional target (prefer two), with mathematical/pedagogical competence represented. A locale does not become official merely because its schema compiles.

Future RTL packs use direction metadata, CSS logical properties, bidirectional isolation for mathematical tokens and reviewed symbol/order conventions. Do not reverse mathematical semantics automatically. Country-specific curriculum mapping stays optional.

The implementation represents three independent transient preferences: **uiLocale** for chrome/navigation/UI controls, **instructionLocale** for task/hint/relationship wording, and **numberSpeechLocale** for spoken number/math plans. No persistence exists. Compatibility lang=el/en/de aliases may set all three together; they are query conveniences, not canonical stored IDs. Explicit independent query/bootstrap inputs use exact canonical tags and deterministic documented handling, rather than navigator.language or arbitrary regional substitution. Mixed-language plans deliberately select tagged semantic wording for the relevant role; changing number speech must not change UI or instruction preferences. Future durable preferences and cached-language activation remain later work.

`parseLanguagePreferences(search)` accepts exactly one `lang=el`, `lang=en` or `lang=de` alias; absent, unknown, case-changed, repeated or malformed alias input defaults all three roles to el-GR. Optional `ui=`, `instruction=` and `speech=` inputs independently override the corresponding role with one exact canonical tag from the seven-locale set. An absent override retains the alias/default; an invalid or repeated explicit override resets **only that role** to el-GR. URLSearchParams decodes once. For example, `?ui=el-GR&instruction=en-GB&speech=de-DE` preserves all three independent identities. No silent browser-locale negotiation occurs.

`resolvePrototypeLocale` preserves the requested canonical tag and exposes the effective display pack plus reason. Available drafts resolve to themselves with `available-draft`; a planned locale resolves display to el-GR with `planned-pack`, visible in adult diagnostics. It does not become a complete French/Spanish/Italian/Portuguese pack. Planned speech remains unavailable rather than borrowing Greek or fabricating phrasing. Phase 2 draft metadata is packVersion **0.2.0-prototype**, messageSchemaVersion **prototype-messages-v2**, contentVersion **scripted-prototype-v1**, draft/complete-prototype/native-review-pending/official=false. The pack's presentation content tag is distinct from the domain catalog's **phase2-content-v1** replay identity. Planned manifests still have no pack version, incomplete status and no translation data. Historical 0.1/v1 evidence remains in the Phase 1D report/ADR.

BCP-47 identifies locales ([RFC 5646](https://www.rfc-editor.org/rfc/rfc5646)); matching uses explicit reviewed lookup rules ([RFC 4647](https://www.rfc-editor.org/rfc/rfc4647.html)). The current prototype uses an explicit Greek default and declared pack availability; planned status must remain visible and required-key checks cannot hide missing messages in a pack claimed complete. This bounded deterministic query/display policy does not establish the future parent-approved instruction fallback or official-pack release policy. Official packs have no missing essential-key fallback at release.

## Messages, notation and parsing

Math domain emits semantic IDs and typed values, never translated prose. The Phase 1D implementation uses stable message IDs, typed arguments and structured literal/argument/plural/select nodes with native Intl.PluralRules/Intl.NumberFormat. This provides the bounded plural/select path with **zero new dependencies**, without a generic ICU parser or intl-messageformat. Plain text/components own escaped rendering; there is no translated HTML, executable string or generic number+noun concatenation. Draft packs require complete prototype schemas, but contextual linguistic review remains pending. Message/number formatting cannot decide correctness, shape class, power/root truth or learner evidence.

The Phase 2 schema contains **79 stable required message IDs**: the existing 45 plus 34 minimal proof/settings/prompt/attribute/unit/hint strings. All three draft packs must satisfy it; four planned locales receive no fabricated child copy. `tiles.count` accepts a bounded nonnegative integer count and resolves plural slots with Intl.PluralRules; `badge.description` accepts only the declared star/triangle select values. `formatInteger` uses Intl.NumberFormat without grouping and accepts safe integers only. The formatter validates a claimed-complete pack before use; missing required keys return the stable `incomplete-prototype-pack` failure rather than hidden per-key fallback. Literal markup is rejected; React handles text escaping. There is no translated HTML execution, decimal parser or mathematical evaluator. Family domains emit semantic data/hints, never localised prose. New draft strings do not acquire native review from passing schema tests.

Intl formats numbers but does not supply a general localized-number parser or number spellout API; [ECMA-402](https://402.ecma-international.org/12.0/) describes its facilities, while [CLDR](https://unicode.org/reports/tr35/tr35-numbers.html) documents separate spellout rules. Number-word generation requires reviewed locale rules/data or validated provider pronunciation; do not invent German/French/Greek/Portuguese words by naïve concatenation.

For V1 integer tasks, numeric controls minimise separator ambiguity; parse only a declared grammar and safe integers. Later decimal input explicitly handles locale separators and grouping, showing an ambiguity error rather than interpreting “1,234” silently. Parsing lives at presentation; exact structured values reach math. Formatting/notation policy varies by task (e.g. no confusing thousands grouping for small-number play); equality and truth do not vary by language.

Speech plans distinguish cardinal, ordinal, fractional, decimal digit-by-digit and equation contexts. Speak “six plus three” as a reviewed semantic phrase, not symbol punctuation assumed pronounceable. Unknown pronunciation is a capability/test failure, not a math error. No nickname, raw answer or learner history is included in TTS.

Advanced plans also express square/cube/general powers, root degree and radicand, perimeter/area/units and angle/spatial relations semantically. Examples of intended meanings include “five squared,” “two to the third power,” “square root of twenty-five,” “perimeter,” “area” and “right angle.” Each of el-GR, en-GB, de-DE, fr-FR, es-ES, it-IT and pt-PT needs native-reviewed contextual phrases and vocabulary when that content is released; no translations are fabricated in Phase0. 4 × 4, 4² and √16 are linked semantic ideas but require different utterance plans. MathML/superscripts/radical glyphs alone are not pronunciation instructions.

## Speech port and capability state

The infrastructure implementation implements the unchanged generic Phase 1C SpeechService port. Presentation constructs fixed, language-tagged semantic plans for instructions, number/shape prompts and hints, supportive feedback, multiplication, square power and principal square root. Its fifteen fixed plan kinds include bounded cardinal values 2, 3, 4, 5, 6 and 16; arbitrary text, extra fields and accessors are rejected before a canonical immutable plan copy is spoken. It is not a homemade general seven-language spellout engine. The adapter returns completed/cancelled/unavailable/error/timeout and uses unknown internally, then loading/missing/ready-local/error; **it never emits the existing port's tested-offline state**. Speech failure cannot change scripted correctness, navigation or successful task state. Composition injects the adapter; domain/application gain no DOM/speech/timer imports.

V1 provider preference: browser SpeechSynthesis, selecting an explicit exposed voice with localService === true. Never use an unset default voice or silently fall back to network speech. Cloud TTS, remote voices and child speech recognition are outside V1. Prerecorded reviewed same-origin assets can later cover essential prompts if licensing/storage justify them; they do not solve arbitrary number speech automatically.

The [Web Speech specification](https://wicg.github.io/speech-api/), reviewed 2026-10-05, defines asynchronous/agent-dependent voice enumeration and local/remote service distinctions. The candidate enumerates immediately, subscribes to voiceschanged, uses a configurable 1,500ms loading bound/150ms retry interval and allows explicit refresh. Only an exact regional tag (case-insensitive comparison) with localService === true is eligible; no default voice, remote voice or regional fallback is selected. Voice names are unstable display labels; defensive deduplication uses URI/language/name/local flag together. No durable voice preference is stored. A future region fallback or stored tuple needs explicit owner/parent policy, re-resolution and device evidence; there is no silent pt-BR for pt-PT or en-US for en-GB.

A locally declared voice is not proof of empirical offline operation or pronunciation quality. Capability assessment combines reported properties with a parent-triggered fixed synthetic phrase test, then an actually disconnected test on the target device. Browser/page network interception alone cannot inspect every OS/vendor TTS path.

“Tested offline” is scoped to the selected locale/voice/provider and this browser/PWA surface on this device. Recheck after voice/provider/locale/surface changes, a failed playback or voice-list change; startup treats a prior test as historical and offers a current test rather than a guarantee. Keep only coarse local test status and the voice preference tuple, no identifying device fingerprint.

Cancel obsolete candidate speech synchronously before prototype actions and on preference changes, unmount/pagehide, explicit Stop speech and replay replacement. Replace rather than accumulate queued plans, ignoring stale end/error events. Playback is initiated only by explicit action; there is no autoplay. A configurable watchdog (10,000ms default) releases outstanding requests when end/error events fail, with deterministic timer behavior in fakes. Child replay appears only for a ready exact local plan, avoiding dead child-facing controls when a voice is missing. Full visual operation remains available. Avoid duplicate aria-live/TTS delivery or automatic competition with screen readers; speech is optional support, not accessibility proof.

A deliberate adult/developer **one exact `voiceCheck=1` query** (repeated flags disabled) exposes all seven requested-locale capabilities, local/exposed counts and transient voice details, fixed synthetic phrase availability and the last explicit phrase-test locale/outcome. Its status uses aria-live off, with no automatic audio. It is optional and absent from normal child navigation; there is no arbitrary text entry, voice telemetry, device fingerprint or persistence. Diagnostics make no tested-offline/provider-quality assertion. Current browser findings must be recorded precisely in the completion report, including valid missing-voice results. Primary API/Intl references and access date are in ADR-0012; documentation/source/fakes do not establish actual-device speech.

## Platform limits and future adapters

Windows documents voice packages including the target locales ([Microsoft voice list](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-a-supported-languages-and-voices)); this does not verify exposure in Edge/Chrome. Android engine/voice data vary ([Android TTS settings](https://support.google.com/accessibility/android/answer/6006983?hl=en)). Apple supports downloadable device voices ([Apple voice guidance](https://support.apple.com/en-gb/111798)); Safari/PWA exposure still needs tests. No seven-locale offline guarantee is made.

Tauri uses platform WebViews ([vendor reference](https://v2.tauri.app/reference/webview-versions/)); future browser or native speech adapters need their own conformance suite. Packaged native/local TTS adds binary size, licenses and platform support; defer until measured need. Gameplay without speech remains possible, but a missing voice may make the experience unsuitable for a particular child and should be clearly shown to the parent.

## Tests and contribution workflow

Review contextual prompts in screenshots and spoken demonstrations, with no real learners. Check completeness, plural/gender variables, mathematical meaning, formatting/parser round trips on accepted grammar, long strings, mixed settings, labels/direction, unavailable voice and offline language switching. Speech mocks test contracts; actual devices verify playback/pronunciation/offline behavior. Pack promotion is a human review gate, not an automated translation quality claim.
