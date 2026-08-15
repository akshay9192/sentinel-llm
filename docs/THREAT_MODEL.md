# Sentinel LLM Threat Model

## 1. Scope

This Phase 1B threat model applies to Sentinel LLM built on the pinned
AnythingLLM `v1.15.0` baseline at
`70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`. It is grounded in
[`CODEBASE_NOTES.md`](./CODEBASE_NOTES.md) and security-critical source paths
rechecked during Phase 1B.

**OBSERVED:** the current baseline supplies chat, RAG, ingestion, users,
workspaces, agents, tools, flows, MCP, scheduled jobs, and operational logging.
Sentinel governance, deterministic execution authorization, mandatory security
audit, OpenClaw integration, and cloud deployment are not implemented.

This document defines assets, actors, boundaries, abuse cases, required security
properties, explicit limits, and inputs to Phase 1C. It does not select a design
or change runtime behavior.

## 2. Baseline and architecture assumptions

- **OBSERVED:** browser chat commonly enters
  `server/utils/chats/stream.js#streamChatWithWorkspace`, but developer API,
  OpenAI-compatible, Telegram, embed, connector, and post-WebSocket agent paths
  are separate.
- **OBSERVED:** `server/utils/agents/aibitat/index.js#handleExecution` and
  `#handleAsyncExecution` call `fn.handler(args)` and form a partial
  model-to-plugin dispatcher.
- **OBSERVED:** this dispatcher is not the final effect boundary for inner flow
  nodes, MCP servers, imported JavaScript, or built-in handlers, and direct
  HTTP/UI mutations bypass it.
- **OBSERVED:** browser multi-user requests can carry a user row and workspace
  membership; developer API and scheduled execution do not carry equivalent
  effective-principal context.
- **OBSERVED:** SQLite, LanceDB, filesystem, collector, process, and external
  network effects do not share one transaction.
- **ASSUMPTION:** later Sentinel phases preserve the pinned upstream foundation
  through small isolated hooks and dedicated Sentinel modules.
- **ASSUMPTION:** `llama3.2:3b`, `qwen3:8b`, and
  `nomic-embed-text:latest` remain local role defaults, but every model result is
  untrusted.

## 3. Security objectives and guarantee boundary

Sentinel is intended to provide these bounded properties for paths explicitly
placed under governance:

1. A model proposal never constitutes permission to cause a side effect.
2. An effective actor, workspace, policy version, and correlation context are
   resolved before a protected decision.
3. Protected actions follow schema validation, normalization, deterministic
   capability authorization, deterministic target authorization, deterministic
   parameter authorization, mandatory authorization audit, restricted
   execution, and outcome audit.
4. Deterministic denial is final. Semantic classification may add a denial
   signal and cannot convert a deterministic denial into permission.
5. Governance, actor resolution, normalization, authorization, and mandatory
   audit failures deny protected execution.
6. Covered workspace policy is applied consistently across browser, API,
   connector, agent, flow, MCP, and scheduled adapters.
7. Audit history is tamper-evident within explicitly documented key, checkpoint,
   host, and storage assumptions.
8. Secrets and sensitive content are minimized and redacted in prompts, logs,
   errors, tool traffic, and audit records.

These objectives do not assert that current AnythingLLM behavior already
provides them.

## 4. Assets

CIA values use High (H), Medium (M), or Low (L). The access column identifies
expected or current access, not permission granted by this document.

| Asset                                                                    | Owner/location                                              | Sensitivity                                       | C/I/A | Actors with access                            | Security relevance                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------- | ----- | --------------------------------------------- | ------------------------------------------------------- |
| Uploaded, parsed, pinned, and scope documents                            | Workspace; document storage, collector, Prisma, LanceDB     | May contain private data and hostile instructions | H/H/M | Members, admins, collector, server, models    | Content and provenance must not become authority        |
| Structured governance policy and profile                                 | Workspace; future Sentinel persistence                      | Security-critical rules                           | H/H/H | Authorized policy managers and policy service | Tampering or stale resolution changes permission        |
| Chats, threads, attachments, and citations                               | Workspace; Prisma and frontend                              | User/private model context                        | H/H/M | Members, server, models                       | Leakage, poisoning, and incorrect attribution           |
| Workspace configuration and membership                                   | Prisma `workspaces`, `workspace_users`                      | Authorization-critical                            | H/H/H | Admin, manager, assigned users, server        | Determines resource scope and provider behavior         |
| User identities, roles, sessions, recovery data                          | Prisma, JWT/session handling                                | Authentication data                               | H/H/H | User, admins, auth middleware                 | Basis for human actor resolution                        |
| Developer API tokens and key records                                     | Prisma `api_keys`, callers                                  | Bearer credentials                                | H/H/H | Admin, client, middleware                     | Current global authority lacks durable actor context    |
| Agent invocation and tool-call state                                     | Prisma invocation row, AIbitat memory/events                | Delegated execution context                       | H/H/M | Initiator, server, agent                      | Must bind initiator, workspace, policy, and attempt     |
| Agent flows, imported skills, MCP configuration                          | File-backed server storage                                  | Executable/configuration data and credentials     | H/H/H | Admin, server, subprocess/remote MCP          | Can expand into nested effects or arbitrary code        |
| Scheduled jobs and runs                                                  | Prisma and worker process                                   | Unattended executable intent                      | H/H/H | Single-user operator, scheduler, worker       | Current owner/workspace semantics are absent            |
| Execution credentials                                                    | Environment, system settings, plugin/MCP/integration config | High-value secrets                                | H/H/H | Server, selected adapters/tools               | May authorize external data access and mutations        |
| Future audit events, sequence, hashes, checkpoints, verification results | Future Sentinel persistence and checkpoint store            | Forensic/security record                          | H/H/H | Audit writer/verifier, scoped viewers         | Deletion, rewrite, fork, rollback, and leakage risks    |
| SQLite application database                                              | `server/storage/anythingllm.db`                             | Most app state                                    | H/H/H | Server process, administrators, host actors   | Same-store mutation/audit atomicity may be possible     |
| LanceDB/vector data and namespaces                                       | Server storage                                              | Derived private content                           | H/H/M | Server/vector adapter                         | Cross-workspace retrieval and cross-store consistency   |
| Host and application filesystems                                         | Host/container and storage roots                            | Code, state, credentials, outputs                 | H/H/H | OS/admin, server, collector, subprocesses     | Escape can compromise all application guarantees        |
| Ollama models and service                                                | Local model store/service                                   | Prompts, responses, model artifacts               | H/H/H | AnythingLLM, local callers, host operator     | Local placement does not establish model trust          |
| Collector/parser service and temporary files                             | Collector process/storage                                   | Raw hostile content                               | H/H/M | Server, collector, parsers                    | Parser compromise and resource exhaustion boundary      |
| Generated files and external integration data                            | Output storage and external systems                         | User and third-party data                         | H/H/M | Tools, users, external accounts               | Wrong target/parameters can create irreversible effects |
| Future OpenClaw runtime and skills                                       | Future restricted runtime                                   | Executable capability and credentials             | H/H/H | Sentinel executor, OpenClaw, skills           | Must be treated as a separate constrained boundary      |
| Future cloud credentials, Terraform state, KMS keys                      | Future Phase 9 GCP boundary                                 | Infrastructure/root trust material                | H/H/H | Deployment principals and cloud services      | Compromise can invalidate deployment guarantees         |

