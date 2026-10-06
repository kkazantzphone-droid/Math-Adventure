# Phase 3 readiness synthetic migration fixtures

These layouts are **invented synthetic rehearsals, never shipped database
schemas**. Math Adventure has no production learner database at the readiness
baseline `93db59893b076925b1fdb5fadfa5abb9dfb274ac`. Layout numbers 1/2/3 below
are fixture version probes, not a historical migration inventory.

[migration-plans.ts](migration-plans.ts) supplies a fixed source, independently
written expected target, bounded checkpoint and eleven failure/recovery plans.
Every profile/operation is visibly synthetic and every payload uses the existing
`synthetic-learner-v1` codec. The proposed transform only adds a record-schema
field; payloads, local revisions, global epoch and immutable receipt identities
remain unchanged. The old create receipt remains revision 1 while the current
profile is revision 3, deliberately catching receipt rewriting to current state.
The current first profile has one populated supported synthetic geometry
assessment with a nested concept/representation scope; the second has none.
Source, target and checkpoint spell that evidence independently, so dropping
observations or copying the wrong profile cannot hide behind empty arrays.

The checkpoint contains necessary synthetic payloads and migration identity;
it contains no epoch, receipt, fingerprint, source revision or active-session ID.
It cannot authorize restoration of deleted profiles. Future browser tests must
use live destination fencing and explicit restore/bootstrap, not checkpoint
control metadata.

The fixture consistency test checks exact codec validity, immutable receipts,
field preservation, checkpoint exclusions, future-version refusal plan and
rejection of a forbidden identifying field. It executes **no migration and no
IndexedDB API**, creates no database/file export and certifies no native storage,
quota, upgrade, browser/device crash, retention or physical-deletion behavior.

Follow the [persistence design](../../../docs/PHASE_3_PERSISTENCE_DESIGN.md) for
transaction scopes, recovery phases and the actual-adapter conformance matrix.
After separate 3A authorization, instantiate isolated fixtures only in ephemeral
browser contexts under the exact synthetic namespace. Native failure/restart
outcomes must be observed; scenario strings and mocked exceptions are not proof.
