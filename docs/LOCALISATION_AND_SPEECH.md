# Localisation and speech

Status: accepted separation/policy; provider behavior and language support need implementation/device validation. [ADR-0005](adr/ADR-0005.md) governs the boundary. Sources in [research evidence](RESEARCH_EVIDENCE.md), accessed 2026-10-04.

Phase 1V is a separate scripted visual prototype, with tiny incomplete copy for el-GR/en-GB only and no speech. Founder-family UAT reported that the prototype Greek/English copy worked; this does not constitute official-pack completeness, native-review sign-off or general language support. German remains deferred to Phase 1D. Only one exact `lang=en` selects English; absent, unsupported, case-changed, malformed or repeated values select Greek, including `lang=de`, `lang=en-GB` and repeated `lang=en`. This documented nonpersistent UAT default creates no locale negotiation/fallback framework or stored preferences. The production official-pack policy below remains prospective and unchanged.

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

None is implemented or certified yet. Pack manifests declare locale, packVersion, compatible message-schema/content versions, completeness, review status and reviewers. Proposed states: draft, community-beta, official. Official means complete required UI/instructions/hints/feedback/accessibility labels and two independent native/fluent reviewers, including at least one native speaker of the exact regional target (prefer two), with mathematical/pedagogical competence represented. Without these reviewers the pack remains beta. A locale does not become official merely because translations compile.

Future RTL packs use direction metadata, CSS logical properties, bidirectional isolation for mathematical tokens and reviewed symbol/order conventions. Do not reverse mathematical semantics automatically. Country-specific curriculum mapping stays optional.

Persist three independent preferences: uiLocale, instructionLocale, numberSpeechLocale. A language choice requires its instruction/UI assets cached before offline activation. Mixed-language utterance plans split appropriately tagged segments or deliberately select one reviewed whole-language phrase; never let spoken numbers silently change instruction meaning.

