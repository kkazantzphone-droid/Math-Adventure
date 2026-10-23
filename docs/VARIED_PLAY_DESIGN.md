# Varied play — design

Owner Goal received 2026-10-23 (Europe/Athens), recorded as D58.
`merge_policy: automatic_when_eligible` under the unchanged effective V2 contract.
Implementation base: protected main `f5f3866` (merged PR #18). Branch:
`codex/varied-play`.

## Commission and containment

The owner reports that the interface is well made and passed human acceptance,
but the activities are monotonous: four screenshots of the comparison activity
all showed two equal groups. Children lose interest quickly without enough
stimulation, so play needs more variety.

The Goal authorizes repairing what makes play repetitive inside the existing
synthetic experience, with supporting source, tests and documentation. It does
not authorize new activities, changed number bounds or generator behaviour,
accepted adaptation or educational policy, real-child data or trials,
ordinary-product persistence, release, deployment or access changes. Owner UX
acceptance of the result is separate from the engineering gates.

## Diagnosis

Measured on `f5f3866` for both synthetic badges and task numbers 0–23:

| Activity | What every task looked like |
| --- | --- |
| Compare groups | Always equal: 3v3, 2v2, 5v5, 0v0 … |
| Number that is missing | Always doubles: 3+3, 4+4, 5+5 … |
| Take away | Almost always nothing or everything removed |
| Equal groups, arrays, missing group | Always square: 2×2, 3×3, 5×5 … |
| Quadrilaterals | Always a square |
| Make ten | First and second number often equal |

The generators are correct; the workflow seeds were not. Version
`phase3c-session-seeds-v1` filled the four xoshiro state words with the task
number, one mixed word, the family number and a constant. The first draw
varied, but after one state transition the next output changed only in bits
that the bounded draw ignores, so each generator's second number repeated the
first. Its own comment claimed only that "first-draw tasks vary".

## Design

1. **Seed selection v2.** `phase3c-session-seeds-v2` packs the task number
   (20 bits), family (4 bits) and badge (1 bit) into one collision-free key and
   fills each state word with the MurmurHash3 finalizer of that key plus a
   distinct multiple of `0x9e3779b9`. The finalizer is a bijection, so the four words
   differ, at most one can be zero, and different keys give different states.
   v1 is kept, frozen, under its own name. The generator IDs, content versions,
   RNG word mapping and replay descriptors are unchanged: v2 only chooses which
   seed a task number uses.
2. **Saved worlds keep their meaning.** Records store the task number, not a
   seed. Evidence journals keep the seeds they were recorded with, saved help is
   keyed by the mathematical case rather than the seed, and derived adaptation
   state is rebuilt from journals. After the update a saved badge continues at
   the same task number; the numbers on that next task come from v2. An update
   activates only when no answer is saving, so this needs a tab closed
   mid-save. Such an answer still settles with its own stored verdict and
   seed, but on reopen play waits beside the v2 task for that number until the
   save is retried from the developer controls, and the old feedback then
   appears beside it. Meaning is unchanged; the synthetic surface accepts this
   brief mismatch.
3. **Backups.** Export writes `taskSeeds: phase3c-session-seeds-v2`. Import
   accepts a file that is exact in every compatibility field and names either
   v1 or v2; any other value is still refused. A v1 file restores identical
   records; only the next task's numbers differ, as for a saved badge. This
   amends the D57 rule that import requires exact equality.
4. **Pictures.** Counting, comparing, matching, adding, taking away and missing
   number items show one of five pictures per task: dot, sun, planet, moon or
   rocket, chosen from the task's public seed so a reopened task looks the same.
   No picture copies a badge shape: a star would be confused with the Star
   badge shown above the task. Every item in a task shares the picture, so only
   the quantity differs. Each item is named for its picture, and a crossed-out
   item keeps that name ("Moon, taken away"), and once help separates them the
   crossed-out items sit in their own named tray.
   The pictures are decorative SVG with light tints (at least 4.5:1 on every
   panel, including crossed-out and disabled states, pinned by a unit test)
   and forced-colours fallbacks. Neither truth,
   evidence, replay nor saved state reads the choice.
5. **Wording.** Prompts and help that said "dots" now speak of the items
   generically in all three drafts (for example "How many can you see?"), and
   comparison asks "Which side has more?" to match its cards. Greek «Ίδιες»,
   which agreed with κουκκίδες, becomes «Ίσα». Speech reads the same catalogue,
   so screen and voice stay consistent. The draft pack becomes
   `0.2.0-child-draft` with message schema `child-messages-v2`. Native-language
   review remains pending.
6. **Comparison layout.** Each group sits in its own framed panel under its
   side arrow, so the two quantities are clearly separate. The panels share the
   row and never stack: on a narrow phone the items wrap inside each panel, so
   left stays left and right stays right as the answer cards say.

## Evidence and adaptation

Fingerprints, evidence scopes, policy values and classifications are
unchanged. Better-mixed seeds make a session reach more distinct cases, so the
experimental adaptation sees more varied evidence than v1 allowed; no threshold
or interpretation changes. Help that was worked for one case still applies to
that case whenever it reappears.

## Not changed here

These remain properties of immutable generators and would need new generator
versions plus evidence-catalog review, a separate content decision:

- Take away removes nothing in about 41% of tasks, because the amount removed is
  drawn from 0 to the whole and small wholes are common.
- About 31% of comparisons have an empty side (0 is a valid quantity).

Varied praise was considered and left out: the spoken "You found it!" is a
fixed catalogue phrase, so varying only the screen text would make screen and
voice disagree.

## Acceptance evidence

- Independent BigInt oracle for v2 seeds at boundaries for all families and
  badges; injectivity and nonzero distinct words over 11,228 states.
- Session variety properties for all fourteen activities, and the relation
  distribution of 2,400 comparisons against the generator's 15/36, 6/36, 15/36.
- v1 kept and its defect pinned by test.
- Backup: v2 export, v1 file restores identical records, other seed values
  refused.
- Rendered pictures, names, wording and framed comparison in el-GR, en-GB and
  de-DE, the installed-browser suites, restored mutations and independent
  review, recorded in the [completion report](VARIED_PLAY_COMPLETION_REPORT.md).
