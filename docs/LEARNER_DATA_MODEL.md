# Local learner data model

D49/D50/D51 [Phase 3C reconciliation](PHASE_3C_COMPLETION_REPORT.md) preserves the exact
bounded `phase3c-synthetic-loop-v1` aggregate and separate loopback-only namespace.
The same two fixed synthetic profiles display Star/Triangle badges in child view;
technical identities remain in developer inspection. No codec/schema, event cap,
raw-answer minimisation, atomic save/receipt, epoch/delete or recovery semantics
change. Manual activity may retain permitted completion/session/preferences but
adds no assessment observations or recommendation credit. Child shape recognition
sets the existing inaccessible-scope exclusion before preparation; saved retry
cannot upgrade it to full attribute classification. Mathematical help records its
maximum used tier even when visual stages replay. Five new families remain
`limitedEvidence`; Explore/Number Lab stays session-only. No real learner data,
retention/default-policy decision or storage-access expansion follows. Preserved
source-bound full/fresh and native54-per-product gates plus restored mutations pass.
D51 records bounded owner child UX confirmation on 2026-10-07:
**PHASE 3C PLAYABLE SYNTHETIC LOOP + CHILD UX — ENGINEERING/OWNER PASS**.
This accepts the eight-family presentation, direct answers, visual help,
badges/navigation and separate diagnostics without upgrading assessment scopes
or authorizing real-child use. Current documentation/full/fresh and independent
review precede narrowed feature publication. Both PR-specific exact-head CI checks
must succeed before the owner-merge handoff under `owner_merge`.
**FULL PHASE 3C DEVICE/AT CERTIFICATION — PENDING EXTERNAL EVIDENCE** remains
separate. Retained proof hashes/counts are synthetic engineering metadata, with
no raw learner aggregates or browser profiles.

Status: local-first policy accepted; numeric retention and production learner schema remain proposed. Phase 1C implements only generic integrity contracts and synthetic fixtures under [ADR-0010](adr/ADR-0010.md), with no real storage/adaptation. Records, migrations, retention and export/import below are fuller future requirements. [ADR-0003](adr/ADR-0003.md) and [privacy](CHILD_SAFETY_AND_PRIVACY.md) govern this model.

Before D49, [Phase 3B](PHASE_3B_COMPLETION_REPORT.md) added a pure, memory-only
synthetic adaptation candidate after owner-merged 3A. Its snapshot is **not** a
production learner record codec and was not yet connected to the IndexedDB
aggregate; the preserved Phase 3C aggregate described above supplies that bounded
synthetic integration. Two fixed
synthetic profile IDs, exact structured observations, independent concept summaries
and bounded retry receipts support engineering proof only. The 10/concept,
500/profile and 60-day evidence values remain experimental. Memory receipts refuse
new normal observations at 1,024 entries rather than silently pruning frozen retries;
this resource bound is not a production receipt-lifecycle or retention decision.
Exploration never enters these snapshots. Synthetic clock resolution and session
ordinals are explicit; no hidden platform time or automatic write queue exists.

Historical Phase 3 readiness specifies a [synthetic-only IndexedDB design](PHASE_3_PERSISTENCE_DESIGN.md)
and [staged implementation gates](PHASE_3_IMPLEMENTATION_PLAN.md). Raw IndexedDB
is the smallest proposed implementation, without a new dependency. No database
or production learner schema is implemented by readiness. The proposed
100-receipt/session-expiry rule below is not compatible with unchanged exact
retry semantics until an explicit retirement protocol exists; synthetic 3A
must refuse capacity overflow rather than prune retryable receipts. Numeric
retention/defaults remain human decisions before real-child use.

## Storage choice and records

The Phase 3A proposal uses raw IndexedDB through a small typed adapter with no
new dependency; the earlier provisional idb wrapper remains an alternative if
measured implementation evidence later justifies it. localStorage is synchronous
and string-based, unsuitable for transactional learner evidence. SQLite is a
possible future desktop adapter, not a server or browser requirement. IndexedDB
stores are logical partitions, not encrypted profiles or authentication.

