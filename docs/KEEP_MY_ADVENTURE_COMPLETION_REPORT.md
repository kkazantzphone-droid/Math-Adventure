# Keep my adventure — completion evidence

2026-10-22, Europe/Athens. Status: **IN PROGRESS** — gate results below are
filled in from observations before publication.

The [D57 design](KEEP_MY_ADVENTURE_DESIGN.md) binds the work to protected-main
base `c362eaecbaca90b3ae01a5ae79ead335509e64a1` (merged PR #17) on branch
`codex/keep-my-adventure`, with `merge_policy: automatic_when_eligible` under
unchanged V2. Fetched main and the initial checkout were identical and clean.

## What a parent can now do

In the Grown-ups view of the loopback synthetic experience, **Keep this
adventure** explains in Greek, British English and German drafts what browser
saving, a backup file, offline use and offline speech each are, and exactly
what a backup does and does not contain.

1. **Prepare a backup.** The app reads one consistent read-only snapshot of the
   saved badges, builds the file, reads it back through the import validator and
   only then offers **Save backup file**. Afterwards it says the browser was
   asked to save the file and to check the downloads; it never claims the file
   is safely stored.
2. **Choose a backup file.** The file is checked in memory. A preview lists each
   badge with its saved world, three language roles, play choice, activity to
   continue, session, finished activities, independent successes, successes with
   help or another try, worked examples, not-yet answers, answers not counted,
   experimental practice notes, discoveries and help kept for the open session.
   Choosing and previewing writes nothing; Cancel leaves storage untouched.
3. **Restore these badges** appears only where no badge is saved. Success is
   shown only after one atomic transaction and a separate readback. Star returns
   as Star and Triangle as Triangle, each with its own separate history,
   preferences, accomplishments and evidence qualifications.
4. **Reopen and continue.** Choose a badge; the restored language, activity,
   saved help and history continue in the destination browser. The backup file
   remains a separate copy.

Child navigation, the fourteen activities, answer controls, Explore and the
Space presentation are unchanged. The ordinary product build contains none of
this code and still has no learner persistence.

## Portable meaning, exclusions and reconstruction

See the [design](KEEP_MY_ADVENTURE_DESIGN.md#what-a-backup-means) for the full
rules. Preserved exactly: payload schema (legacy or growing world), fixed badge
slot, the three language roles, mode, selected activity, task ordinal, completed
count, session ordinal and open/stopped state, both evidence journals with their
IDs, hint tiers and attempts, and the saved current-session help context.
Excluded: source revisions, storage epoch, receipts and fingerprints, an answer
still being saved, last-answer feedback with its source operation ID, Explore and
every other session-only memory. Reconstructed: derived adaptation state, rebuilt
by the unchanged engine and required to equal the source's stored state.
