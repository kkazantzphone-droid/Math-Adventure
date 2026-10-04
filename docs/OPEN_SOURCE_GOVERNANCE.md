# Open-source governance and licensing

Status: proposed public model; maintainer assignments, final license and publication are not performed. [CONTRIBUTING](../CONTRIBUTING.md) defines review expectations.

## Roles and decisions

The owner retains policy/release authority initially. Propose small review roles, which may overlap but must be explicit: code maintainer, mathematical reviewer, educational reviewer, locale maintainers, accessibility reviewer and security contact. Do not invent people or credentials. Record conflicts and use an independent reviewer for high-risk truth/progression/storage changes; no sole self-approval merely because tests pass.

Issues track actionable defects/work; Discussions host ideas, pedagogical debates and parent feedback. Categories include New Puzzle Idea, Educational/Pedagogical Suggestion, Translation, Speech/Accessibility, Adaptive Difficulty, Game Mechanic, Bug, Parent Feedback, Documentation and Security. Security findings use an approved private channel. This is a channel design, not GitHub configuration.

Accepted constraints require an ADR for material change. Proposed implementation details may evolve with evidence; update register/traceability rather than leave contradictions. Community teaching preferences do not override child-safety/math/privacy rules silently. No country curriculum is privileged by the core graph.

Require respectful, nonjudgmental discussion: no child identification, diagnostics, competitive sibling claims, harassment or shame. Moderation/reporting escalation and an adopted code of conduct need named maintainers before public contributor onboarding. Do not collect unnecessary child anecdotes. Translators may submit beta packs; official promotion needs completeness, two independent native/fluent reviews including at least one native speaker of the exact regional target (prefer two), and contextual math/spoken/accessibility checks.

## License comparison

This is a bounded reading of primary license texts, not legal advice, accessed 2026-10-04.

| Aspect | MIT | Apache-2.0 |
| --- | --- | --- |
| Permissions | Broad permissive reuse, modification/distribution/commercial use | Broad permissive rights with explicit conditions |
| Attribution | Retain copyright and permission notice | Retain relevant notices; existing NOTICE handling; mark changed files |
| Patent provisions | No explicit patent grant in license text | Explicit limited contributor patent grant with termination on specified patent litigation |
| Contribution terms | Simple, incoming terms need project clarity | Default intentionally submitted contributions under license absent explicit exception |
| Trademark/assets | Does not supply unrelated asset rights | No general trademark permission or automatic third-party asset relicensing |
| Suitability | Very simple for small project | Clearer patent/contributor terms for broader community; more notice administration |

Sources: [MIT](https://opensource.org/license/mit), [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0). Recommendation: **Apache-2.0 for original code/documentation**, pending owner approval and review of contributor expectations. MIT remains reasonable if simplicity is prioritized. No final LICENSE is added in Phase 0. Until selection, this repository's open-source intent is not a granted final reuse license.

Neither permissive license legally guarantees downstreams preserve project privacy or educational principles. Those are project acceptance/release rules. Decide license and incoming-contribution notice before accepting public contributions. Proposed lightweight sign-off/DCO-style provenance is not adopted yet; a CLA is not presumed necessary. Changes to contribution rights need explicit owner decision.

## Asset provenance

Keep a future asset inventory: file, source URL, author/rightsholder, license/version, proof of redistribution/modification permission, changes, attribution placement and scope. Images/icons/fonts/sounds/prerecorded speech/translations can have distinct terms. Prefer original or clearly permissively licensed reviewed assets. Font redistribution and recorded voice performer consent need their own checks. No real child recordings. Do not assume code licensing covers every asset, and do not invent licenses for generated media.

Public release needs adopted license/notices, asset audit, private security channel, maintainer roles/moderation process, synthetic-only repository review and required quality gates. [SECURITY](../SECURITY.md) response targets remain proposed, and remote publication requires separate authorization.
