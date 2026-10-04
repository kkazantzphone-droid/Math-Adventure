# Local learner data model

Status: local-first policy accepted; numeric retention and implementation mechanics proposed. [ADR-0003](adr/ADR-0003.md) and [privacy](CHILD_SAFETY_AND_PRIVACY.md) govern this model.

## Storage choice and records

Use IndexedDB through a small typed adapter, provisionally idb. Raw IndexedDB is a viable fallback; localStorage is synchronous/string-based and unsuitable for transactional learner evidence. SQLite is a possible future desktop adapter, not a server or a browser requirement. IndexedDB stores are logically partitioned, not encrypted profiles or authentication.

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

Commit observation, concept transition, next recommendation metadata, progression and operation-ID receipt in one transaction. Check expected profile revision **inside the transaction** and reject stale writers. A tab lease or BroadcastChannel helps UX but is not the integrity check. Cap deduplication receipts consistently with supported retry lifetime; do not prune a receipt while its command may still retry. Proposal: 100 receipts/profile, retry commands expire at session end; if bound would evict an active receipt, reject/reconcile first.

Every command carries a boot/session storage epoch as well as expected profile revision; check both inside the transaction. Deletion atomically rotates the global epoch, removes the profile and invalidates all pending command sessions, then notifies other tabs to reload their own surviving state. New profiles use fresh IDs and an explicit create command; ordinary answer writes never create missing profiles. This avoids indefinite per-profile tombstone retention. Clear the deleted profile's records, observations, preferences, rewards, receipts, snapshots/staging and in-memory state.

Full local deletion erases all learner/preferences/recovery material and requested app-owned caches, while retaining only schema and a fresh non-identifying safety epoch to reject stale tabs; disclose this control metadata rather than claim every byte is erased. Quiesce clients and stop writes first; reject/retry cleanup if a client cannot acknowledge. Do not delete other same-origin applications' caches/stores. For complete origin-byte removal, parent guidance must close app clients and use browser site-data clearing; a new install then requires explicit bootstrap before writes. Browser/OS backups and manually exported files cannot be erased by the app. Test two-tab submit/delete/full-clear/reopen/restore and epoch rejection; no silent resurrection.

Persisted schema is a monotonic integer distinct from application, generator, pack and export versions. Each supported forward migration is deterministic, transactional where possible and tested against synthetic old data. Validate before committing. Blocked versionchange asks other tabs to close; it never deletes the database as a workaround. Do not combine destructive changes with an unverified new shell.

Before irreversible migration, prepare a bounded validated recovery checkpoint if quota permits; failure to create required recovery blocks migration. After commit, verify state and prune checkpoint under retention. If migration fails, leave the prior usable state or read-only recovery path; no silent reset. An old app encountering a newer incompatible schema refuses writes. Rollback of assets cannot downgrade data: use a compatible old release or a forward fix. Crash-durability hints do not justify guaranteed-save claims.

## Export/import — later feature, contract now

Parent-controlled local files only; no upload or cloud sync. Export is opt-in and clearly warns it contains private learner information. A versioned envelope contains formatVersion, schemaVersion, model/content/generator versions and validated records. Exclude incidental identifiers/logs; any inclusion of nicknames is previewed. A checksum detects accidental corruption, not authenticity or encryption.

Before import: enforce proposed 5 MiB byte limit, depth <=20, <=10 profiles, <=500 observations per profile, bounded strings and safe integer/rational types; exact schema rejects unknown dangerous structures, prototype keys, executable content and remote URLs. Limits are configurable review hypotheses. Reject unknown/future versions before modifying data. Stage -> migrate -> validate -> preview identity/conflict choice -> confirm in parent mode -> atomic commit. Default is a new remapped local identity, not merging siblings. Restore cannot bypass a deletion fence silently.

Reset progress and delete learner are distinct actions with a clear irreversible-action confirmation and export opportunity. Parent-mode access is a convenience gate; shared-device users/extensions can read local state. [Threat model](SECURITY_THREAT_MODEL.md) and [offline strategy](OFFLINE_AND_DISTRIBUTION.md) define surrounding risks.
