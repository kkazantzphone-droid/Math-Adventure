# Keep my adventure — completion evidence

2026-10-22, Europe/Athens. **Engineering evidence PASS** for the bounded
synthetic backup, restore and recovery delivery. Owner UX acceptance and any real
household saved use remain separate decisions. The live
[PR #18](https://github.com/kkazantzphone-droid/Math-Adventure/pull/18) record
holds the final head's own local/fresh and hosted checks and merge observations;
this report does not infer them from an earlier head.

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

A fourth fresh reviewer then checked every repair. All were closed; it found
one new low-severity race (a successful "Check again" during an update reopen
could leave the window frozen) and small gaps. The readback check now registers
as restore work so reopen waits, a fenced window stays frozen after a verified
restore, a lost commit report is modelled as an unknown outcome, profile and
delete controls are disabled while restoring, an unexpected rejection is shown
as uncertain, the blocked message covers a save that needs checking, and a
browser proof keeps an unsaved badge open through failed restores. Two more
mutants cover badge-close timing and a commit followed by a difference.

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

## Evidence

**Contract and unit proof.** 23 new tests in two files. An independent canonical
spelling and `node:crypto` SHA-256 oracle (FIPS vectors plus 1,500 generated
Unicode strings) checks the file; 2,000 generated single-character changes are
all refused; future, incompatible, extra-field, free-text-ID, oversized and deep
inputs give their stable codes; exclusions, exact reconstruction, legacy and
stranded pending answers, confirmations and repeats, saved-help provenance,
restore plans and the outcome mapping table are asserted. Scripted fixture
expectations are stated from the documented rules, not production code.

**Installed browsers.** Each run uses disposable loopback origins and fresh
contexts; raw IndexedDB rows are read by test-only code. Against the
`NODE_ENV=production` slice (`assets/index-BA9z_BbK.js`, SHA-256
`7a3b77a2f477c0baef66141e905d09db90a4a5426cf5425025e45e4f6835cdac`) all nine
cases pass in Chrome 155.0.8059.84 and Edge 155.0.4283.62 with no external
request or page error ([Chrome](evidence/keep-my-adventure/browser-production-chrome.json),
[Edge](evidence/keep-my-adventure/browser-production-msedge.json)):

- Two badges built through the real child surface (Star: Greek, guided,
  original then growing world, independent, helped, retried and worked answers,
  two sessions, open worked-help context; Triangle: German, original activities
  only, an unsuccessful first try, stopped) export an actual download of 9,342
  bytes. Source revisions 30 and 14 with 44 receipts become revisions 1 and 1
  with two fresh restore receipts in a fresh origin served at
  `/math-adventure/`. Portable meaning and rebuilt derived state equal the
  source exactly; preview and Cancel create no database.
- Reopening continues Star in Greek on the same task with worked help still
  applied (the answer is recorded as worked, not independent) and Triangle in
  German, still a legacy payload; the source world is unchanged.
- Corrupted, truncated, malformed, unrelated, future, incompatible, extra-field,
  deeply nested and oversized files are refused without creating storage.
- A repeated import and a destination with one badge are refused byte-for-byte.
- Injected abort, injected quota, a native request error and a controlled native
  `QuotaExceededError` (CDP quota override after relaunching a throwaway
  persistent profile) leave no records or receipts; the same file then restores.
- A create after preview is refused as occupied; a deletion while confirmation
  waits is fenced (`changed`); a stale pre-deletion writer gets `epoch_conflict`
  and cannot overwrite restored rows.
- A lost commit report is still "restored" by exact readback; a change between
  commit and readback is reported as `differs` with restored rows present.
- An answer still being saved is excluded and never replayed; the source keeps it.
- Backup and restore work in browser-controlled offline mode after the shell is
  cached, at root and subpath.
- Keyboard-only file choice, preview focus, restore and save, at 320 CSS px with
  32px root text in el-GR, en-GB and de-DE: no overflow, targets at least 44px,
  contrast 11.8–14.8:1. Long Greek/German words wider than one line (20 and 21;
  the file name in English) split because this Windows browser does not
  hyphenate them; nothing is clipped.

The complete installed-browser slice regression passes 154 tests in seven files
in each browser ([matrix](evidence/keep-my-adventure/browser-matrix.json)). The
existing Phase 3C guard now forbids text inputs everywhere and any file input
outside the Grown-ups backup panel, which must hold exactly one JSON chooser.

**Restored mutations.** Fifteen plausible defects in the critical paths are each
detected by assertions and exact bytes restored: skipped checksum, pending
replayed as a completed success, accepted incompatible provenance, supported
answers previewed as independent, wrong destination epoch, free-text evidence
IDs, miscounted confirmations, success claimed without readback, a commit
followed by a difference reported as nothing restored, a badge closed before
the restore is verified, a probe that creates storage, an ignored deletion fence, overwriting a nonempty destination,
a swallowed abort and a readback that accepts any rows
([receipt](evidence/keep-my-adventure/mutations-chrome.json)).

**Repository gates.** Source checkpoint `e0d0a44` passed `corepack pnpm verify`
(1,460 tests in 80 files) locally and in an isolated fresh clone after a frozen
install, with the lockfile unchanged. Its audit then reported six newly published
advisories, all in the dev-only Vite 8.3.2 server. The exact patch pin to Vite
8.3.3 changes only Vite's lock entry and integrity, clears all six (zero
advisories, 204 graph entries) and leaves the ordinary product build, the
production slice build and the test-renderer build byte-identical; the backup
suite passes again on it. At that head, `c918c24`, the canonical gate passes
locally and in an isolated fresh clone (1,460 tests in 80 files) with a clean
tree and unchanged lockfile. After the repair-verification follow-ups (`3417768`),
the production and full browser runs above were repeated and pass, and the
ordinary product build still equals the D56 inventory. The final head's own
local, fresh and hosted results are recorded on PR #18. The ordinary product build still equals the recorded
D56 inventory, so it contains none of this capability. Gate details are in the
[repository receipt](evidence/keep-my-adventure/repository-gates.json) and
[audit receipt](evidence/keep-my-adventure/dependency-audit.json).

## Limits and remaining real-use decisions

- Desktop Windows Chrome and Edge only. Offline evidence is browser-controlled,
  not physical disconnection; doubled text is root sizing, not native zoom;
  no screen-reader delivery was observed. Native quota used a controlled engine
  override, not natural exhaustion.
- Greek and German remain drafts pending native review, including where long
  words split at extreme sizes.
- The checksum is not authentication; anyone may edit and re-checksum a file.
  Evidence IDs link copies of one world. Exported files are private and outlive
  app deletion; the app cannot erase them.
- Restore supports only a destination with no saved badges and keeps fixed
  synthetic slots. Ordinary-product export, identity remapping, merge or
  overwrite policy, domain migration, eviction/cleared-storage response,
  retention and real household use remain the open decisions listed in the
  [owner brief](CLEAR_ANSWERS_OWNER_DECISIONS.md). Nothing here accepts them.
