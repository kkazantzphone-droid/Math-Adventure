# Real household use — owner decision memo

Prepared 2026-10-22 (Europe/Athens) on protected main `f5f3866` (merged PR #18).
**Preparation only: this memo accepts, implements and changes nothing.** D16
and D19–D25 keep their current [register](DECISION_REGISTER.md) status until
the owner records a decision. It is not legal advice.

**How to use it.** Pick one option per area, or write your own. The
recommendations fit together as one package: _private use by one household,
starting on the owner's Windows PC_. The next step is to record the choices,
then commission a separate "household-ready product" Goal. Until then, real
children's progress stays unsaved, as today.

**Fact** = verified in repository evidence or a primary source listed at the end.
**Inference** = engineering reasoning from facts. **Recommendation** = a proposal
for your choice.

## Where things stand

- **Fact.** Saving works only in the loopback synthetic review build, with two
  fixed synthetic badges; the ordinary product build saves nothing. Backup and
  restore cover that synthetic world only, and restore only into a browser with
  no saved badge ([D57 report](KEEP_MY_ADVENTURE_COMPLETION_REPORT.md)). No code
  at `f5f3866` asks the browser for persistent storage.
- **Fact.** Saved data belongs to one origin (scheme, host and port):
  `127.0.0.1:4187` and `127.0.0.1:4188` are already two separate places.
- **Fact.** Device evidence is the owner's 2026-10-07 observation on an earlier
  build (Windows 11 + Chrome + Narrator, 200% zoom, a restart with the local
  server stopped and the PC disconnected;
  [D53 receipt](evidence/phase3c-closure/owner-observation.json)) and D57's
  automated desktop Chrome and Edge checks. There is no tablet or phone evidence.

## 1. Where the app runs (D16)

- **Fact.** Offline support needs a secure context: HTTPS, or loopback on the
  same machine. A plain `http://` home-network address (such as `192.168.x.x`)
  does not qualify, so tablets cannot simply use the PC as a home server.
- **Fact.** A GitHub Pages project site would be
  `https://kkazantzphone-droid.github.io/Math-Adventure/`. GitHub logs and stores
  visitors' IP addresses; restricting who can open a site needs GitHub Enterprise
  Cloud. The repository is public.
- **Inference.** All Pages project sites of one account share one origin, and so
  their saved data and offline caches. Moving to another origin never carries
  progress; the only bridge is a parent backup restored there, which today works
  for the synthetic world only.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **H1 — Owner's Windows PC, one fixed loopback origin.** Serve the build locally only to install and update; the child plays the installed app. | No host and no provider logs; matches the D53 evidence. Only that PC and browser profile. Install/update needs the owner's developer tools (fine for the owner, not a way to share the app). Host and port must never change. | Household use without a deployment decision. |
| **H2 — Dedicated HTTPS origin** (own domain or subdomain, used for nothing else) on a static host. | Any household device, including tablets; a stable long-term origin. Needs a deployment and host privacy/headers review and probably a paid domain (both Class C). The app, not the data, becomes publicly reachable. | Multi-device household; wider use later without another move. |
| **H3 — GitHub Pages project site.** | Free, quick HTTPS. Shared `github.io` origin; GitHub keeps visitor IPs; header control is not assumed ([offline strategy](OFFLINE_AND_DISTRIBUTION.md)); a later move to an own domain migrates every device. | Tablets quickly. |

**Recommendation: H1**, if the children can play at the PC. If tablets are
essential from the start, choose **H2, not H3**, and fix the final origin before
the first real save. H1 means one planned move later (PC to hosted), so the
household-ready Goal needs ordinary-product backup/restore either way.

## 2. Retention and deletion (D19/D20)

- **Fact.** Proposed, not accepted: at most 10 observations per concept, 500 per
  badge, none older than 60 days (D19); after 12 months without meaningful play,
  with notice from month 9, pause adaptation and ask a parent to renew, export or
  delete ([data model](LEARNER_DATA_MODEL.md)). Grace length and final automatic
  deletion are undecided (D20).
- **Fact.** A closed app cannot delete anything on a deadline; it acts only when
  opened.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **R1 — Proposals plus a 30-day grace, then automatic deletion at the next opening.** | Strongest limit on storage. Progress is lost if no parent responds; softened by an export offer and a neutral "ask a grown-up" message, never a loss message, to the child. | Real saved progress with a complete, testable expiry path. |
| **R2 — Proposals with no automatic deletion:** the badge stays paused until a parent decides. | No surprise loss. Data may stay indefinitely on an abandoned device, which the data model warns against. | Real saved progress; no deletion path to build. |
| **R3 — A fixed household period** (for example 6 months, same observation limits), then renew, export or delete. | Easiest to explain. More prompts; the period is arbitrary. | Real saved progress with the simplest notice. |

**Recommendation: R1**: 10 / 500 / 60 days; 12 months' inactivity; notice from
month 9; a 30-day grace counted from the first time the expiry notice is shown.
A backwards clock change never silently extends a deadline; it asks a parent.

## 3. Household privacy scope, notices and adaptation defaults (D21)

- **Fact.** The GDPR does not apply to processing "by a natural person in the
  course of a purely personal or household activity" (Art. 2(2)(c)). Recital 18
  adds that it still applies to controllers or processors that provide the means
  for such processing.
- **Fact.** The ICO Children's Code says to switch profiling options off by
  default unless there is a compelling reason, and reads the "essential to the
  core service" exception narrowly.
- **Fact.** Adaptive invitations are experimental and not educator-reviewed (D06
  and D18 remain proposed).
- **Inference.** Own-children use on own devices may fall within the household
  exemption. Publishing the app (H2/H3) could make the owner a provider of the
  "means", and EU ePrivacy / UK PECR storage rules are a separate question (Q05).
  A qualified adviser must confirm this; the memo does not decide it.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **P1 — Own household only; adaptation off by default.** A parent turns guided invitations on per badge after a one-screen explanation, and off at any time; the child can always choose freely. | Most conservative; matches the ICO default and the experimental status. Less tailored at first. | Household notices and settings in the Goal. |
| **P2 — Own household only; adaptation on by default**, with explanation and a visible parent off-switch. | Closer to the designed journey. Needs a documented compelling reason and educator confidence that do not yet exist. | The same, after educator review. |
| **P3 — Household plus invited relatives or friends.** | Other people's children; the owner becomes a provider. Needs formal notices, an adviser's determination and possibly a DPIA. | Nothing until that legal work is done. |

**Recommendation: P1**, with a short parent notice and a one-line child
explanation: saved on this device only and never sent; what is kept and for how
long; what adaptation does and how to turn it off; delete and backup controls;
backup files outlive deletion; a shared device is not private; speech limits.
Sub-decision: keep recording bounded evidence while adaptation is off
(recommended yes, within the same limits, and said in the notice).

## 4. Real profile identity and restore

- **Fact.** The data model proposes an opaque local ID, "Player N" and an
  optional nickname. Today the child surface has no text inputs and a guard test
  forbids them; the synthetic badge slot feeds task-seed derivation; restore
  refuses a browser that already holds a badge
  ([D57 design](KEEP_MY_ADVENTURE_DESIGN.md) and report).
- **Inference.** If restored badges get new IDs, the task seed must be stored
  apart from the ID so play continues identically.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **I1 — Opaque random ID plus a picture badge** from a fixed set (Star, Triangle, more shapes); no free text. | No names stored or exported; keeps the no-text guard. A limited set of badges. | Creating real badges with no new text input. |
| **I2 — I1 plus an optional nickname typed by a parent.** | Siblings are easier to tell apart. Brings free text, probably a real name, into storage and backup files. | A nickname feature, guard change and export preview. |
| **M1 — Restore into an empty app or as an extra badge with a new ID; never merge or overwrite; refuse a badge already present.** | No silent loss. Replacing a badge means deleting it first. | Moving devices and recovering after loss. |
| **M2 — M1 plus "replace this badge"** after parent confirmation, saving a backup of the replaced badge first. | Convenient between devices. More ways to go wrong. | In-place replacement across devices. |

Merging two histories is not offered: it would double-count evidence and mix
adaptation state.

**Recommendation: I1 + M1**, with each picture badge also carrying a text name
for screen readers.

## 5. Eviction, cleared storage and exports

- **Fact.** Browser storage is "best-effort" by default and may be cleared under
  storage pressure. Asking for persistent storage needs the browser's permission,
  granted by its own rules. People can also clear site data themselves.
- **Inference.** After a full clear, the app cannot tell a cleared browser from a
  new one.
- **Fact.** Backup files are private, outlive app deletion and cannot be erased by
  the app; the checksum detects damage, not tampering.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **E1 — Ask for persistent storage at setup, with a parent explanation; a Grown-ups reminder when the last backup is over 30 days old; the first screen offers "Start new" or "Restore from a backup file".** | Much lower risk of loss. Still relies on the parent keeping files. | Honest "saved on this device" status with recovery built in. |
| **E2 — Only the first-screen restore offer;** the parent backs up whenever they choose. | Fewest prompts. Higher risk of losing progress. | The smallest build. |

Password-protected backups are not recommended now: a forgotten password loses
the backup, and they need their own security design.

**Recommendation: E1**, plus fixed wording at export and at every delete:
"Backup files are not deleted by the app — find and delete them yourself."
Filenames carry a date, never a name. Reminders are shown only to adults.

## 6. Minimum device and accessibility evidence before use

- **Fact.** D53 covered an earlier build; screens have changed since (D54–D57).
  D57 used browser-controlled offline mode, not disconnection, and no screen
  reader. WCAG 2.2 AA is a proposed target (D25), not a claim.

| Option | Trade-offs | Unblocks |
| --- | --- | --- |
| **V1 — Each actual household device and browser, on the household-ready build, before the first real save.** The owner runs a short protocol with a synthetic badge: install; every activity, help and Explore; the child's input method; the household's languages; 200% zoom; a physically disconnected restart; backup and restore; persistent-storage status; a screen reader only if someone in the household uses one. Record pass/fail with no child data. | Proportionate; reuses the D53 protocol. Says nothing about other households. | The first real save in this household. |
| **V2 — V1 plus the D23 platform matrix** (Windows Edge and Chrome, Android Chrome, iPad Safari tab and Home Screen). | Needed before supporting other families. Much more work. | Support statements for other households. |
| **V3 — A professional WCAG 2.2 AA audit.** | Needed for any accessibility claim; not for private use. | Accessibility claims. |

**Recommendation: V1**, repeated when the build, device or browser changes
materially. Assistive-technology testing becomes mandatory only if a child uses
it.

## Reviews still needed

| Area | Qualified legal/privacy | Educator | Native-language |
| --- | --- | --- | --- |
| 1 Hosting | Not for H1. H2/H3: hosting, security and host-terms review (Q06) | No | No |
| 2 Retention | Yes, before real data is stored (D19, Q03) | Yes: is a 60-day, 10-observation window enough for adaptation? (D18) | Notice wording |
| 3 Privacy/adaptation | Yes, before real data: household reading and storage-access rules (Q04/Q05); always before P3 | Yes, before P2 | Notice wording |
| 4 Identity/restore | Within the area 3 review | No | Badge names |
| 5 Eviction/exports | Within the area 3 review | No | Export and delete wording |
| 6 Devices | No | No | Yes: the languages the children will use, by the owner or another native speaker (Q09); official packs still need two reviewers |

One qualified privacy review can cover areas 2–5 together.

## Recommended package and next step

**H1 + R1 + P1 + I1/M1 + E1 + V1:** private use by one household on the owner's
Windows PC, adaptation off until a parent turns it on, picture badges without
names, bounded retention and parent-controlled backups. If you agree, record the
choices as a new decision-register entry, obtain the reviews above, then
commission the household-ready Goal: saving at the chosen origin; identity,
retention, notices and settings; persistent storage and reminders;
ordinary-product backup/restore with new IDs; and the V1 protocol. That Goal
would still exclude other families, public release, official language packs and
educational claims.

## Sources (accessed 2026-10-22)

- GitHub Docs: [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
  (site addresses, visitor IP logging);
  [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits);
  [Changing the visibility of your GitHub Pages site](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).
  Repository visibility (public) read with `gh repo view` the same day.
- MDN: [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
  (secure contexts; page last modified 2026-08-15). W3C:
  [Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/) editor's
  draft of 2023-11-10 (loopback is trustworthy; other plain-HTTP hosts are not).
- WHATWG: [Storage Standard](https://storage.spec.whatwg.org/) (living standard,
  updated 2026-10-19). WebKit:
  [Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
  (2023-08-10).
- Regulation (EU) 2016/679 as adopted:
  [Article 2](https://www.legislation.gov.uk/eur/2016/679/article/2/adopted) and
  [recital 18](https://www.legislation.gov.uk/eur/2016/679/introduction/adopted),
  read on legislation.gov.uk because EUR-Lex refused automated access.
- ICO: [Children's Code standard 12, profiling](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/12-profiling/)
  (no page date shown).
- Repository: [decision register](DECISION_REGISTER.md),
  [open questions](OPEN_QUESTIONS.md), [owner brief](CLEAR_ANSWERS_OWNER_DECISIONS.md),
  [learner data model](LEARNER_DATA_MODEL.md),
  [privacy policy](CHILD_SAFETY_AND_PRIVACY.md),
  [offline strategy](OFFLINE_AND_DISTRIBUTION.md),
  [ADR-0003](adr/ADR-0003.md), [ADR-0007](adr/ADR-0007.md),
  [ADR-0008](adr/ADR-0008.md).