## 5. Actors

| Actor                                     | Identity/authentication                                | Authorization/workspace context                                | Credentials/effects                                  | Trust and spoofing/propagation risk                                  |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| Single-user operator                      | Optional configured auth token; no user row required   | Instance-wide; flexible role gates bypass in single-user mode  | Global configuration and all available effects       | Privileged human; attribution may collapse to instance actor         |
| Multi-user administrator                  | JWT decoded to current `users.id`, role `admin`        | Global and workspace operations                                | Settings, users, keys, executable integrations       | Highly privileged; session theft/replay remains relevant             |
| Multi-user manager                        | JWT and role `manager`                                 | Broad workspace management plus route-specific checks          | Workspace/configuration effects                      | Privileged; manager/admin parity must be tested per route            |
| Ordinary authenticated user               | JWT to current non-suspended user                      | Assigned workspace membership and route gates                  | Chat, documents, delegated agents                    | Partially trusted; may be malicious or compromised                   |
| Malicious workspace member                | Same identity as ordinary user                         | Legitimate access to one or more workspaces                    | Poisoning, probing, delegated effects                | Authenticated but adversarial; must not cross boundaries             |
| Developer API client                      | Possession of global API secret                        | Current middleware retains no key row, creator, or scoped user | Global API and workspace-selected operations         | Ambiguous principal; secret theft/replay can impersonate client      |
| Interactive delegated agent               | Invocation UUID; context reconstructed from invocation | Optional user/thread, required workspace                       | Model-selected tools                                 | Model is untrusted; initiator identity may not survive final effect  |
| Ephemeral API agent                       | API route plus ephemeral UUID                          | Caller-selected workspace; user is null                        | Same AIbitat tool families                           | Delegated principal is ambiguous                                     |
| Scheduled/system execution                | Job/run IDs, worker launch                             | No persisted human/workspace owner in observed schema          | Selected tools with automatic approval               | High-risk unattended actor; creator and current policy unknown       |
| MCP server/tool                           | Configured server and tool name; stdio/SSE/HTTP        | Inherits hosting agent only at wrapper                         | Process/network/remote effects and tool results      | Partially trusted or hostile; schemas/results can lie                |
| Imported/custom skill                     | File-backed config and required `handler.js`           | Enabled by admin, then exposed to agent                        | Server-process filesystem/network/process capability | Executable code must be treated as hostile unless explicitly trusted |
| Agent flow                                | Stored flow identifier and variables                   | Exposed as outer agent tool                                    | Inner HTTP/scrape/model nodes                        | Stored executable plan; inner effects bypass outer dispatch          |
| Collector/background service              | Signed service request or internal worker launch       | Service-level task context                                     | Parsing, files, scheduled work                       | Privileged component; content remains untrusted                      |
| Prompt-injected model                     | Model response influenced by hostile context           | No legitimate authorization identity                           | Proposals, targets, parameters                       | Untrusted; may hallucinate or escalate                               |
| Malicious document/retrieved/tool content | Data, not an authenticated principal                   | None                                                           | Influences prompts and future proposals              | Fully untrusted, including local content                             |
| External attacker                         | Network/local access dependent on deployment           | None unless control is bypassed                                | Credential theft, endpoint abuse, DoS                | Untrusted                                                            |
| Attacker with audit DB write              | Direct storage access                                  | Outside application auth                                       | Rewrite event state                                  | Defeats an unanchored local-only chain by recomputation              |
| Attacker with local filesystem access     | Host/file permission                                   | Outside application auth                                       | Code/config/checkpoint/state modification            | Can undermine multiple stores and executable extensions              |
| Attacker with host root                   | OS root                                                | Controls application TCB                                       | All process, memory, storage, network                | Explicitly outside the full guarantee boundary                       |
| Compromised dependency/build input        | Runs in install/build/runtime context                  | Supply-chain position                                          | Code, secrets, artifacts                             | May compromise the TCB before runtime controls execute               |
| Future compromised OpenClaw skill         | Future skill/runtime identity                          | Must be capability constrained                                 | Network/filesystem/process effects                   | Untrusted executable component                                       |

Current identity propagation is materially different by actor:

| Actor                                        | Does identity currently survive into execution/audit?                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-user operator                         | No user row is required; durable attribution is only the instance context and subsystem records                                                   |
| Multi-user administrator/manager/user/member | User ID survives mapped browser middleware, workspace/chat rows, and some event metadata, but not every downstream tool or external effect        |
| Developer API client                         | No; middleware discards the key row and creator, and caller-supplied API session ID is not an authenticated principal                             |
| Interactive delegated agent                  | Partially; invocation can retain user/workspace/thread, but nested effect handlers and outcomes do not share a universal actor/correlation record |
| Ephemeral API agent                          | No human user survives; API-key actor is already ambiguous                                                                                        |
| Scheduled/system execution                   | Job/run identity survives in scheduled records; no human/workspace owner survives because none is persisted                                       |
| MCP server/tool                              | Server/tool identity exists at the wrapper; remote internal actor and nested effects are not represented in application audit                     |
| Imported/custom skill                        | Plugin identity is loadable, but arbitrary nested effects lack a universal durable actor binding                                                  |
| Agent flow                                   | Flow identity survives the outer wrapper; individual inner-node effects lack a universal durable actor binding                                    |
| Collector/background service                 | Service/job context exists in subsystem calls; a universal principal/correlation record does not                                                  |
| Model and malicious content actors           | They are untrusted influence/provenance, not authenticatable principals; later audit must record their role without treating them as authority    |
| External/local/DB/filesystem/root attackers  | No legitimate application identity; detection depends on route, storage, checkpoint, OS, and forensic controls                                    |
| Compromised dependency/build input           | Package/workflow/artifact provenance may exist, but runtime actions normally inherit the compromised process identity                             |
| Future OpenClaw skill                        | Not implemented; future propagation must bind registered skill, delegated actor, capability, workspace, policy, and attempt                       |

**REQUIRED:** audit and authorization must preserve both the initiating principal
and delegated execution identity. A nullable `user_id` alone is insufficient.

## 6. Trusted computing base

