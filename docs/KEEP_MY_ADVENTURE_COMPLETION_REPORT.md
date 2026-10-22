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

## Independent review and repairs

Three fresh reviewers, given the task and the raw candidate rather than a
desired verdict, separately attacked imported-data validation and privacy,
atomicity/concurrency/profile separation, and help/evidence provenance with UI
truthfulness. None found a critical or high defect. The importer, the pure
SHA-256 (rechecked against `node:crypto` on 711 boundary inputs), bounds before
parsing, canonical/checksum enforcement, control-metadata exclusion, one-
transaction restore, readback exactness, slot/profile consistency and pending
exclusion held. Material findings were repaired and re-verified:

- A committed restore that changed before readback could have been described
  as "nothing restored". A pure, unit-tested mapping now reports success only
  from an exact readback, proves "nothing written" only from an aborted
  transaction, and otherwise states what is saved now. Browser cases now cover
  a lost commit report and a change between commit and readback.
- A failed restore closed the restoring window's open badge. Only a verified
  restore closes it now; restore is also blocked while a save is uncertain, the
  shell disables other controls while restoring, and the update lifecycle waits
  for a running restore.
- Compatibility now pins a digest of the exact policy values and evidence
  scopes; imported evidence IDs must have the app's synthetic UUID shape; rows
  are added natively rather than put; the restore transaction requests strict
  durability as a hint.
- Preview counts separate later confirmations from answers not counted; the
  help row reads "saved in the latest session"; practice states are labelled
  experimental and not a mastery measure; pending-answer, checksum, preview,
  restored and close-badge wording was corrected in all three drafts.
- The session-state finding is reconciled in the design: session ordinal,
  open state and saved help are learner history, not write authority.

## Run and owner walkthrough

From this repository, with the exact installed Node `24.21.0` and the
process-local Corepack settings in [development](DEVELOPMENT.md):

```powershell
$env:COREPACK_HOME = Join-Path (Get-Location) '.cache/corepack'
$env:COREPACK_DEFAULT_TO_LATEST = '0'
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
corepack pnpm install --frozen-lockfile
$env:NODE_ENV = 'production'
corepack pnpm exec vite build --config vite.slice.config.ts
corepack pnpm exec vite preview --config vite.slice.config.ts --host 127.0.0.1 --port 4187 --strictPort
```

In a second terminal, serve the same build as a separate place to restore into:

```powershell
corepack pnpm exec vite preview --config vite.slice.config.ts --host 127.0.0.1 --port 4188 --strictPort
```

Each loopback port is a separate browser storage origin. Neither touches the
existing review previews on 4178 or 4186; do not point these steps at them.

1. Open `http://127.0.0.1:4187/`. Choose Star, play a few answers, ask **Show
   me** on one; choose Triangle in another language and play a little.
2. Open **Grown-ups**, read **Keep this adventure**, then **Prepare a backup**.
   Check the per-badge summary, select **Save backup file** and confirm the file
   appears in your downloads.
3. Open `http://127.0.0.1:4188/` → **Grown-ups** → **Choose a backup file**.
   Read the preview, try **Cancel** (nothing changes), choose the file again
   and **Restore these badges**. Wait for "Restored and checked".
4. **Back to play**, choose each badge: its language, activity, saved help and
   history continue. Choosing the same file again at 4188 is refused because
   badges are now saved there, and nothing changes.

Stop each server with Ctrl+C. The downloaded file is synthetic review data;
keep it out of the repository and delete it when you no longer need it.
