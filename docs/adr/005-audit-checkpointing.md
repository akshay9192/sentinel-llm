# ADR-005: Use chained HMAC-authenticated local checkpoints with a later external anchor

Status: Accepted

## Context

ADR-001 places the Sentinel event chain in the application SQLite database. A
hash chain detects record modification, deletion, insertion, and reordering when
the verifier has a trusted head, but a database writer can rewrite the complete
database and recompute an internally consistent chain.

Phase 2 needs a practical local checkpoint without introducing a cloud or paid
dependency. Phase 9 may later use GCP KMS or another approved external trust
service, but provisioning is prohibited before its explicit gate.

### Threat-model drivers

`TM-012`, `TM-013`, `TM-014`, `TM-015`, `TM-017`, `TM-020`, and `TM-021`.

## Decision

Phase 2F will implement **append-only, chained, HMAC-SHA-256-authenticated
checkpoint files outside the application SQLite database**, with the
authentication key stored separately from both the database and checkpoint
directory.

The checkpoint contract will include at least:

- checkpoint format/version;
- installation/chain identifier;
- latest audit sequence number and chain-head hash;
- creation timestamp;
- previous-checkpoint hash or authenticated predecessor reference;
- policy/audit schema compatibility metadata where needed; and
- HMAC algorithm/key identifier and authentication tag.

Implementation rules are:

1. Checkpoint bytes use a deterministic canonical representation. The HMAC tag
   covers every security-relevant field and excludes only itself.
2. Files are written through an atomic temporary-write/rename protocol with
   restrictive permissions. The checkpoint directory is a dedicated runtime
   storage location, not the repository and not `anythingllm.db`.
3. The HMAC key comes from an environment/secret source with restrictive access.
   It is never stored in the audit database, checkpoint payload, audit event,
   source, or ordinary logs. Key identifiers support deliberate rotation without
   silently accepting an unknown key.
4. Checkpoints form their own authenticated chain. Verification checks event
   chain integrity to the referenced sequence, HMAC validity, predecessor
   linkage, monotonic sequence, missing or stale state, and the relationship
   between the current database head and latest trusted checkpoint.
5. Missing, stale, malformed, rolled-back, or unverifiable checkpoint states are
   reported distinctly. They never produce a `VERIFIED` status. Checkpointing is
   periodic rather than part of every event append, but its due state is
   deterministic. Before authorizing another protected effect, the audit service
   must create any due checkpoint; failure places the service in
   `CHECKPOINT_DEGRADED` and denies protected execution until a valid current
   checkpoint exists. It cannot be mislabeled as successful anchoring.
6. Backup and restore include database, checkpoint history, and separately
   protected key procedure. Verification is mandatory after restore.
7. Phase 9 may add an external KMS signature or remotely retained chain-head
   anchor without changing the event-chain format. The external anchor becomes
   authoritative only after a separate approved cloud threat review and key/
   attestation design.

## Alternatives considered

- No checkpoint; rely only on the event hash chain.
- Store the checkpoint in the same SQLite database.
- Write an unsigned checkpoint file.
- Write an authenticated checkpoint file without predecessor linkage.
- Use a local HMAC-authenticated checkpoint chain now and add an external anchor
  later.
- Require a cloud KMS/transparency service immediately.

## Why rejected

- No checkpoint cannot expose a fully recomputed database when no prior trusted
  head is available.
- A checkpoint in the same database is rewritten with the chain and adds no
  independent evidence.
- An unsigned file can be replaced or recomputed by any checkpoint-file writer.
- Independent authenticated files without linkage make rollback/deletion harder
  to distinguish and weaken continuity evidence.
- Immediate cloud anchoring violates the local-first requirement and Phase 9
  provisioning gate and adds cost, identity, network, and availability
  dependencies before local validation.
- The selected hybrid gives useful local evidence while preserving a compatible
  path to stronger external anchoring.

## Security implications

Given an uncompromised HMAC key and at least one trusted checkpoint history, the
verifier can detect event-chain divergence and unauthorized checkpoint edits.
The authenticated checkpoint chain also makes internal gaps and predecessor
changes detectable.

This remains a bounded tamper-evident control and does not prevent all
tampering. If an attacker controls the database and all checkpoint files but not
the key, the attacker cannot forge new valid tags but may delete or roll back
files; freshness expectations and a trusted retained checkpoint are needed to
expose rollback. If the attacker also obtains the HMAC key, they can recompute
local checkpoints. Host-root or a fully compromised application process can
access local key material and is outside the strong local guarantee. Future
external anchoring reduces shared-host compromise risk but does not make the
system immutable.

## Upgrade/rebase implications

Checkpoint formatting, writing, verification, and key loading remain isolated
Sentinel modules and do not require changes to upstream event logging.
Application boot/health and later UI need small status integrations. The format
is versioned so a future KMS signature/anchor can coexist with local checkpoints
without rewriting historical events.

## Testing implications

Phase 2F must test canonical checkpoint bytes, valid/wrong key, modified field or
tag, wrong event head, wrong sequence, missing predecessor, reordered/deleted
checkpoint, stale checkpoint, truncated/recomputed database, atomic-write crash,
permission/disk failure, key rotation/unknown key ID, concurrent checkpoint
attempts, and restore verification. Phase 6 adds checkpoint unavailable and
process-crash fault cases. Phase 9 must separately test KMS/IAM/attestation allow
and deny paths before an external anchor is trusted.

## Known limitations

- A local HMAC key cannot withstand host-root or full process compromise.
- Deleting the newest database and checkpoint files may look like an older valid
  state unless a newer checkpoint is retained independently or externally.
- Checkpoints attest to recorded history, not the truth of a malicious event
  written by a compromised trusted application.
- Exact cadence, retention, key rotation procedure, and Phase 9 anchor are later
  operational decisions that must preserve this guarantee boundary.

## Implementation phases

Phase 2F implements and destructively tests the local checkpoint format. Phase
8 covers backup, restore, secrets, and operations. Phase 9 may add an explicitly
approved external KMS/attestation anchor.