| Component                                                       | Classification                        | Reason                                                                     |
| --------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| AnythingLLM server and future Sentinel policy/audit code        | Trusted                               | Enforces covered authentication, authorization, and audit contracts        |
| Prisma/SQLite and cryptographic implementation                  | Trusted                               | Persists decisions and integrity metadata within stated host assumptions   |
| Node runtime, OS, filesystem permissions, selected dependencies | Trusted                               | Compromise can alter enforcement code or secrets                           |
| Collector and Ollama                                            | Partially trusted                     | Privileged services consuming hostile input/model artifacts                |
| LanceDB                                                         | Partially trusted                     | Stores derived untrusted content; namespace isolation is security-relevant |
| Imported skills and MCP servers                                 | Untrusted by default                  | Executable external behavior is not proven by schema/description           |
| Model output, uploaded/retrieved content, tool results          | Untrusted                             | Can be malformed, injected, misleading, or adversarial                     |
| Future OpenClaw                                                 | Partially trusted restricted executor | Must be constrained despite authorized entry                               |
| External providers/integrations and future GCP services         | External/partially trusted            | Have independent identity, availability, and security properties           |

## 7. Trust boundaries

`UNKNOWN` means the current baseline lacks sufficient proof; it is not a safe
default.

| Boundary                                       | Input and actor                                  | Current authn/authz                                              | Validation/normalization and trust                     | Logging/failure/timeout/replay                                       | Security assumption or requirement                                   |
| ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Browser -> server                              | JWT, prompts, files, IDs, settings; human user   | Session validation plus route-specific role/resource checks      | Express/model/file checks; input untrusted             | Mixed JSON/SSE errors; no universal request ID                       | Backend authorization must exist for every protected route           |
| API credential -> server actor context         | Bearer key, paths, session ID; API client        | Secret lookup only                                               | Key authentic; actor/scope not retained                | 403 on bad key; replay/idempotency largely absent                    | Key row, scope, revocation, and actor must survive request           |
| Server -> workspace/governance resolution      | Slug/ID, user/API/schedule context               | Browser membership helper; paths differ elsewhere                | Workspace row trusted only after scoped lookup         | Cache/policy failure behavior not implemented                        | One versioned policy snapshot must govern the full attempt           |
| Server -> collector                            | Signed request, path/URL/content; server service | Communication-key integrity proof                                | Transport integrity does not make content trusted      | Adapter-specific timeout/error; replay proof UNKNOWN                 | Bind task/provenance and constrain parser/URL/filesystem effects     |
| File -> parser                                 | Name, MIME, bytes; uploader                      | Workspace route before collector                                 | Type/path checks exist; parser input hostile           | Parser/resource limits vary; retry UNKNOWN                           | Isolate parsers and bound size/time/decompression                    |
| Collector -> document/vector storage           | Text and metadata; collector                     | Service context                                                  | Filename normalization; content still hostile          | Cross-store failures are not atomic                                  | Preserve provenance and never promote content to instructions        |
| Server -> Ollama/provider                      | Prompts, context, tools; server                  | Provider config, not user authorization                          | Context/model output untrusted                         | Provider-specific timeout/errors; local failure has no paid fallback | Pin security role/model and fail closed for security decisions       |
| Server -> LanceDB                              | Vectors, namespace, filters; server              | Workspace convention                                             | Namespace/metadata must be treated as security inputs  | Separate from Prisma transaction                                     | Verify workspace binding on insert/search/delete                     |
| Retrieved/tool/external content -> prompt      | Chunks, results, emails, SQL/HTTP data           | None inherent                                                    | Untrusted content mixed into prompt                    | Usually chat/tool logging; injection detection not universal         | Data must not supply executable authority                            |
| Model proposal -> AIbitat                      | Tool name and args; untrusted model              | Availability/reranking/approval, not deterministic authorization | Provider parsing/schema varies                         | Tool events exist; malformed behavior varies                         | Normalize and authorize capability, target, parameters               |
| AIbitat -> plugin handler                      | Parsed args/context; delegated agent             | Partial dispatcher and optional approval                         | Generic dispatch; plugin effects differ                | Tool result emitted; nested timeout/replay varies                    | Dispatcher hook alone cannot claim final-effect coverage             |
| Flow wrapper -> inner node                     | Stored flow, variables, intermediate output      | Outer tool selection only                                        | Node substitution/direct fetch; untrusted              | Partial results; retry can duplicate effects                         | Authorize and audit every effectful node                             |
| MCP adapter -> MCP server                      | Tool name, args, headers/env; agent              | Enabled/suppressed configuration                                 | External schema/implementation untrusted               | Transport-specific timeout; outcome may be ambiguous                 | Restrict server identity, transport, target, arguments, result size  |
| Scheduler -> worker/agent                      | Prompt, tool set, job/run IDs; system            | Single-user management; automatic approval                       | No human/workspace/policy context                      | Run status/timeouts; retries and ownership semantics incomplete      | Persist version-bound execution context and reauthorize at fire time |
| WebSocket client -> invocation                 | UUID and feedback; browser client                | No ordinary request middleware observed                          | UUID possession plus invocation lookup                 | Close marks invocation; replay/races insufficiently tested           | Bind invocation to authenticated principal/workspace/policy/session  |
| Executor -> external network                   | URL/headers/body/credentials; tool/flow/MCP      | Adapter-specific                                                 | No universal DNS/redirect/target normalization         | Timeout/retry differs; unknown outcome possible                      | Revalidate every redirect and resolved address at use time           |
| Executor -> filesystem/process                 | Paths/args/env; tools/plugins/MCP/collector      | Adapter-specific                                                 | Containment varies; symlink/junction behavior material | Partial writes/process hangs possible                                | Resolve final target, restrict roots/env/commands, audit outcome     |
| Frontend visibility -> backend enforcement     | UI role state and action                         | Frontend gating is not authz                                     | Presentation-only                                      | No security guarantee                                                | Route-level parity must be proven independently                      |
| Future Sentinel -> OpenClaw -> external target | Authorized proposal/context                      | Not implemented                                                  | Future runtime remains partially trusted               | Outcome/replay protocol not implemented                              | Least privilege, restricted environment, final-effect auditing       |

## 8. Identity and authorization model

**OBSERVED:** multi-user browser requests can resolve a current user and
workspace membership. Admin and manager behavior is broader, and single-user
mode can have no user row. Authentication is not authorization, and workspace
access does not imply policy editing, audit viewing, credential access, or
execution permission.

**OBSERVED developer API gap:** `validApiKey` verifies a global secret but does
not retain the key row or `createdBy`. Threats include key theft, shared-key
ambiguity, replay, global privilege confusion, weak revocation attribution,
workspace-scope confusion, and forensic attribution failure.

**REQUIRED QUESTION FOR PHASE 1C:** what actor identity and scope does Sentinel
authorize and record when a developer API key is the caller?

**OBSERVED scheduled gap:** jobs and runs have job/run identity but no persisted
human or workspace owner. Workers construct an ephemeral agent and approve tool
requests automatically. Creation authority, firing authority, policy version,
credential state, membership changes, disabled owners, and job transfer are not
represented.

**OBSERVED WebSocket gap:** interactive continuation uses an invocation UUID
outside normal request middleware. Required binding includes initiating user or
API key, workspace, thread/session, policy version, expiry, nonce/state, and
connection ownership. Guessing, theft, replay, cross-user attachment,
cross-workspace attachment, stale reuse, and simultaneous-client races require
tests.

