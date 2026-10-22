# Keep my adventure — local backup, restore and recovery

Owner Goal received 2026-10-22 (Europe/Athens), recorded as D57.
`merge_policy: automatic_when_eligible` under the unchanged effective V2 contract.
Implementation base: protected main `c362eaecbaca90b3ae01a5ae79ead335509e64a1`
(merged PR #17); fetched main and the initial checkout are identical and clean.
Branch: `codex/keep-my-adventure`.

## Commission and containment

Deliver parent-controlled local backup, preview, restore and recovery for the
existing saved synthetic mathematical world, demonstrated end to end in the real
served interface. The Goal authorizes the feature and its supporting source, UI,
tests and documentation inside the explicit loopback synthetic capability. It
does not authorize real-child data or trials, ordinary-product learner
persistence, accepted retention/deletion policy, new adaptation thresholds or
evidence interpretations, new activities or content limits, remote storage,
sync, telemetry, accounts, official pack promotion, release, deployment,
repository-protection changes or destructive treatment of owner data.

Accepted requirements come from [ADR-0003](adr/ADR-0003.md),
[ADR-0010](adr/ADR-0010.md), the [learner data model](LEARNER_DATA_MODEL.md),
[persistence design](PHASE_3_PERSISTENCE_DESIGN.md), the
[threat model](SECURITY_THREAT_MODEL.md) and [privacy](CHILD_SAFETY_AND_PRIVACY.md).
Proposed numerical retention (10/concept, 500/learner, 60 days, inactivity
expiry, checkpoint lifetime) and the proposed 5 MiB / 10-profile import limits
remain proposals: none is implemented here. The parser bounds below are
engineering resource limits for this synthetic contract, not retention policy.

## What a backup means

A backup is one parent-saved local file describing the settled saved state of
the two fixed synthetic badges in one browser origin. It is created only from a
consistent read-only native snapshot of the owned database, never from
unsaved in-memory play.

| Portable and preserved exactly                                                                                   | Why it is portable                                              |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Payload schema (`phase3c-synthetic-loop-v1` legacy or `growing-world-synthetic-loop-v2`) and `synthetic-only`    | Legacy and growing-world meanings stay distinct; no upgrade     |
| Fixed badge slot (`SYNTHETIC-PLAYER-1` Star, `SYNTHETIC-PLAYER-2` Triangle)                                      | Part of deterministic task-seed derivation; profiles stay apart |
| UI, instruction and number-speech locale roles                                                                   | Independent learner preferences                                 |
| Guided practice / Just play mode, selected activity, task ordinal, completed count                               | Continue at the same next replay task                           |
| Session ordinal and whether the session is open                                                                  | Session distinctness is evidence meaning                        |
| Legacy observation/checkpoint journal and chapter observation journal, including IDs, hint tiers and attempts    | Independent, supported and worked provenance                    |
| Saved current-session mathematical support context                                                               | A worked/helped task cannot become independent after restore    |

| Excluded or reconstructed           | Treatment and rationale                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revision, storage epoch, receipts   | Destination control metadata. Restore uses explicit creates at revision 1 under the **current destination** epoch with fresh destination operation IDs and receipts. Source values are never authority for new writes.                                        |
| `pending` (an answer still saving)  | Excluded. The exported profile is its last settled state (staging only adds `pending`). The file cannot represent pending work, so nothing is replayed as a new success. The source keeps its own pending answer for its existing retry/reconciliation path. |
| `lastCompletion`                    | Excluded and restored as `null`. It is immediate feedback plus a source operation ID used for same-page retry reconciliation; its evidence remains in the journals.                                                                                            |
| `derived` adaptation state          | Excluded and reconstructed by the unchanged pure engine from the journal under the declared policy/catalog versions, then checked by the existing record codec. Tests require equality with the source's stored derived state.                                |
| Explore workshop, Number Lab, session-only completions | Never persisted, therefore never exported. Imported files cannot carry unknown fields.                                                                                                                                                         |

Observation and chapter-observation IDs embed the source answer's random
operation token. They are preserved as profile-internal evidence identities and
are never presented as destination repository operation IDs or receipts.

The envelope is canonical JSON (`canonical-json-v1` key order and number
spelling) with `format: math-adventure-synthetic-backup`, `formatVersion: 1`,
`synthetic: true`, an exact compatibility block and a SHA-256 checksum over
the canonical envelope without its checksum. The compatibility block names the
record schemas, adaptation policy, evidence catalog, invitation policy, content
versions, all fourteen generator IDs, RNG, task-seed and canonicalization
versions. Import requires exact equality; a mismatch is refused as incompatible
rather than reinterpreted. The checksum detects accidental damage only. It is
not authentication, encryption or proof of authorship: anyone who edits a file
can recompute it. Files carry no clock time, device, browser or origin data.

## Untrusted import

All validation completes before any destination mutation:

1. Reject files over 1 MiB before reading (`File.size`), then check text length
   and UTF-8 size again. Pre-scan bracket depth (maximum 32) before `JSON.parse`.
2. Require a JSON object with the exact format name; a larger safe-integer
   `formatVersion` is `newer_version`, anything else is `not_backup`. A text
   that starts like a backup but no longer parses is `damaged`.
3. Require the exact key set, exact canonical spelling (rejects whitespace,
   duplicate keys, reordered keys and numeric tokens `JSON.parse` would round),
   then the checksum (`damaged`).
4. Require the exact compatibility block (`incompatible`).
5. Validate one or two profiles: distinct fixed slots, exact portable keys only,
   then reconstruct `derived`, `pending: null`, `lastCompletion: null` and require
   the unchanged record codec plus canonical round trip (`invalid_contents`).

Bounds reuse the plain-data readers (no accessors, prototypes or symbols) and
canonical per-record limits. Stable codes reach the UI; exception text and file
contents never do.

## Restore contract

The initial contract supports only a destination with **no saved badges**: a
browser/origin that never saved, or one whose badges were all deleted. A
nonempty destination is refused and left byte-for-byte unchanged; there is no
overwrite, merge, combination or sibling remapping. Restore keeps each badge in
its own fixed slot because the slot participates in task-seed derivation. This
is forced by the accepted fixed-profile synthetic capability; fresh opaque IDs
and remapping for an ordinary product remain future real-persistence design.

Preview parses and validates in memory and probes the destination read-only (a
non-bootstrap open aborts before creating an absent database). Cancel discards
the in-memory plan. Confirm creates the owned database only if absent (explicit
bootstrap), then one native `readwrite` transaction over every store, in order:

1. validate control/ready state and compare the planned destination epoch;
   a deletion or full clear after preview yields `epoch_conflict`;
2. look up every restore operation ID: all present with identical fingerprints
   is an exact retry returning original receipts; any partial/mismatched match
   is `operation_conflict`;
3. require zero records and an absent target for every slot
   (`record_already_exists`), then check receipt capacity;
4. write every record at revision 1 and its create receipt together; resolve
   only on transaction completion; abort or quota leaves every store unchanged.

Success is shown only after a separate read-only readback confirms the epoch,
each record's exact payload, revision and receipt. An ambiguous outcome is
reconciled by readback: an exact match is reported as restored and checked; an
empty destination remains restorable with the same idempotent plan; any other
state is reported without overwriting. Restore closes the badge open in the
restoring window and is blocked while that window is saving or an update is in
progress. It never resets or deletes a database to recover.

## Experience

The Grown-ups view gains a Keep this adventure panel; the child navigation is
unchanged. Plain-language draft copy in el-GR, en-GB and de-DE explains what is
and is not inside, that the file is a private copy outside the app's control,
that a started download is not proof of safe storage and that app deletion
cannot erase exported copies. States: preparing, ready to save, save requested,
nothing saved yet, checking file, preview, restoring, checking restore,
restored and checked, refused and uncertain. Browser saving, the external
backup file, cached offline operation and optional offline speech remain
distinct statements. The fourteen activities and answer controls are unchanged.

## Acceptance evidence

Required: pure contract tests with an independent SHA-256/canonical oracle and
malformed/fuzzed inputs; installed Chrome and Edge journeys exporting an actual
downloaded file from two distinct synthetic profiles (legacy and growing world,
different languages/activities, independent and supported/worked answers,
accomplishments) and importing it into fresh disposable destinations, reopening
and continuing; independent before/after portable-meaning comparison from raw
native rows; negative paths for corrupt, truncated, malformed, future, incompatible,
oversized/deep, cancelled, repeated, nonempty, injected and native-quota,
abort, concurrent-tab, deletion-during-restore, pending and provenance cases;
root/subpath and browser-controlled offline checks; three-language keyboard,
200% text and 320px review; restored meaningful mutations; full/fresh gates,
audit, artifact/privacy review, independent review and exact-head hosted checks.
Owner UX acceptance and any real household use remain separate decisions.