| Record/store | Necessary content | Avoid |
| --- | --- | --- |
| metadata | schema version, migration state, app compatibility, revision | Identifying device metadata |
| profiles | opaque locally created ID, Player N/optional nickname, created coarse day | Real name requirement, birth date, email, sibling linkage |
| preferences | UI/instruction/number-speech locales, speech controls, accessibility choices | Browser fingerprint, diagnoses |
| conceptState | attained state/scope, support/revisit flags, reviewStage/nextReviewDay, promotion counts/version, last-offered/relevant coarse day | Global intelligence score |
| observations | bounded recent task evidence described in adaptive model | Clickstream, raw answers/voice, exact response time |
| progression | optional personal discoveries/cosmetics and reward event deduplication | Rank, monetary value, punishment |
| migrationStaging | verified transient recovery/staging records | Unbounded hidden duplicate history |

Profile settings and independent evidence never leak into another profile. A current-profile pointer is an application preference, not proof of identity. Use neutral defaults; optional nickname stays local, is length-limited plain text and never included in speech, URLs or diagnostics.

Concept state is shared by canonical ID and viewed across independent mathematical domains; no global math level or copied domain-level mastery record. Geometry/measurement/powers/roots have the same evidence/versioning contract as number concepts. Multi-domain task scopes cannot duplicate credit merely because a concept has several tags. ExploratoryExposure events in Number Lab/exploration are session-only and never persisted as formal mastery or a default exposure clickstream.

Bound exploratory session memory by declared scene/event limits, clear on session/profile change and exclude from export. Do not restore source safety epochs, operation receipts or active-session IDs from imports/checkpoints: regenerate local control metadata, preserve the destination deletion fence and enforce count/age retention before commit.

## Retention proposal

Retain the latest 10 eligible observations per concept, at most 500 per learner globally, and no observation older than 60 days. Apply the earliest bound; count only retained evidence when deriving recent recommendations. Preserve minimal attained-state summaries (counts, scope, policy/content version, coarse promotion day), not lifelong puzzle logs. Error-pattern tags are bounded counts in these same windows, not a separate permanent profile.

Proposed summary/profile purpose limit is 12 months without meaningful play, with local parent renewal/backup controls and notice when approaching expiry (from month 9 when the app is opened). At expiry, suspend adaptive use pending parent review and offer retain-for-an-explicit-new-period, export or delete; do not implement indefinite storage by accident. The **maximum review grace period and final automatic deletion behavior are an unresolved owner/legal decision** before real learner trials. Phase 1 synthetic fixtures may exercise candidate expiry policies, but must not ship a live ambiguous policy. No scheduled cloud deletion task exists.

Future recovery snapshots contain only necessary state, one migration checkpoint, removed after successful verified migration and at most 7 days otherwise. Deletion removes them immediately. This is a proposal requiring launch approval. Coarse device time is fallible: backward clock changes do not infer regression or bypass expiry indefinitely; flag uncertainty locally and offer parent resolution. Time fields support scheduling, not surveillance.

Expiry is checked on startup/access and before adaptation, migration, export or restore. Expired observations are immediately ineligible; purge expired evidence/checkpoints at the next executable transaction. A closed/suspended PWA cannot guarantee physical deletion at a wall-clock deadline. Document that limitation in the parent notice; no background/cloud timer is presumed. Never restore expired records from a checkpoint.

Browser best-effort storage can be evicted or cleared. Request persistent storage only with parent explanation; a grant does not ensure backup. Show transaction completion before “saved.” Storage estimates are advisory. Private mode/denial/quota errors require detection and an unsaved-session warning; browser data is not claimed cryptographically encrypted at rest.

## Atomicity, concurrency and migrations