Single-user and multi-user postures must remain distinct:

| Concern                    | Single-user                                    | Multi-user                                    |
| -------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Human identity             | May be an instance operator without user row   | Stable user ID and role                       |
| Workspace access           | Effectively global                             | Membership/admin/manager logic                |
| Cross-user confidentiality | Lower but API/service actors remain            | Primary boundary                              |
| Audit attribution          | Instance actor plus credential/session context | Initiator and delegated actor                 |
| Schedule ownership         | Current supported mode, but owner absent       | Future posture requires explicit decision     |
| Policy ownership           | Instance administrator                         | Separate admin/manager/member rights required |

## 9. Workspace isolation threats

- Membership, role, slug, ID, thread, document, chat, vector namespace, and
  policy-profile checks may diverge across browser, API, connectors, agents, and
  scheduled paths.
- Slug/ID confusion, stale membership, frontend-only gates, missing backend
  checks, suspended users, role changes, and cached policy can cause horizontal
  or vertical privilege escalation.
- Deleted workspaces can leave document files, vectors, configuration, jobs,
  credentials, or audit records in inconsistent states.
- A legitimate member may poison shared documents, chats, flows, or policies.
- Exhaustive route authorization parity remains **UNKNOWN** and is a Phase 8
  security-test requirement.

## 10. Chat, RAG, and prompt-injection threats

**OBSERVED:** `streamChatWithWorkspace` is a strong browser chat interception
candidate, not a universal chat boundary. A browser-only guardrail could be
bypassed through developer API, OpenAI-compatible, Telegram, embed/connector,
or post-WebSocket agent paths. Each adapter could resolve actor, workspace, and
policy differently.

Untrusted inputs include uploaded/retrieved/pinned documents, parsed
attachments, URL content, web search/scrape results, mail/calendar content, SQL
results, external HTTP responses, tool output, MCP output, and imported-skill
output. Threats include direct and indirect instruction injection, persistent
workspace poisoning, cross-user poisoning, policy disclosure, secret requests,
tool-selection manipulation, target/parameter manipulation, and malicious
content recirculation through memory/chat history.

Retrieval threats include poisoned embeddings, wrong namespace, cross-workspace
search, metadata manipulation, index corruption, leakage, and the model treating
source metadata as proof. Retrieved text crossing into the model prompt is a
major trust boundary.

Models can hallucinate, ignore instructions, emit malformed JSON, choose the
wrong capability or target, invent parameters, escalate privilege, and obey
hostile context. Model reasoning, tool reranking, tool availability, approval
prompts, refusal, and semantic classification are not authorization.

Future policy extraction has the same problem: a malicious scope document,
ambiguous language, prompt injection, overbroad extraction, policy tampering,
version confusion, or workspace mismatch can corrupt the structured profile.
Model-extracted structure requires deterministic validation and human-authorized
activation. A `qwen3:8b` semantic `ALLOW` can never override deterministic
`DENY`; classifier timeout, malformed output, swap, false allow, and false deny
must be handled explicitly.

## 11. Ingestion and vector threats

The observed flow is browser/API -> server -> signed collector request -> parser
-> normalized JSON -> chunking -> embeddings -> LanceDB -> Prisma mappings.
The service signature establishes request integrity between known components;
it does not establish that the uploaded file, URL, extracted text, or metadata
is safe.

Threats include malicious PDFs/media/archives, parser exploitation, MIME and
filename confusion, path traversal, oversized files, decompression bombs where
archive parsers apply, CPU/memory/disk exhaustion, temporary-file races,
symlinks, Windows junctions, collector compromise, stored prompt injection,
remote URL SSRF, redirects, and metadata-service access. Vector threats include
poisoned chunks/embeddings, namespace mistakes, cross-workspace leakage,
corruption, residual vectors after deletion, and Prisma/LanceDB divergence.

## 12. Agent, tool, MCP, plugin, and flow threats

The execution chokepoint answer is **PARTIAL**. AIbitat sees many model-selected
function names and arguments before `fn.handler(args)`, but cannot by itself
control or observe every final effect.

- Built-in handlers own filesystem, SQL, web, mail, calendar, and output effects.
- MCP can spawn stdio processes or call SSE/streamable HTTP servers. A malicious
  or compromised server can lie about schemas, collide names, smuggle
  parameters, steal credentials, hang, return oversized/injected results, make
  nested effects, redirect traffic, or impersonate another server.
- Imported JavaScript is required into the server process and can access files,
  network, process APIs, environment credentials, dependencies, and persistence.
  Description/schema conformance does not sandbox code.
- Agent-flow outer calls use AIbitat, while inner API, scrape, and model nodes
  execute directly. Variable substitution, secret exposure, stored malicious
  flows, cross-workspace reuse, retries, partial failures, and nested injection
  can bypass one outer decision.
- Direct UI/API mutations, ingestion, administrative/background work, and
  connector-specific actions bypass AIbitat entirely.

Every real effect therefore needs a capability-specific restricted boundary or
an explicitly governed direct-mutation hook. Phase 1C must choose the integration
shape; this document does not.

## 13. Network, filesystem, process, integration, and SQL threats

Network targets require more than string URL validation. Relevant attacks are
SSRF, localhost/private/link-local/cloud-metadata access, DNS rebinding, CNAME
chains, redirects to private addresses, multiple A/AAAA records, IPv4/IPv6 and
numeric-IP encodings, IDN/punycode and userinfo confusion, scheme/port confusion,
header injection, credential forwarding, proxy differences, and TOCTOU between
authorization and connection. Every redirect and resolved address must remain
authorized.

Filesystem threats include traversal, absolute/UNC paths, Windows junctions,
symlinks, target swaps, race conditions, read/write/delete outside allowed roots,
overwrite, credential-file disclosure, temporary-file races, and generated-file
escape. Internal server storage, collector storage, agent-visible paths, MCP
subprocess paths, and the host filesystem are distinct boundaries.

Process surfaces include MCP stdio, fixed-argument ripgrep, collector FFMPEG,
administrative Git metadata helpers, and imported JavaScript. Command-injection
risk depends on actual influence over executable, arguments, shell mode, working
directory, and inherited environment; these surfaces must not be conflated.

Mail/calendar integrations risk wrong recipient/account/calendar, unauthorized
send/modify/delete, credential leakage, content injection, replay, and duplicate
mutation. SQL risks include write operations presented as reads, injection,
multi-statement execution, stored procedures, schema/cross-database disclosure,
credential exposure, and resource exhaustion. Future authorization must separate
capability, target, and parameters.

## 14. Secret and credential threats

Assets include API, provider, embedding, MCP, search, integration, future
OpenClaw, future cloud, and KMS credentials. They can leak through model/retrieval
context, tool arguments/results, raw prompts/responses, frontend responses,
errors, console/Prisma/event/telemetry logs, audit metadata, environment
inheritance, file-backed configuration, database storage, process command lines,
or credential forwarding on redirects.

