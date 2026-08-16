# ADR-004: Store immutable versioned policies with a mutable workspace activation binding

Status: Accepted

## Context

AnythingLLM workspaces currently hold mutable chat, provider, RAG, and agent
settings, but no Sentinel governance profile or deterministic structured policy.
The threat model identifies policy tampering, stale policy, workspace mismatch,
version confusion, malicious scope extraction, ambiguity, and model-generated
overbreadth as security-critical risks.

Raw scope documents are untrusted workspace content. They may contain prompt
injection and cannot become authorization rules merely because a parser or model
extracts structured-looking data.

### Threat-model drivers

`TM-002`, `TM-003`, `TM-005`, `TM-007`, `TM-010`, `TM-015`, `TM-017`, and
`TM-018`.

## Decision

Governance storage will use a **hybrid current binding plus immutable policy
versions** in dedicated Prisma-managed application-database tables:

1. Each workspace has one governance binding containing the active profile and
   a foreign key/reference to the currently active immutable policy version.
   Existing workspaces receive the validated `general` default during Phase 3.
2. Each policy version belongs to exactly one workspace and contains a
   monotonically increasing workspace-local version, policy schema version,
   profile, canonical validated structured policy, policy hash, source
   provenance/hash references, creation principal, creation time, and activation
   state metadata. Once activated, its authorization content is immutable.
3. Policy structure is stored as strictly schema-validated canonical JSON with
   selected relational columns/indexes for workspace, version, profile, state,
   and hash. Phase 3 may normalize additional fields only when query or integrity
   evidence justifies the complexity.
4. Raw uploaded scope text remains a document/source asset. Model-assisted or
   parser-extracted structure is stored as untrusted candidate data separate from
   active policy. It has no authorization effect until deterministic schema and
   semantic validation succeed and an authorized principal explicitly activates
   a new immutable version.
5. Ambiguous, malformed, overbroad-by-coercion, or workspace-mismatched candidate
   policies cannot be activated. Validation never silently broadens targets,
   schemes, ports, paths, or capabilities.
6. Activation is an explicit application-database transaction that verifies the
   workspace association, records the new version, changes the current binding,
   and appends the required audit outcome according to ADR-001. Policy content
   is never edited in place; changes create another version.
7. In multi-user mode, an authenticated admin or a manager with explicit
   workspace `POLICY_MANAGE` authorization may create/activate versions. Ordinary
   membership is insufficient. In single-user mode, the synthetic
   `instance_owner` from ADR-006 performs the action. API keys need explicit
   policy-management scope; schedules, agents, models, documents, and service
   principals cannot activate policy.
8. ADR-002 resolves the active version once for a governance decision and
   carries its ID/hash in the context. ADR-003 verifies that the workspace still
   points to that version immediately before a protected effect. A changed
   binding invalidates the earlier proposal.
9. Policy creation, validation failure, activation, replacement, and attempted
   unauthorized change are later audited using IDs, hashes, versions, and
   bounded metadata rather than raw sensitive scope documents.

## Alternatives considered

- Add profile and mutable JSON fields directly to `workspaces`.
- Use one mutable governance-profile table per workspace.
- Store policy only as an opaque JSON blob.
- Fully normalize every target, path, port, and capability into relational
  tables.
- Store policy in files.
- Use immutable versions plus a mutable workspace activation binding.

## Why rejected

- Direct mutable workspace fields cannot retain the exact historical policy
  used for an audit decision and increase conflicts in a high-churn upstream
  model.
- One mutable policy row creates stale-reference and forensic ambiguity.
- Opaque JSON without strict schema/canonicalization makes validation, stable
  hashing, migration, and inspection weaker.
- Full relational normalization before the target schema stabilizes creates
  excessive tables and migration/rebase cost; selected indexes plus canonical
  structured JSON preserve strictness with less churn.
- File-backed policy weakens workspace foreign-key association, transactional
  activation, queryability, migration, and backup consistency.
- The selected hybrid preserves current-state lookup and historical exactness.

## Security implications

Requests and audit events bind to an exact immutable policy version and hash.
Raw documents, extracted candidates, model output, and semantic classifier
results cannot directly change authority. Deterministic validation and explicit
activation are required, and deterministic denial remains final.

Authorized humans can still approve an overbroad but syntactically valid policy;
the UI and tests must make normalized scope inspectable. Policy-manager
authorization and audit-view authorization remain separate.

## Upgrade/rebase implications

Dedicated governance models and migrations avoid adding complex mutable JSON to
the upstream `workspaces` row. A narrow association to workspace identity is
required, plus dedicated endpoints/services and later frontend consumers.
Migration must backfill every existing workspace to `general` without changing
vanilla chat behavior. Upstream schema conflicts remain possible but are
localized.

## Testing implications

Phase 3 must test fresh and pinned-upstream upgrade migrations, default/backfill,
repeated startup, invalid profile, valid/invalid/ambiguous policy candidates,
malicious scope instructions, canonical hash stability, workspace mismatch,
cross-workspace version lookup, immutable activated rows, concurrent activation,
unauthorized user/API/service activation, active-version replacement, stale
context denial, general-profile regression, and audit expectations. Phase 6
adds prompt-injection, normalization, Unicode, and TOCTOU policy-change cases.

## Known limitations

- Strict schema validation cannot ensure a human intended every authorized
  target; inspectable activation remains necessary.
- Canonical JSON schema evolution requires explicit migration/version support.
- The exact normalized target schema is defined and tested in Phase 3B, not in
  this ADR.
- Policy storage does not itself enforce route or final-effect coverage; ADR-002
  and ADR-003 provide those boundaries.

## Implementation phases

Phases 3A-3C implement profile migration, structured parsing, versioned storage,
and deterministic evaluation. Phases 3D-3E integrate chat and the regression
corpus. Phase 7 exposes inspectable management UI, and Phase 8 hardens access.