BCP-47 identifies locales ([RFC 5646](https://www.rfc-editor.org/rfc/rfc5646)); matching uses explicit reviewed lookup rules ([RFC 4647](https://www.rfc-editor.org/rfc/rfc4647.html)). Canonicalise supported tags; reject unsupported preferences rather than assuming any browser language is a reviewed pack. UI key fallback to en-GB is visible in beta/development; official packs have no essential-key fallback at release. Instruction fallback needs explicit parent selection, since an English fallback may be unusable for a child.

## Messages, notation and parsing

Math domain emits semantic IDs and typed values, never English/Greek prose. Presentation uses reviewed complete messages with ICU-style plural/select support, provisionally Intl MessageFormat and native Intl.NumberFormat/PluralRules. No concatenated “number + noun” translation scheme. No translated HTML or executable markup. Escaped text/components own formatting.

Intl formats numbers but does not supply a general localized-number parser or number spellout API; [ECMA-402](https://402.ecma-international.org/12.0/) describes its facilities, while [CLDR](https://unicode.org/reports/tr35/tr35-numbers.html) documents separate spellout rules. Number-word generation requires reviewed locale rules/data or validated provider pronunciation; do not invent German/French/Greek/Portuguese words by naïve concatenation.

For V1 integer tasks, numeric controls minimise separator ambiguity; parse only a declared grammar and safe integers. Later decimal input explicitly handles locale separators and grouping, showing an ambiguity error rather than interpreting “1,234” silently. Parsing lives at presentation; exact structured values reach math. Formatting/notation policy varies by task (e.g. no confusing thousands grouping for small-number play); equality and truth do not vary by language.

Speech plans distinguish cardinal, ordinal, fractional, decimal digit-by-digit and equation contexts. Speak “six plus three” as a reviewed semantic phrase, not symbol punctuation assumed pronounceable. Unknown pronunciation is a capability/test failure, not a math error. No nickname, raw answer or learner history is included in TTS.

Advanced plans also express square/cube/general powers, root degree and radicand, perimeter/area/units and angle/spatial relations semantically. Examples of intended meanings include “five squared,” “two to the third power,” “square root of twenty-five,” “perimeter,” “area” and “right angle.” Each of el-GR, en-GB, de-DE, fr-FR, es-ES, it-IT and pt-PT needs native-reviewed contextual phrases and vocabulary when that content is released; no translations are fabricated in Phase0. 4 × 4, 4² and √16 are linked semantic ideas but require different utterance plans. MathML/superscripts/radical glyphs alone are not pronunciation instructions.

## Speech port and capability state

Conceptual operations speakNumber(value, context, locale), speakInstruction(messagePlan), speakHint(plan), speakFeedback(plan), cancel and inspectCapabilities remain behind SpeechService. It returns outcomes completed/cancelled/unavailable/error/timeout and capability states unknown/loading/missing/ready-local/tested-offline/error. Speech failure never blocks validation or a playable visual alternative.

V1 provider preference: browser SpeechSynthesis, selecting an explicit exposed voice with localService === true. Never use an unset default voice or silently fall back to network speech. Cloud TTS, remote voices and child speech recognition are outside V1. Prerecorded reviewed same-origin assets can later cover essential prompts if licensing/storage justify them; they do not solve arbitrary number speech automatically.

The [Web Speech specification source](https://raw.githubusercontent.com/WICG/speech-api/main/index.bs) defines asynchronous/agent-dependent voice enumeration and local/remote service distinctions. Enumerate immediately, subscribe to voiceschanged, use a bounded retry/loading state, and allow a later parent refresh. Match exact locale first; region fallback (e.g. another English variety) is a parent-approved choice visibly labelled. No silent pt-BR fallback for pt-PT. Voice names are not reliable unique identifiers; persist a preference tuple and re-resolve on each device/startup.

A locally declared voice is not proof of empirical offline operation or pronunciation quality. Capability assessment combines reported properties with a parent-triggered fixed synthetic phrase test, then an actually disconnected test on the target device. Browser/page network interception alone cannot inspect every OS/vendor TTS path.

“Tested offline” is scoped to the selected locale/voice/provider and this browser/PWA surface on this device. Recheck after voice/provider/locale/surface changes, a failed playback or voice-list change; startup treats a prior test as historical and offers a current test rather than a guarantee. Keep only coarse local test status and the voice preference tuple, no identifying device fingerprint.

Cancel obsolete speech on task/profile/locale changes, replay or mute. Serialize or replace queued utterances; do not pile hints over screen-reader output. Playback is initiated by explicit user action where needed. Provide rate/volume/mute/replay and visible status; a bounded watchdog releases UI when end/error events fail. Speech settings and accessibility announcements cooperate, avoiding duplicated output.

A future Voice Check lists each requested locale, exposed local voice status, test button and optional downloaded-voice guidance. It must distinguish “installed on OS,” “exposed by browser,” “reported local,” “tested offline” and “reviewed pronunciation,” rather than a single misleading green check.

## Platform limits and future adapters

Windows documents voice packages including the target locales ([Microsoft voice list](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-a-supported-languages-and-voices)); this does not verify exposure in Edge/Chrome. Android engine/voice data vary ([Android TTS settings](https://support.google.com/accessibility/android/answer/6006983?hl=en)). Apple supports downloadable device voices ([Apple voice guidance](https://support.apple.com/en-gb/111798)); Safari/PWA exposure still needs tests. No seven-locale offline guarantee is made.

Tauri uses platform WebViews ([vendor reference](https://v2.tauri.app/reference/webview-versions/)); future browser or native speech adapters need their own conformance suite. Packaged native/local TTS adds binary size, licenses and platform support; defer until measured need. Gameplay without speech remains possible, but a missing voice may make the experience unsuitable for a particular child and should be clearly shown to the parent.

## Tests and contribution workflow

Review contextual prompts in screenshots and spoken demonstrations, with no real learners. Check completeness, plural/gender variables, mathematical meaning, formatting/parser round trips on accepted grammar, long strings, mixed settings, labels/direction, unavailable voice and offline language switching. Speech mocks test contracts; actual devices verify playback/pronunciation/offline behavior. Pack promotion is a human review gate, not an automated translation quality claim.