**REQUIRED:** use typed secret references, least-privilege loading, redaction,
bounded metadata, and negative tests. Audit should prefer IDs, hashes, redacted
summaries, and necessary bounded fields over raw content or credentials.

## 15. Audit, atomicity, recovery, replay, and correlation threats

Future audit assets include authorization intent, actor/resource/policy context,
sequence numbers, previous/event hashes, outcomes, checkpoints, and verification
results. Threats include deletion, modification, insertion, reordering, forks,
duplicate sequences, concurrent appends, partial transactions, rollback, clock
manipulation, log flooding, privacy/secret leakage, checkpoint replacement, and
checkpoint rollback.

A local hash chain alone cannot detect an attacker who can rewrite the complete
database and recompute every hash. If the same attacker can also replace every
independent checkpoint or verification key, checkpointing does not restore that
property. Later claims must state the attacker and key/storage assumptions.

Protected-operation audit is mandatory. DB lock/busy, disk full, serialization
or hashing failure, checkpoint unavailability, transaction failure, and process
crash must deny before an effect when authorization audit cannot be committed.
Existing `event_logs` are best-effort and deletable and cannot satisfy this
contract.

Cross-store atomicity is impossible through Prisma alone. Important partial
effects include: external POST succeeds then outcome audit fails; DB mutation
succeeds while audit append fails; file delete succeeds while Prisma fails;
vector deletion partially completes workspace deletion; MCP succeeds before a
server crash records the outcome. Designs need intent, attempt, outcome,
reconciliation, and explicit unknown-outcome states.

Retries from HTTP, SSE/WebSocket reconnect, agents, schedules, workers, MCP, and
external timeouts can duplicate effects. No universal identifier currently
survives request -> model -> tool -> persistence -> outcome. Risks include wrong
audit linkage, cross-request confusion, duplicate ambiguity, and failed forensic
reconstruction. Phase 1C must define correlation ID, execution attempt ID,
idempotency semantics, and outcome states without assuming external systems
support atomic idempotency.

## 16. Failure behavior

| Failure                                                    | Required protected-operation behavior                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Actor or workspace cannot be resolved                      | Deny; record safe diagnostic if audit is available                                           |
| Policy missing, stale, unreadable, or parse-invalid        | Deny                                                                                         |
| Model/classifier timeout or malformed output               | Deny the security-sensitive proposal; ordinary non-effect chat may return a controlled error |
| Target/parameter normalization fails                       | Deny before execution                                                                        |
| Authorization service throws or returns unknown            | Deny                                                                                         |
| Mandatory authorization audit cannot commit                | Deny before execution                                                                        |
| Executor times out after dispatch                          | Record `UNKNOWN_OUTCOME`; do not blindly retry                                               |
| Outcome audit fails after an external effect               | Stop further effects, surface degraded state, and reconcile                                  |
| Policy/membership/credential changes between check and use | Revalidate bound versions or deny                                                            |

TOCTOU-sensitive values include DNS/redirect targets, filesystem real paths,
symlinks/junctions, workspace membership, policy version, credential account,
and external target identity.

## 17. Availability, privacy, supply chain, and future boundaries

Availability threats include huge uploads, excessive chunks/context, chat floods,
long agent loops, tool/MCP hangs, Ollama CPU/RAM saturation, SQLite lock
contention, audit growth, scheduled-job storms, and retry amplification. Limits,
timeouts, quotas, queue bounds, and recovery need later fault tests; unlimited
denial-of-service resistance is outside the guarantee.

Sensitive information may propagate across users/workspaces through retrieval,
chat history, logs, audit, prompts, tool traffic, MCP, local processes, and
errors. Local-first inference reduces one external boundary but does not prevent
local cross-tenant or process leakage.

Supply-chain and CI threats include compromised direct/transitive npm packages,
install scripts, lockfile changes, container bases, GitHub Actions, workflow
tokens, untrusted PR code, artifact substitution, image publishing, Ollama model
artifacts, MCP dependencies, and future OpenClaw skills. Phase 1B does not audit
dependencies or change workflows.

**Future OpenClaw boundary (Phase 5):** Sentinel authorization -> restricted
OpenClaw -> skill -> external resource. Threats include compromised skills,
sandbox escape, broad host mounts/network/filesystem, Docker socket exposure,
root execution, credential access, nested effects, unauthorized capabilities,
and malicious results. OpenClaw is not installed or enabled.

**Future GCP boundary (Phase 9):** service accounts, IAM, KMS, attestation,
Confidential Compute, metadata service, network exposure, secret storage, and
Terraform state introduce new trust and recovery assumptions. Provisioning is
not authorized in this phase.

## 18. Abuse cases

Risk method: likelihood is Low/Medium/High; impact is Low/Medium/High/Critical.
Priority P0 requires design-blocking treatment before protected execution; P1
requires implementation-phase mitigation and regression coverage; P2 is planned
hardening; P3 is monitored/accepted. Ratings are qualitative and evidence-based.

### TM-001 — Model proposal reaches an unauthorized effect

- **Actor:** prompt-injected or malfunctioning model.
- **Asset/entry:** external resource; AIbitat/tool/flow/MCP path.
- **Preconditions/attack:** a tool is exposed and model-selected name/arguments
  reach a handler without deterministic capability, target, and parameter checks.
- **Current controls:** schemas, reranking, availability, and occasional approval.
- **Gap/impact:** these are not authorization; data loss, exfiltration, or external
  mutation. Likelihood High, impact Critical, priority P0.
- **Required mitigation/owner:** normalized proposal and restricted executors,
  Phases 3/5; adversarial tests Phase 6.
- **Detection/residual:** authorization and outcome audit with attempt ID;
  authorized external systems remain independently risky.

### TM-002 — A fragmented chat path bypasses governance

- **Actor:** authenticated user or API client.
- **Asset/entry:** policy and protected chat; alternate browser/API/connector path.
- **Attack:** choose a path not calling the browser chat interceptor.
- **Current controls:** path-specific authentication and chat implementations.
- **Gap/impact:** inconsistent actor/workspace/policy; policy bypass. Likelihood
  High, impact Critical, priority P0.
- **Required mitigation/owner:** shared guardrail contract and entry adapters,
  Phase 3; parity tests Phases 6/8.
- **Detection/residual:** log adapter/policy version; unknown optional connectors
  remain until inventoried.

### TM-003 — Cross-workspace authorization or retrieval leakage

- **Actor:** malicious member, stolen session, or API client.
- **Asset/entry:** workspace documents/chats/vectors/configuration.
- **Attack:** exploit slug/ID/thread/namespace or route-check mismatch.
- **Current controls:** JWT roles, `Workspace.getWithUser`, route middleware.
- **Gap/impact:** parity is not exhaustively proven; cross-tenant disclosure or
  mutation. Likelihood Medium, impact Critical, priority P0.