Current Phase 1C proof uses record-local revisions, a global synthetic epoch and globally scoped operation IDs per epoch. Validation/epoch precede success-receipt deduplication, then expected revision. Explicit create starts revision 1; update cannot create. Delete advances the fence atomically and clears old receipts while preserving surviving records. Failed commands have no receipts; destructive retries require reconciliation. The fake retains synthetic receipts for its test lifetime, with no production pruning threshold. [Application ports](APPLICATION_PORTS.md) separates implemented semantics from the proposals below; no migration, full clear, profile-ID reuse or import policy is implemented.

Commit observation, concept transition, next recommendation metadata, progression and operation-ID receipt in one transaction. Check expected profile revision **inside the transaction** and reject stale writers. A tab lease or BroadcastChannel helps UX but is not the integrity check. Cap deduplication receipts consistently with supported retry lifetime; do not prune a receipt while its command may still retry. Proposal: 100 receipts/profile, retry commands expire at session end; if bound would evict an active receipt, reject/reconcile first.

Every command carries a boot/session storage epoch as well as expected profile revision; check both inside the transaction. Deletion atomically rotates the global epoch, removes the profile and invalidates all pending command sessions, then notifies other tabs to reload their own surviving state. New profiles use fresh IDs and an explicit create command; ordinary answer writes never create missing profiles. This avoids indefinite per-profile tombstone retention. Clear the deleted profile's records, observations, preferences, rewards, receipts, snapshots/staging and in-memory state.

Full local deletion erases all learner/preferences/recovery material and requested app-owned caches, while retaining only schema and a fresh non-identifying safety epoch to reject stale tabs; disclose this control metadata rather than claim every byte is erased. Quiesce clients and stop writes first; reject/retry cleanup if a client cannot acknowledge. Do not delete other same-origin applications' caches/stores. For complete origin-byte removal, parent guidance must close app clients and use browser site-data clearing; a new install then requires explicit bootstrap before writes. Browser/OS backups and manually exported files cannot be erased by the app. Test two-tab submit/delete/full-clear/reopen/restore and epoch rejection; no silent resurrection.

Persisted schema is a monotonic integer distinct from application, generator, pack and export versions. Each supported forward migration is deterministic, transactional where possible and tested against synthetic old data. Validate before committing. Blocked versionchange asks other tabs to close; it never deletes the database as a workaround. Do not combine destructive changes with an unverified new shell.

Before irreversible migration, prepare a bounded validated recovery checkpoint if quota permits; failure to create required recovery blocks migration. After commit, verify state and prune checkpoint under retention. If migration fails, leave the prior usable state or read-only recovery path; no silent reset. An old app encountering a newer incompatible schema refuses writes. Rollback of assets cannot downgrade data: use a compatible old release or a forward fix. Crash-durability hints do not justify guaranteed-save claims.

## Export/import — later feature, contract now

Parent-controlled local files only; no upload or cloud sync. Export is opt-in and clearly warns it contains private learner information. A versioned envelope contains formatVersion, schemaVersion, model/content/generator versions and validated records. Exclude incidental identifiers/logs; any inclusion of nicknames is previewed. A checksum detects accidental corruption, not authenticity or encryption.

Before import: enforce proposed 5 MiB byte limit, depth <=20, <=10 profiles, <=500 observations per profile, bounded strings and safe integer/rational types; exact schema rejects unknown dangerous structures, prototype keys, executable content and remote URLs. Limits are configurable review hypotheses. Reject unknown/future versions before modifying data. Stage -> migrate -> validate -> preview identity/conflict choice -> confirm in parent mode -> atomic commit. Default is a new remapped local identity, not merging siblings. Restore cannot bypass a deletion fence silently.

Reset progress and delete learner are distinct actions with a clear irreversible-action confirmation and export opportunity. Parent-mode access is a convenience gate; shared-device users/extensions can read local state. [Threat model](SECURITY_THREAT_MODEL.md) and [offline strategy](OFFLINE_AND_DISTRIBUTION.md) define surrounding risks.
