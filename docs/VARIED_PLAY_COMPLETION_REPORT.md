# Varied play — completion evidence

2026-10-23, Europe/Athens. **Engineering evidence PASS** for the bounded D58
Goal at source commit `b2990e0`. Owner UX acceptance is recorded below; any
real household use remains a separate decision. The live PR record holds the
final head's own hosted checks and any merge observation; this report does not
infer them from an earlier head.

The [D58 design](VARIED_PLAY_DESIGN.md) binds the work to protected-main base
`f5f3866` (merged PR #18) on branch `codex/varied-play`, with
`merge_policy: automatic_when_eligible` under unchanged V2.

## What a child now sees

- **Compare groups** shows more on the left, more on the right and equal
  groups, instead of equal groups every time. A rendered Star-badge run gave
  2v1, 4v0, 1v0, 0v2, 2v1, 3v3, then 1v4, 1v2, 5v5.
- **Every other activity** varies the same way: unequal additions and missing
  numbers, rectangles and parallelograms as well as squares, non-square arrays
  and equal groups, and different take-away amounts and line lengths.
- **Pictures change per task**: dots, suns, planets, moons or rockets. All
  items in one task share a picture and each is named for screen readers; a
  crossed-out item keeps its name ("Moon, taken away"). No picture copies the
  Star or Triangle badge. A rendered counting run gave 2 and 5 dots, 1 and 2
  planets, 3 rockets, 1 moon, 4 rockets, then 1 and 4 suns.
- **Comparison groups** sit in two framed panels that stay side by side even at
  320 CSS px with 32px root text; the items wrap inside each panel.
- Prompts and help no longer say "dots": "How many can you see?",
  «Πόσα βλέπεις;», „Wie viele siehst du?“, and comparison asks "Which side has
  more?". The Greek equal card reads «Ίσα».

Answer controls, help stages, Explore, saving, backup and every mathematical
rule are unchanged.

## Independent review and repairs

Two fresh reviewers, given the raw diff rather than a desired verdict, examined
the seed scheme with backup compatibility, and the pictures with accessibility
and wording. Neither found a critical or high defect. Repaired:

- Literal v2 seeds are pinned for all fourteen families and both badges, with
  family order and the two-badge assumption asserted, so a reordered array
  cannot change seeds under the same version name.
- A take-away threshold that sat above the generator's true rate (0.35) became
  a short-session bound plus a long-run rate check; the repeat limit was
  tightened so it also detects v1.
- The comparison panels had a minimum width that made them stack on phones,
  contradicting "left" and "right"; they now share the row.
- A star picture copied the Star badge; it became a sun.
- Crossed-out items keep their picture's name inside a separately named tray.
- Greek «Ίδιες» became «Ίσα»; comparison asks which side has more; German help
  is complete sentences; "Use the ones you know" became "Use the parts you
  know"; the draft pack moved to `0.2.0-child-draft` / `child-messages-v2`.
- Wrong comments (odd lane constants, the miss probability), the D57 table row
  and the unsettled-answer case were corrected or documented.

A third fresh reviewer checked every repair: all fixed, with the
unsettled-answer note made more precise and small follow-ups applied (two Greek
help lines still in the dot-gendered form, a lighter rocket tint so every
picture keeps at least 4.5:1 crossed out or disabled, now pinned by a unit
test).

## Evidence

**Diagnosis.** On `f5f3866`, both badges' first 24 tasks were all equal
comparisons, all double missing numbers, square arrays and groups, and square
quadrilaterals. A unit test keeps v1 and pins that defect.

**Unit and property proof.** `tests/unit/synthetic-loop-seed.test.ts` checks v2
against an independent BigInt MurmurHash3 oracle at boundaries for every family
and badge; literal golden seeds; 11,228 distinct nonzero states with four
distinct words each; per-activity variety for all fourteen activities; and the
relation and partial take-away rates of 2,400 tasks against the generator's
exact 15/36, 6/36, 15/36 and 0.35. `tests/unit/child-pictures.test.ts` computes
WCAG contrast from the stylesheet tints on all three panel colours at full,
disabled and crossed-out opacity, and checks one stable, evenly spread picture
per task. Backup tests confirm v2 export, identical restore of a v1-labelled
file, and refusal of any other seed name.

**Restored mutations.** Seven plausible defects are each detected by assertions
and exact bytes restored: reusing v1 seeds, one lane constant for every word,
badges sharing a seed space, accepting any seed provenance, exporting v1
provenance, always drawing dots, and naming every picture a dot
([receipt](evidence/varied-play/mutations.json), bound to `b2990e0`).

**Repository gates.** At `b2990e0` `corepack pnpm verify` passes 1,482 tests in
81 files with the lockfile and `package.json` unchanged, and `corepack pnpm
audit` reports no known vulnerabilities.

**Installed browsers.** At `b2990e0` the complete slice regression passes 154
tests in seven files in both Chrome 155.0.8059.84 and Edge 155.0.4283.62
([matrix](evidence/varied-play/browser-matrix.json)), including the
multilingual journey with the new wording, picture names and hint strings, the
backup/restore suite and the Phase 3C loop. Its numeral and counting variety
test now samples until all six quantities appear (at most 40 tasks): under
independent draws 16 tasks cover them only about 70% of the time, and v1 had
passed the old 16-task form by the luck of its fixed windows (78–86% of its
windows covered all six).

**Rendered review.** In the browser pane, on a fresh loopback origin with the
production slice build, compare groups, counting and take away were played
through in Greek. Pictures, names, the framed panels, help stage 3 pairing and
the 320 CSS px / 32px-root layout were inspected; no horizontal overflow or
clipped item was found.

## Merge and owner acceptance

Codex's guarded squash merge at head `e102bbb` was refused by the session's
permission check. The owner then squash-merged PR #20 on GitHub as
`cd7ee6f` (2026-10-23 12:57:57 UTC). Its single parent is `f5f3866`, and its
tree equals the tested head `e102bbb`. The "Protect main" ruleset was
unchanged, and no tag or release followed.

After playing the merged result, the owner confirmed on 2026-10-23:

> Yes: after trying it, the games now feel varied enough; the monotony
> complaint is resolved.

This is bounded owner UX acceptance for the synthetic experience. It is not
representative child research, educational-effectiveness evidence,
accessibility certification or native-language approval. It does not authorize
real-child use.

## Limits

- Pictures and wording are drafts; Greek and German still need native review.
- Take away still removes nothing in about 41% of tasks and about 31% of
  comparisons have an empty side, as the immutable generators define; changing
  that is a separate content decision.
- An answer left saving by a tab closed mid-save shows beside the v2 task for
  that number after the update until its save is retried; its meaning is
  unchanged.
- Desktop Windows browsers only; no device, screen-reader delivery, forced-colours
  rendering or educational-effectiveness claim.