- **Required mitigation/owner:** resource-bound authorization and route matrix,
  Phases 3/8.
- **Detection/residual:** actor/workspace/resource audit; admin authority remains.

### TM-004 — Developer API key ambiguity or replay

- **Actor:** legitimate, shared, or stolen API-key holder.
- **Asset/entry:** global API routes and audit attribution.
- **Attack:** replay a key or act in a workspace without a durable scoped actor.
- **Current controls:** secret lookup and optional creator stored in DB.
- **Gap/impact:** middleware discards the row/creator. Likelihood High, impact
  Critical, priority P0.
- **Required mitigation/owner:** explicit API principal, scope, revocation, and
  execution context; Phase 1C decision, Phases 3/8 implementation.
- **Detection/residual:** key ID (never secret), initiator, scope, request ID;
  bearer theft remains until revocation.

### TM-005 — Scheduled execution uses stale or ownerless authority

- **Actor:** scheduled/system worker or attacker modifying a job.
- **Asset/entry:** external resources; scheduled job firing.
- **Attack:** execute after creator loses access, policy/credential changes, or
  automatic approval hides missing authorization.
- **Current controls:** single-user management, job/run IDs, queue/status.
- **Gap/impact:** no persisted user/workspace owner; automatic approval.
  Likelihood High, impact Critical, priority P0.
- **Required mitigation/owner:** creator/effective actor, workspace, policy
  snapshot and reauthorization at fire time; Phases 1C/3/5.
- **Detection/residual:** schedule/run/attempt linkage and policy version; owner
  transfer semantics require decision.

### TM-006 — Agent invocation WebSocket is attached by another client

- **Actor:** user or attacker possessing/guessing/replaying UUID.
- **Asset/entry:** interactive invocation and delegated tools; WebSocket route.
- **Attack:** attach across user/workspace, replay stale UUID, race a client.
- **Current controls:** UUID lookup and invocation close state.
- **Gap/impact:** ordinary auth middleware is absent. Likelihood Medium, impact
  Critical, priority P0.
- **Required mitigation/owner:** authenticated, expiring, single-use binding to
  actor/workspace/policy/session; Phase 5, tests Phase 6/8.
- **Detection/residual:** connection/attempt audit; stolen authenticated channel
  remains a session threat.

### TM-007 — Indirect prompt injection manipulates an action

- **Actor:** malicious document, retrieved content, tool/MCP result, or external
  content author.
- **Asset/entry:** model prompt and protected effects.
- **Attack:** embed instructions that exfiltrate policy/secrets or alter tools,
  targets, and parameters.
- **Current controls:** content parsing, retrieval, prompt instructions.
- **Gap/impact:** content enters model context as untrusted data. Likelihood High,
  impact Critical, priority P0.
- **Required mitigation/owner:** data/instruction separation, denial-only
  classifier, deterministic authorization; Phases 3/4/5/6.
- **Detection/residual:** record provenance and denial reason without raw secrets;
  novel injection remains possible but cannot grant permission.

### TM-008 — MCP or imported skill performs hidden nested effects

- **Actor:** malicious MCP server, imported code, or compromised dependency.
- **Asset/entry:** server/process/network/filesystem credentials.
- **Attack:** lie about schema, smuggle args, spawn/execute, exfiltrate, or return
  injected output after wrapper authorization.
- **Current controls:** admin configuration, tool suppression, AIbitat wrapper.
- **Gap/impact:** external/server-process internals are outside generic dispatch.
  Likelihood Medium, impact Critical, priority P0.
- **Required mitigation/owner:** explicit trust tiers, isolation, allowlisted
  capabilities/transports, credential minimization; Phase 1C and Phase 5.
- **Detection/residual:** tool/server identity plus bounded result/outcome audit;
  trusted extension compromise remains residual.

### TM-009 — Agent-flow inner node bypasses outer authorization

- **Actor:** malicious flow author or injected intermediate content.
- **Asset/entry:** flow API/scrape/model nodes.
- **Attack:** one approved outer flow expands into unreviewed targets/effects or
  duplicates them on retry.
- **Current controls:** admin flow management and sequential executor.
- **Gap/impact:** inner nodes do not re-enter AIbitat. Likelihood Medium, impact
  Critical, priority P0.
- **Required mitigation/owner:** expand/authorize/audit each effectful node and
  bind variables; Phase 1C/5.
- **Detection/residual:** flow/node/attempt IDs and partial outcome records;
  dynamic outputs require conservative denial.

### TM-010 — SSRF or target-normalization bypass

- **Actor:** user, model, flow, MCP, or malicious redirect/DNS operator.
- **Asset/entry:** internal network, metadata, credentials; outbound URLs.
- **Attack:** alternate IP encodings, DNS rebinding, redirects, IPv6, userinfo,
  or TOCTOU reach a denied target.
- **Current controls:** adapter-specific URL handling.
- **Gap/impact:** no universal outbound target authorization. Likelihood High,
  impact Critical, priority P0.
- **Required mitigation/owner:** canonical target policy, DNS/address checks and
  per-redirect reauthorization at connection time; Phase 5/6.
- **Detection/residual:** record canonical host/address/redirect chain; trusted
  proxies and DNS remain TCB concerns.

### TM-011 — Filesystem/process escape

- **Actor:** model, malicious skill/MCP, uploader, or local attacker.
- **Asset/entry:** host files, secrets, processes.
- **Attack:** traversal, junction/symlink swap, UNC/absolute path, command/env
  influence, or broad subprocess access.
- **Current controls:** subsystem-specific containment and argument arrays.
- **Gap/impact:** containment is not universal and imported code is powerful.
  Likelihood Medium, impact Critical, priority P0.
- **Required mitigation/owner:** final real-path checks, restricted roots,
  fixed executables/arguments/env, process isolation; Phase 5/6/8.
- **Detection/residual:** canonical path/process audit; host-root compromise is
  outside the guarantee.

### TM-012 — Mandatory audit is bypassed or fails open

- **Actor:** application fault, attacker causing DB/disk failure, or developer.
- **Asset/entry:** protected mutation and future audit append.
- **Attack:** cause audit failure while operation proceeds.
- **Current controls:** `event_logs` catches failures and callers continue.
- **Gap/impact:** current logging is not mandatory. Likelihood High, impact
  Critical, priority P0.
- **Required mitigation/owner:** transaction-aware mandatory authorization audit
  and fail-closed contract; Phase 2 with fault tests.
- **Detection/residual:** health/degraded state and failed-attempt telemetry that
  does not substitute for audit.

### TM-013 — Audit chain or checkpoint is rewritten

- **Actor:** DB/filesystem writer, compromised process, or host administrator.
- **Asset/entry:** audit events/checkpoints/keys.
- **Attack:** delete, reorder, fork, recompute, or roll back records/checkpoints.
- **Current controls:** none for future Sentinel audit.
- **Gap/impact:** a local chain without independent anchor has bounded evidence.
  Likelihood Medium, impact Critical, priority P0.
