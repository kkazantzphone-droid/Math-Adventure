# Child safety and privacy

Status: accepted conservative product policy plus unresolved legal-launch decisions. This is architecture research, not legal advice or a compliance determination. Sources accessed 2026-10-04 are indexed in [research evidence](RESEARCH_EVIDENCE.md).

## Project policy

V1 requires no identity, account, email/phone/social login or real name. Use Player N/optional local nickname. No ads, trackers, external learning analytics, cloud learner profiles, microphone, camera, geolocation, contacts, fingerprinting, biometric collection, chat or externally transmitted child-learning telemetry. No clinical, developmental or intelligence inference. Profiles and progression are independent with no sibling ranking.

Normal cached gameplay runs locally. Static delivery/update requests still reveal metadata such as IP address to the host/provider. Inventory these purposes/providers and prohibit learner IDs, nicknames, answers, concept evidence or diagnostic histories in URLs, headers, request bodies or cache names. Self-host fonts/images/code; no remote executable scripts or analytics SDKs. Browser/OS speech can be network-dependent; select explicit local exposed voices and use fixed nonpersonal prompts. Page CSP is not proof of OS TTS behavior.

Local learner adaptation uses bounded observations and minimal summaries, not every click. See [retention and deletion](LEARNER_DATA_MODEL.md). Proposed raw-evidence limits are 10/concept, 500/learner, 60 days; profile/summary inactivity retention and grace/deletion behavior need owner/legal approval. Reset, delete, full app-owned local deletion and future parent export/import are required interfaces, with no silent resurrection via snapshots or stale tabs.

Shared-device privacy is limited: local profiles are logical partitions, not authentication or encryption. Browser extensions, device users, OS backups and compromised same-origin code can access data. A parent convenience gate reduces accidental settings access but is not strong authentication. Do not claim encrypted at rest. Exports are private files controlled by the parent and may outlive app deletion.

## Law, regulatory guidance and project choices

| Category | Verified limited finding | Architecture implication / unresolved scope |
| --- | --- | --- |
| EU law: GDPR | Articles 5/25 require minimisation, purpose/storage limits and privacy by design/default where applicable | Establish controller/operator role, purposes/basis, rights, security and processor/hosting responsibilities |
| EU law: GDPR Article 8 | Consent-based directly offered information-society services have a default child threshold of 16; national law may lower it to 13 | Do not infer all child processing must use consent; assess target territories and lawful basis |
| EU law: automated decisions | Article 22 addresses solely automated decisions with legal/similarly significant effects | Separate local adaptation/profiling analysis; no blanket exemption or assertion Article 22 applies |
| US regulation: COPPA | Covered child-directed/actual-knowledge collection includes persistent identifiers; amended rule has security/retention duties | Assess operator/commercial applicability and host collection; no “no backend means no COPPA” claim |
| UK statutory regulatory guidance | ICO Children's Code addresses child interests, high privacy and profiling defaults | Assess whether service falls in scope; local adaptation may be profiling and needs justification/control |
| Project policy | No data sent to AI, no telemetry, no manipulative engagement | Stronger design constraints do not establish statutory compliance |

Primary law: [consolidated GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1532348683434&uri=CELEX%3A02016R0679-20160504); [current COPPA Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312). COPPA's [2025 amendments](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule) became effective 2025-06-23, with general compliance deadline 2026-04-22; recheck current rule before launch.

UK guidance: [Children's Code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/) and [profiling standard](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/12-profiling/). UK changes through [DUAA 2025](https://www.gov.uk/government/publications/data-use-and-access-act-2025-factsheets/data-use-and-access-act-factsheet-uk-gdpr-and-dpa) have staged commencement; older ICO prose is not a complete current UK law account. A prelaunch current-law/guidance review is required.

## Launch questions and safer paths

Identify operator/controller, intended territories, household versus public-provider roles, lawful bases, age-related notices/parent rights, host metadata retention, security reporting and whether a DPIA or other assessment is needed. Assess learner adaptation as possible profiling: provide manual/non-adaptive play, parent explanation and meaningful control; do not assume local deterministic rules are exempt. An unresolved legal basis/default cannot silently become a launch decision. Child trials also need proportionate consent and privacy review.

Separately assess EU ePrivacy/national terminal-equipment rules and UK PECR storage/access applicability and exceptions, including IndexedDB/cache/preferences. No backend or HTTP cookies does not settle this classification. [EU Article 5(3)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02002L0058-20091219) and [current ICO guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/) require scope-specific review; [ICO technology guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/) also describes purely on-device scenarios. No blanket consent-banner requirement or exemption is asserted here.

Parent and child notices should be brief, age-appropriate and truthful about local storage, voice limitations, updates, shared devices and deletion/exports. Avoid nudges toward sharing. No default cloud restore. Future networking/AI/speech input requires a separate ADR, data inventory, minimisation analysis, parent control and updated notices.

Public repository policy is absolute: only synthetic learners/histories. Ignore patterns are one safeguard, not detection of all personal data. Human review and future privacy/secret scans inspect tracked files, assets, test artifacts and PR attachments. Never upload real data as evidence. See [CONTRIBUTING](../CONTRIBUTING.md), [ADR-0008](adr/ADR-0008.md) and [threat model](SECURITY_THREAT_MODEL.md).