- **Required mitigation/owner:** canonical hashing, strict sequence/transaction,
  independently protected checkpoints and verifier; Phase 2.
- **Detection/residual:** verification report; attacker controlling DB, all
  checkpoints, and keys remains outside the cryptographic guarantee.

### TM-014 — Cross-store effect is only partially recorded or applied

- **Actor:** crash, timeout, network partition, or storage failure.
- **Asset/entry:** SQLite/LanceDB/files/collector/external resource.
- **Attack:** interrupt between authorization, effect, persistence, and outcome.
- **Current controls:** subsystem-specific error handling and some transactions.
- **Gap/impact:** no global transaction. Likelihood High, impact High, priority P1.
- **Required mitigation/owner:** intent/attempt/outcome protocol,
  reconciliation/compensation, and unknown outcome; Phases 1C/2/5.
- **Detection/residual:** incomplete-attempt queries and recovery audit; some
  external outcomes remain unknowable.

### TM-015 — Retry duplicates a side effect or mislinks its outcome

- **Actor:** client, agent, scheduler, worker, or transport retry.
- **Asset/entry:** external mutation and audit history.
- **Attack:** replay after timeout/reconnect without stable idempotency context.
- **Current controls:** subsystem IDs; no universal correlation ID.
- **Gap/impact:** duplicates and forensic ambiguity. Likelihood High, impact High,
  priority P1.
- **Required mitigation/owner:** correlation/execution-attempt/idempotency model;
  Phase 1C/2/5.
- **Detection/residual:** record retry relation and target receipt; external APIs
  lacking idempotency retain risk.

### TM-016 — Ingestion compromises parser or poisons shared knowledge

- **Actor:** malicious uploader or URL host.
- **Asset/entry:** collector, filesystem, vector store, workspace prompt.
- **Attack:** malformed/oversized content, parser exploit, path/MIME trick, SSRF,
  or persistent injected text.
- **Current controls:** route auth, signed collector requests, file checks.
- **Gap/impact:** content remains hostile and parser/resource isolation is
  incomplete. Likelihood Medium, impact High, priority P1.
- **Required mitigation/owner:** bounded isolated parsing, URL controls,
  provenance, poisoning tests; Phases 6/8.
- **Detection/residual:** ingestion IDs/hashes/errors; parser zero-days remain.

### TM-017 — Secrets leak through prompts, tools, logs, or audit

- **Actor:** malicious content/model/tool, ordinary user, or log reader.
- **Asset/entry:** all credential stores and data paths.
- **Attack:** solicit, echo, log, redirect, or persist credentials/raw sensitive
  content.
- **Current controls:** subsystem-specific encryption/redaction only.
- **Gap/impact:** no blanket redaction proof. Likelihood Medium, impact Critical,
  priority P0.
- **Required mitigation/owner:** typed secret references, least privilege,
  redaction/minimization, negative tests; Phases 2/5/8.
- **Detection/residual:** metadata-only audit and secret scanning; process/host
  compromise remains outside the guarantee.

### TM-018 — Policy or classifier corruption creates an overbroad permission

- **Actor:** malicious scope author, injected extractor input, compromised model,
  or unauthorized policy editor.
- **Asset/entry:** governance profile and semantic signal.
- **Attack:** extract broad targets, swap/stale policy/model, or treat semantic
  allow as authority.
- **Current controls:** future functionality is not implemented.
- **Gap/impact:** wrong policy can systematically authorize effects. Likelihood
  Medium, impact Critical, priority P0.
- **Required mitigation/owner:** schema/semantic validation, authorized activation,
  versions, deterministic precedence; Phases 3/4/6.
- **Detection/residual:** policy hash/version/editor and classifier result audit;
  human-approved overbreadth remains possible.

### TM-019 — Local Ollama or model artifact is unavailable or replaced

- **Actor:** local attacker, malicious artifact, or resource exhaustion.
- **Asset/entry:** prompts, decisions, availability; Ollama endpoint/model config.
- **Attack:** swap model, expose service, exhaust CPU/RAM, or return malformed
  structured output.
- **Current controls:** explicit local configuration and controlled errors; no
  paid fallback in Sentinel default/test path.
- **Gap/impact:** local does not imply trusted. Likelihood Medium, impact High,
  priority P1.
- **Required mitigation/owner:** pin/security-role identity, endpoint restriction,
  bounded timeouts, schema validation; Phases 4/8.
- **Detection/residual:** record model/tag/digest where available; host control can
  replace both application and model.

### TM-020 — Supply-chain or CI input compromises the TCB

- **Actor:** compromised package, workflow, image, model, or malicious PR.
- **Asset/entry:** build/runtime code, tokens, artifacts.
- **Attack:** dependency/install-script execution, lockfile/workflow manipulation,
  token theft, or artifact substitution.
- **Current controls:** pinned lockfiles/baseline and repository workflows.
- **Gap/impact:** exhaustive audit is deferred. Likelihood Medium, impact
  Critical, priority P1.
- **Required mitigation/owner:** dependency/secret/workflow permissions, provenance,
  review and release gates; Phase 8.
- **Detection/residual:** signed/provenanced artifacts and scans; ecosystem
  compromise remains residual.

### TM-021 — Future OpenClaw or cloud boundary is overprivileged

- **Actor:** compromised future skill, service account, runtime, or metadata
  requester.
- **Asset/entry:** host/cloud resources, KMS, Terraform state.
- **Attack:** sandbox escape, broad mounts/network/IAM, metadata access, nested
  effects, or key/state theft.
- **Current controls:** functionality is not present and provisioning is barred.
- **Gap/impact:** future boundary requires explicit design. Likelihood Unknown,
  impact Critical, priority P0 before enablement.
- **Required mitigation/owner:** restricted runtime Phase 5; cloud threat review,
  least privilege, attestation/KMS/state controls Phase 9.
- **Detection/residual:** capability/outcome and cloud audit linkage; underlying
  platform compromise remains residual.

## 19. Risk prioritization

| Priority | Threats                                                                           | Gate                                                                                          |
| -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| P0       | TM-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 017, 018, 021 | Architecture must assign an enforceable control before the relevant protected path is enabled |
| P1       | TM-014, 015, 016, 019, 020                                                        | Must be mitigated and tested in the owning implementation/hardening phase                     |
| P2       | Lower-impact operational/privacy variants derived from these cases                | Address in Phase 8 or document bounded residual risk                                          |
| P3       | Accepted risks within explicit non-goals                                          | Monitor and keep claims bounded                                                               |

## 20. Required security properties and test traceability

| Threats                | Required property                                                   | Future phase | Expected test                                                           |
| ---------------------- | ------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------- |
| TM-003/004/005/006     | Typed effective actor and delegation context                        | 1C, 3, 5     | User/API/schedule/WebSocket spoof, revocation, workspace-binding matrix |
| TM-002/003/018         | Versioned workspace policy resolved on every entry adapter          | 1C, 3        | Browser/API/connector parity, stale/missing/invalid policy denies       |
| TM-001/007/008/009/018 | Model output untrusted; schema validation and normalization         | 3, 4, 5      | Malformed JSON, unknown capability, injected target/parameter denial    |
| TM-001/008/009/010/011 | Deterministic capability, target, and parameter authorization       | 3, 5         | Allow/deny matrix; nested flow/MCP/plugin bypass attempts               |
| TM-007/018             | Semantic classifier is denial-only relative to deterministic policy | 4, 6         | False/malformed/timeout `ALLOW` never overrides deterministic denial    |
| TM-012/013/017         | Mandatory, minimized, tamper-evident audit                          | 2            | DB busy/lock/disk/serialization fail-closed; tamper/fork/secret tests   |
| TM-014/015             | Correlation, attempt, idempotency, outcome/reconciliation protocol  | 1C, 2, 5     | Crash boundary, reconnect/retry, duplicate, unknown-outcome tests       |
| TM-010                 | Canonical network targets and redirect/DNS reauthorization          | 5, 6         | Private/link-local/metadata, IPv4/IPv6, rebinding, redirect cases       |
| TM-011                 | Restricted real-path filesystem and fixed process boundary          | 5, 6, 8      | Traversal, symlink, Windows junction/UNC, env/argument injection        |
| TM-016                 | Isolated bounded ingestion with provenance                          | 6, 8         | Parser fault, size/time/decompression, URL, persistent injection tests  |
| TM-017                 | Typed secret references and end-to-end redaction                    | 2, 5, 8      | Prompt/log/error/audit/tool/MCP leakage tests                           |
| TM-019                 | Fixed security model identity, timeout, schema, no hidden fallback  | 4, 8         | Model swap/unavailable/malformed/resource failure tests                 |
| TM-020                 | Dependency/workflow/artifact provenance and least privilege         | 8            | Advisory, lockfile, workflow permission, secret/artifact checks         |
| TM-021                 | Restricted OpenClaw and least-privilege cloud boundary              | 5, 9         | Sandbox/egress/mount tests; IAM/KMS/metadata/Terraform review           |

Phase ownership summary:

- Phase 2: audit race, chain tamper/fork, append failure, checkpoint, privacy,
  and transaction tests.
- Phase 3: profile/scope parsing, versioning, actor/workspace policy, and policy
  bypass tests.
- Phase 4: classifier schema, timeout, false allow/deny, model identity, and
  deterministic-precedence tests.
- Phase 5: proposal normalization, capability/target/parameter authorization,
  restricted execution, MCP/flow/plugin adapters, idempotency, and outcome tests.
- Phase 6: prompt injection, SSRF, path/process escape, cross-workspace, race,
  fault-injection, and bypass-chain adversarial tests.
- Phase 8: route auth parity, input/rate/secret/dependency/CI hardening.
- Phase 9: explicit gated cloud/IAM/KMS/attestation/state threat review and tests.

## 21. Explicit assumptions

- The pinned baseline and reviewed source match the deployed application; local
  unreviewed modifications invalidate this analysis.
- Cryptographic primitives and official runtime libraries are correctly
  implemented when used according to their contracts.
- Host administrators protect runtime code, keys, checkpoints, and deployment
  configuration according to the later architecture.
- External services may fail, lie, time out, or report ambiguous outcomes.
- Workspace members and administrators can be malicious or compromised; their
  authorized power must still be scoped and audited.
- Any optional connector, plugin, MCP server, or future skill not inventoried is
  outside covered execution until explicitly registered and governed.

## 22. Non-goals and residual risks

Sentinel does not guarantee security after total control of host root, kernel,
hypervisor, application process, or every audit checkpoint/key; protection
against physical device compromise; availability under unlimited resource
attack; correctness of an external system after an authorized request leaves
Sentinel; safety of arbitrary imported code without isolation; or prevention of
all supply-chain compromise.

These limits do not excuse controllable failures such as missing backend
authorization, path fragmentation, permissive target handling, secret logging,
or protected execution after mandatory audit failure.

Residual risks include authorized-but-harmful administrator action, human
approval of overbroad policy, external systems without idempotency, parser/model
zero-days, ambiguous remote outcomes, trusted dependency compromise, and
availability loss within configured resource ceilings. Audit provides evidence
under its stated assumptions, not prevention of every underlying effect.

## 23. Required Phase 1C decisions

1. Typed actor/execution context for single-user, multi-user, API, delegated,
   scheduled, MCP, and service actors.
2. Formal single-user versus multi-user product/security posture.
3. Dedicated audit storage, append/sequence transaction model, checkpoint trust
   model, verifier, privacy schema, and external-effect recovery protocol.
4. Governance profile storage, activation, versioning, resolution, caching, and
   request/execution snapshot semantics.
5. Shared chat guardrail contract and complete browser/API/OpenAI-compatible/
   connector/agent adapter inventory.
6. Normalized action proposal and deterministic capability registry boundary.
7. AIbitat interception plus capability-specific restricted executor design,
   including direct mutations and outcome audit.
8. MCP trust tiers, server identity, transport/credential/target rules, and
   result constraints.
9. Imported JavaScript policy: disable, isolate, explicitly trust, or restrict;
   never infer safety from descriptions.
10. Agent-flow expansion and per-inner-node authorization/outcome model.
11. Scheduled creator/effective actor, workspace, policy snapshot,
    reauthorization, revocation, and ownership transfer semantics.
12. WebSocket invocation authentication and binding contract.
13. Correlation ID, execution attempt ID, idempotency, retry, and unknown-outcome
    model across SQLite and external effects.
14. Minimal upstream patch seams for audit, governance, chat, execution, and
    frontend consumers.

No ADR is created or resolved by Phase 1B.

## 24. Known unknowns

- Complete backend authorization parity for every optional route and connector.
- Redirect, proxy, DNS, timeout, retry, and credential behavior of every
  third-party integration.
- MCP transport and server-specific behavior under adversarial input.
- The full effect surface of installed future custom plugins or skills.
- Required SQLite contention/ordering behavior under audit append load.
- Exact crash-recovery semantics for every SQLite/LanceDB/file/collector/external
  sequence.
- Formal scheduled ownership and workspace policy because the current schema
  does not contain them.
- The future independent checkpoint location and trust authority.
- Deployment-specific exposure of Ollama, collector, files, and optional APIs.
- Future OpenClaw and GCP implementations, which do not yet exist.

## 25. Conclusion

The pinned application has useful authentication, workspace, provider, agent,
and persistence abstractions, but its security-sensitive entry and effect paths
are fragmented. The main design constraint is empirical: AIbitat provides a
partial proposal dispatcher, not a universal final-effect boundary. Phase 1C
must therefore define a typed execution context, complete adapter coverage,
mandatory tamper-evident audit, and capability-specific restricted execution
without trusting model, document, retrieval, tool, MCP, or plugin output.

Until those later controls exist, planned Sentinel security properties must not
be described as implemented.
