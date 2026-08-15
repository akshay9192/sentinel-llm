# Pinned AnythingLLM Codebase Notes

## Scope and method

This document maps the AnythingLLM `v1.15.0` baseline pinned at
`70e0d2eb1dcb08cbb18a44b927d94f8667f57a7f`. It is Phase 1A reconnaissance,
not a Sentinel architecture decision or implementation. Paths and symbols refer
to the pinned repository unless stated otherwise.

The labels used below are deliberate:

- **OBSERVED**: established directly from pinned source or an existing test.
- **INFERRED**: the most likely runtime implication of observed source, but not
  directly exercised in this phase.
- **PROPOSED**: an option for later Phase 1C evaluation, not a decision.
- **UNKNOWN**: evidence is insufficient and the question remains open.

No Sentinel governance, audit, authorization, execution, database, or frontend
runtime was added during this work.

## Repository topology

| Area                                        | Runtime responsibility                                                        | Important entry points                                                                    | State and Sentinel relevance                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `server/`                                   | Express API, authentication, chat/RAG, providers, agents, jobs, Prisma models | `server/index.js`, `server/endpoints/*.js`, `server/endpoints/api/index.js`               | Primary future observation and enforcement surface                         |
| `frontend/`                                 | React/Vite browser UI, routing, API clients, SSE/WebSocket rendering          | `frontend/src/main.jsx`, `frontend/src/models/`, `frontend/src/components/WorkspaceChat/` | Future governance settings, audit viewer, and execution-state consumers    |
| `collector/`                                | File/link ingestion, parsing, conversion, metadata production                 | `collector/index.js`, `collector/processSingleFile/index.js`                              | Uploaded content crosses into a privileged parsing service                 |
| `server/prisma/`                            | SQLite schema and ordered Prisma migrations                                   | `server/prisma/schema.prisma`, `server/prisma/migrations/`                                | Candidate home for queryable audit state, subject to atomicity constraints |
| `server/storage/`                           | Runtime database, documents, vector data, plugins, agent output               | Paths are assembled by subsystem-specific storage helpers                                 | Mixed application-controlled and extension-controlled filesystem state     |
| `server/utils/vectorDbProviders/`           | Vector database abstraction implementations                                   | `server/utils/helpers/index.js#getVectorDbClass`                                          | LanceDB is the validated local default                                     |
| `server/utils/AiProviders/`                 | Chat LLM implementations                                                      | `server/utils/helpers/index.js#getLLMProvider`                                            | Existing provider abstraction supports ordinary chat                       |
| `server/utils/EmbeddingEngines/`            | Embedding implementations                                                     | `server/utils/helpers/index.js#getEmbeddingEngineSelection`                               | Existing Ollama adapter supports the selected embedding role               |
| `server/utils/agents/`                      | Agent orchestration, provider adapters, built-in/imported tools               | `AgentHandler`, `EphemeralAgentHandler`, `AIbitat`                                        | Model-proposed actions become plugin handler calls here                    |
| `server/utils/MCP/`                         | MCP process/transport lifecycle and AIbitat compatibility                     | `MCPCompatibilityLayer`, `MCPHypervisor`                                                  | MCP is another executable tool source, not an authorization layer          |
| `server/utils/agentFlows/`                  | Stored flow definitions and step execution                                    | `AgentFlows`, `FlowExecutor`                                                              | Flow steps contain their own network/model side effects                    |
| `docker/`                                   | Container startup and service composition                                     | `docker/docker-entrypoint.sh`, Compose files                                              | Entrypoint applies Prisma migrations before boot                           |
| `.github/`                                  | CI, issues, repository automation                                             | `.github/workflows/`                                                                      | Existing release/test behavior; not a runtime control plane                |
| `server/__tests__/`, `collector/__tests__/` | Jest tests and mocks                                                          | Root `package.json` test scripts                                                          | Natural location for future server/collector regression coverage           |

## Server bootstrap and lifecycle

**OBSERVED call chain**

```text
server/index.js
  -> dotenv/config + logger/timeout patches
  -> Express or express-ws application
  -> body parsers (3 GB configured limit)
  -> /api developer API router
  -> endpoint registration functions
  -> static frontend / development vector debug / 404 handler
  -> server/utils/boot/index.js#bootHTTP or bootSSL
  -> markOnboarded + Telemetry + CommunicationKey + EncryptionManager
  -> BackgroundService.boot()
  -> context-window cache + push/Telegram initialization
```

- `server/index.js` loads environment configuration before provider and endpoint
  modules, mounts the API router and ordinary endpoints, then selects HTTP or
  HTTPS boot.
- `server/utils/boot/index.js` owns listener creation and startup initializers.
  Its signal/error handler flushes telemetry before exit; it does not visibly
  call a `BackgroundService` shutdown method.
- `server/utils/BackgroundWorkers/index.js#BackgroundService` is a singleton.
  It boots Bree workers and scheduled cron timers, uses `PQueue` for scheduled
  execution, and tracks worker processes by scheduled-job ID.
- `docker/docker-entrypoint.sh` runs Prisma generation and the
  `prisma migrate deploy` command before starting server and collector processes.

**PROPOSED candidate initialization shape:** a dedicated Sentinel module could
be initialized from `server/utils/boot/index.js` after database/encryption setup
and before background or externally reachable execution is enabled. Provider
constructors and endpoint modules are inappropriate global initialization
points because they are request/provider scoped. Phase 1C must decide the hook.

## Authentication and role checks

### Browser/session routes

- `server/utils/middleware/validatedRequest.js#validatedRequest` checks
  `SystemSettings.isMultiUserMode()` on each request.
- In multi-user mode,
  `validateMultiUserRequest` decodes the bearer JWT, loads `User` by decoded
  `id`, rejects missing/suspended users, and places the row in
  `response.locals.user`.
- In single-user mode, development mode or missing `AUTH_TOKEN`/`JWT_SECRET`
  bypasses credential validation. Otherwise an encrypted JWT payload is
  decrypted and compared with the configured password token. No user row is
  attached in this mode.
- `server/utils/middleware/multiUserProtected.js` supplies strict/flexible role
  gates for `admin`, `manager`, `default`, and `<all>`. Flexible gates bypass
  role checks in single-user mode; `isSingleUserMode` rejects multi-user mode.

### Workspace authorization

- `server/utils/middleware/validWorkspace.js#validWorkspaceSlug` resolves the
  session actor, then calls `Workspace.getWithUser(user, {slug})` in multi-user
  mode or `Workspace.get({slug})` in single-user mode.
- `Workspace.getWithUser` in `server/models/workspace.js` permits admins and
  otherwise requires a matching `workspace_users` relation.
- `validWorkspaceAndThreadSlug` first applies that workspace lookup and then
  resolves a thread by `threadSlug` and current `user_id`. The thread lookup does
  not itself include the already-resolved workspace ID; this is an observed
  coupling question for Phase 1B, not a security conclusion here.
- Routes combine `validatedRequest`, a role gate, and one of these workspace
  resolvers. Frontend visibility is not counted as backend authorization.

### Developer API authentication

- `server/utils/middleware/validApiKey.js#validApiKey` resolves a bearer secret
  with `ApiKey.get({secret})` and sets only `response.locals.multiUserMode`.
- `server/models/apiKeys.js` stores a unique secret and an optional `createdBy`
  ID. The middleware does not retain the key row or creator as the effective
  request actor.
- Routes mounted under `server/endpoints/api/index.js` therefore authenticate a
  global API credential but generally invoke workspace/admin operations without
  a user actor. API workspace chat explicitly passes `user: null` and may carry
  a caller-provided `sessionId` for chat partitioning.

### Frontend gating

- `frontend/src/main.jsx` routes workspace settings through `ManagerRoute` and
  administrative pages through role-specific protected-route components.
- Workspace settings navigation in
  `frontend/src/pages/WorkspaceSettings/index.jsx` and administrative controls
  use frontend role state for presentation.
- **OBSERVED:** corresponding backend gates exist on the principal workspace,
  user, agent-flow, imported-plugin, and MCP management endpoints. A complete
  route-by-route security review remains Phase 1B work.

## Actor model

| Actor                    | Identity representation                                                             | Authentication/authorization context                                                         | Workspace and side-effect context                                                 | Evidence                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Single-user operator     | No `users` row is required                                                          | Optional encrypted password JWT; development/unconfigured bypass; flexible role gates bypass | Global instance authority and all workspaces                                      | `validatedRequest.js`, `multiUserProtected.js`, `validWorkspace.js` |
| Multi-user admin         | `users.id`, role `admin`                                                            | Bearer JWT -> current DB row; admin role gates                                               | Global settings/admin operations and all workspaces                               | `validatedRequest.js`, `Workspace.getWithUser`                      |
| Multi-user manager       | `users.id`, role `manager`                                                          | Bearer JWT and manager/admin gates                                                           | Workspace creation/settings plus assigned-workspace access according to route     | `multiUserProtected.js`, workspace endpoints                        |
| Multi-user ordinary user | `users.id`, role `default`                                                          | Bearer JWT; `<all>` route gates plus membership                                              | Assigned workspace/chat/thread operations                                         | `validWorkspace.js`, `workspace_users`                              |
| Developer API client     | API-key secret; optional creator exists only in `api_keys.createdBy`                | `validApiKey`; no user loaded into request context                                           | Global API routes; workspace chat has `user: null`                                | `validApiKey.js`, `apiKeys.js`, API workspace routes                |
| Interactive agent        | `workspace_agent_invocations.uuid` plus optional user/thread and required workspace | Initiated after an authenticated chat route; WebSocket continuation resolves invocation UUID | Acts on behalf of invocation context; model is not an authenticated actor         | `chats/agents.js`, `agentWebsocket.js`, `AgentHandler`              |
| API agent                | Ephemeral invocation UUID, optional session, no persisted invocation                | Inherits API-key route; constructed with `userId: null`                                      | Workspace supplied by API route                                                   | `apiChatHandler.js`, `EphemeralAgentHandler`                        |
| Scheduled execution      | `scheduled_jobs.id` and `scheduled_job_runs.id`; no user/workspace columns          | Scheduler or single-user management route                                                    | Ephemeral agent with no workspace/user; selected tools are automatically approved | `scheduledJobs.js`, `run-scheduled-job.js`, Prisma schema           |
| MCP server/tool          | Configured server name and tool identifier                                          | Admin controls configuration; invocation inherits hosting agent                              | Remote HTTP/SSE or child-process side effects                                     | `MCPCompatibilityLayer`, `MCPHypervisor`                            |
| Collector service        | Communication-key verified service request                                          | Integrity-signed request with encrypted signer proof; request body is not encrypted          | Reads/parses files and writes document JSON                                       | `collector/index.js`, `server/utils/collectorApi/`                  |

**INFERRED:** a future effective actor cannot be a single nullable `user_id`.
It must distinguish human, API credential, scheduled/system, and delegated agent
contexts while retaining the initiating principal where one exists.

## Resource model

| Resource          | Identifier/relationship                                           | Creation and mutation                                     | Deletion/authorization                                                                            |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Workspace         | Integer `id`, unique `slug`; membership through `workspace_users` | `Workspace.new/update`; ordinary and developer API routes | Multi-step chat/vector/document/workspace deletion; route role/membership gates differ by surface |
| User              | Integer `users.id`, unique username, role                         | Admin routes/model                                        | Admin routes; cascades several relations                                                          |
| API key           | Integer ID, unique secret, optional creator ID                    | Admin/settings route                                      | Global credential deletion; creator is attribution, not runtime actor                             |
| Document          | Unique `workspace_documents.docId`, path, workspace relation      | Upload/collector then embedding association               | DB document/vector mappings plus vector namespace/file operations                                 |
| Parsed attachment | Unique filename, workspace/user/thread relation                   | Parse-only upload and attachment flows                    | Workspace-scoped parsed-file routes                                                               |
| Chat              | Integer ID, workspace ID, optional user/thread/API session        | Chat completion persistence                               | Workspace/thread chat deletion routes                                                             |
| Thread            | Integer ID, globally unique slug, workspace and optional user     | Workspace thread routes                                   | Thread deletion cascades relation-backed data; chats use scalar thread ID                         |
| Agent invocation  | Unique UUID, workspace, optional user/thread                      | Browser chat agent handoff                                | Marked closed; UUID is the WebSocket rendezvous identifier                                        |
| Agent flow        | File-backed UUID/config                                           | Admin flow endpoints                                      | File-backed deletion; executed as an AIbitat plugin                                               |
| Imported skill    | File-backed hub ID/config/handler                                 | Admin community/import endpoints                          | File-backed deletion; handler is server-side JavaScript                                           |
| MCP configuration | File-backed server name/config                                    | Admin MCP endpoints                                       | Process/connection teardown and config deletion                                                   |
| Scheduled job/run | Integer IDs; run belongs to job                                   | Single-user endpoints and BackgroundService               | Job deletion cascades runs; no human/workspace owner columns                                      |
| Vector namespace  | Workspace slug/vector tag and LanceDB table                       | `addDocumentToNamespace`                                  | Namespace/document vector deletion                                                                |
| System setting    | Unique label/value                                                | Admin system endpoints/model                              | Global runtime behavior; provider credentials frequently resolve here/env                         |

## Workspace lifecycle and future governance lookup

- Creation starts at `POST /workspace/new` in `server/endpoints/workspaces.js`,
  calls `Workspace.new`, optionally assigns members, and records best-effort
  telemetry/event data.
- `server/models/workspace.js#Workspace.validateFields` allowlists and normalizes
  workspace settings. `Workspace.update` applies those validated fields.
- The browser API client `frontend/src/models/workspace.js#update` calls the
  workspace update route. General, chat, vector, and agent settings forms under
  `frontend/src/pages/WorkspaceSettings/` all reuse it.
- `workspaces` stores chat/agent provider and model, RAG thresholds/history,
  mode, prompt, vector search mode, and related resources. Membership is a join
  through `workspace_users`.
- Deletion is explicitly multi-step in ordinary, admin, and developer API
  endpoints: chat rows, vector mappings, documents, workspace, then vector
  namespace. These effects are not one database/vector transaction.

**PROPOSED candidate governance lookup:** resolve a workspace profile immediately
after `validWorkspaceSlug`/`validWorkspaceAndThreadSlug` has established an
authorized workspace and carry a fixed request-scoped snapshot forward. API
chat routes currently call `Workspace.get` directly and scheduled executions
have no workspace, so a middleware-only hook would not cover them. Alternatives
are a workspace-context service called by each entry path or a lower-level
resolver used by chat and agent construction. Caching and invalidation are
**UNKNOWN** and reserved for Phase 1C.

## Database, migrations, transactions, and concurrency

### Schema and migrations

- `server/prisma/schema.prisma` uses SQLite at
  `server/storage/anythingllm.db`; PostgreSQL guidance is commented but not the
  pinned default.
- Ordered migrations live under `server/prisma/migrations/`. Root Prisma scripts
  generate the client and run setup/migrate commands; Docker uses the
  `prisma migrate deploy` command before application boot.
- `server/utils/prisma/index.js` exports one `PrismaClient` configured for
  error/info/warn logging.
- There is also legacy/model-level table pragma validation under
  `server/utils/database/` and model helpers. This is distinct from the ordered
  Prisma migration history and should not become a parallel Sentinel schema
  system.

### Atomicity observations

- `$transaction` is used selectively in `memory.js`, `modelRouterRule.js`,
  `passwordRecovery.js`, `scheduledJobRun.js`, `vectors.js`, and
  `workspaceUsers.js`.
- Workspace mutations, ordinary chat persistence, event logging, document/vector
  deletion, and most endpoint sequences are separate calls.
- `EventLogs.logEvent` catches its own errors and returns a failure object; callers
  commonly continue. Existing events therefore cannot satisfy mandatory audit.
- Cross-system operations involving SQLite, LanceDB, filesystem, collector, MCP,
  or external services cannot be made atomic by a Prisma transaction alone.
- `BackgroundService` uses `PQueue` and worker/job IDs for scheduled work. No
  general HTTP idempotency key, request lock, or repository-wide correlation ID
  was found. Database uniqueness exists on selected resource identifiers, not on
  protected-operation intent.

### Audit persistence options for Phase 1C

| Option                                                      | Advantages                                                                                                                              | Constraints and upgrade cost                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Extend `event_logs`                                         | Lowest schema/UI reuse cost                                                                                                             | Optional/best-effort semantics, deletable rows, weak actor/resource/correlation fields, no integrity chain         |
| Dedicated Prisma audit models in application DB             | Queryable; can join actor/resource state; same-DB mutations can share an interactive transaction if helpers accept a transaction client | Requires mutation refactoring, ordering/concurrency design, migrations, and explicit treatment of external effects |
| Dedicated audit store                                       | Isolation and independent verification/checkpoint options                                                                               | No atomic commit with application SQLite; new operational, backup, and query surface                               |
| Hybrid application intent/outcome plus external checkpoints | Can separate atomic authorization intent from later effect/outcome verification                                                         | Highest protocol complexity; recovery and idempotency rules must be explicit                                       |

These are **PROPOSED alternatives**, not a Phase 1A decision.

## Browser chat, modes, streaming, and persistence

### End-to-end browser call chain

```text
ChatContainer.handleSubmit / pending chat state
  -> ChatContainer fetchReply effect
  -> frontend Workspace.multiplexStream
  -> Workspace.streamChat or WorkspaceThread.streamChat
  -> POST /workspace/:slug[/thread/:threadSlug]/stream-chat (SSE)
  -> validatedRequest + flexUserRoleValid(<all>)
  -> validWorkspaceSlug or validWorkspaceAndThreadSlug
  -> server/utils/chats/stream.js#streamChatWithWorkspace
     -> slash commands
     -> grepAgents (possible agent handoff)
     -> resolveProviderConnector
     -> getVectorDbClass + namespace check
     -> DocumentManager context/history/pinned/parsed attachments
     -> VectorDb.performSimilaritySearch
     -> chatPrompt + LLMConnector.compressMessages
     -> getChatCompletion or streamGetChatCompletion/handleStream
     -> WorkspaceChats.new
     -> textResponse/finalizeResponseStream SSE events
  -> frontend handleChat event reducer and render
```

- Frontend entry is
  `frontend/src/components/WorkspaceChat/ChatContainer/index.jsx`; its reply
  effect sends pending messages through
  `frontend/src/models/workspace.js#Workspace.multiplexStream`.
- Non-thread and thread clients call distinct URLs but both use
  `@microsoft/fetch-event-source`, an `AbortController`, JSON event parsing, and
  the shared `frontend/src/utils/chat/index.js#handleChat` reducer.
- Backend routes are in `server/endpoints/chat.js`. They set SSE headers, enforce
  message quota, and emit telemetry/event-log records after the chat path
  returns. Errors are logged and written as closed abort events.
- `streamChatWithWorkspace` creates a response UUID and persists the final prompt,
  response, sources, mode, metrics, attachments, user/thread context through
  `server/models/workspaceChats.js#new`.
- Streaming events include chunks, finalization, abort/status, sources, metrics,
  chat ID, model-route notifications, and an agent WebSocket UUID. The frontend
  can abort the fetch stream and switches later user feedback to the WebSocket
  while an agent session is active.

### Mode selection

- `query`, `chat`, and `automatic` are accepted route modes.
- `server/utils/chats/agents.js#grepAgents` treats explicit `@agent` syntax as an
  agent request. It also treats `automatic` as agent mode when
  `Workspace.supportsNativeToolCalling(workspace)` is true.
- Agent selection creates `workspace_agent_invocations`, emits
  `agentInitWebsocketConnection`, and ends the initial HTTP response. The browser
  then connects to `server/endpoints/agentWebsocket.js` with the invocation UUID.
- Otherwise `chat` and `automatic` continue through the ordinary RAG/chat path.
  `query` differs by refusing without an existing namespace or relevant context
  rather than answering from general model knowledge.
- **OBSERVED:** this explains why Phase 0 automatic wording could enter agent mode
  while explicit query mode remained on the direct RAG path.

### Other chat entry paths

- Developer workspace and thread API routes use
  `server/utils/chats/apiChatHandler.js#chatSync/#streamChat`, not
  `streamChatWithWorkspace`. They repeat retrieval/context/provider behavior and
  use `EphemeralAgentHandler` for agent mode.
- `server/endpoints/api/openai/index.js` uses
  `server/utils/chats/openaiCompatible.js#chatSync` for the OpenAI-compatible
  surface.
- `server/utils/telegramBot/chat/stream.js#streamResponse` implements another
  RAG/agent path with Telegram-specific delivery and persistence behavior.
- Embed widgets and other communication connectors also have separate entry
  modules.

**Chat choke-point finding**

| Field                 | Finding                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Candidate             | `server/utils/chats/stream.js#streamChatWithWorkspace`                                                                            |
| Coverage              | Authenticated browser workspace and thread ordinary/query chat before generation; agent handoff decision is visible there         |
| Bypasses              | Developer API `ApiChatHandler`, OpenAI-compatible API, Telegram/embed/connector paths, and post-handoff agent WebSocket execution |
| Streaming implication | A denial/status event could use the existing SSE envelope, but agent events have separate HTTP/WebSocket emitters                 |
| Confidence            | High                                                                                                                              |

**Conclusion:** there is no single function that sees every relevant chat request
before generation. A shared Sentinel chat inspection service called from each
entry implementation is a lower-divergence candidate than forcing all APIs
through the browser handler, but this is **PROPOSED** for Phase 1C.

## RAG and embedding pipeline

### Retrieval and generation

```text
user query
  -> resolveProviderConnector(workspace/thread)
  -> getVectorDbClass() (LanceDB by default)
  -> VectorDb.hasNamespace(workspace.slug)
  -> workspace history + pinned docs + parsed attachment context
  -> LanceDB.performSimilaritySearch(query, namespace, LLMConnector, threshold, topN)
     -> LLMConnector.embedTextInput(query)
     -> Lance table vectorSearch / distance scoring
  -> optional source backfill and context filtering
  -> chatPrompt + compressMessages
  -> provider completion/stream
  -> response sources -> frontend citation rendering
```

- Provider/vector resolution is in `server/utils/helpers/index.js`:
  `resolveProviderConnector`, `getLLMProvider`,
  `getEmbeddingEngineSelection`, and `getVectorDbClass`.
- `server/utils/vectorDbProviders/lance/index.js#performSimilaritySearch` embeds
  the query through the selected connector and queries the workspace table.
- `streamChatWithWorkspace` combines vector results with pinned document text,
  parsed attachments, and history, enforces connector token limits through
  `compressMessages`, and passes the result to generation.
- Sources travel in the streamed response and are rendered from chat state on the
  frontend; source emission is application metadata, not proof that the model
  used a source.

### Ollama providers and selected role models

- `server/utils/AiProviders/ollama/index.js#OllamaAILLM` resolves Ollama base URL,
  model, context window, sync completion, streaming completion, and stream error
  handling. Ordinary workspace chat model selection can override the system
  provider/model through `resolveProviderConnector`.
- `server/utils/EmbeddingEngines/ollama/index.js#OllamaEmbedder` resolves
  `EMBEDDING_MODEL_PREF`, batches chunks, and calls Ollama `embed` for document
  and query inputs.
- `server/utils/vectorDbProviders/lance/index.js#addDocumentToNamespace` calls the
  selected embedder for chunks, inserts vectors into persistent LanceDB, and
  records vector IDs in Prisma.
- The validated Phase 0 defaults fit the existing abstractions as follows:
  `llama3.2:3b` through `OllamaAILLM`, and
  `nomic-embed-text:latest` through `OllamaEmbedder`. The future
  `qwen3:8b` guardrail/agent roles are not wired by Phase 1A.

**PROPOSED provider decision candidate:** ordinary chat and embeddings should
reuse upstream connectors. A future security-sensitive classifier may need a
small isolated adapter with fixed model/schema/timeouts so workspace model
settings cannot silently alter it. Phase 1C must choose; model output remains
untrusted in either design.

### RAG trust boundary and context strategy

Uploaded and retrieved text is untrusted. The observed boundary is:

```text
collector output / parsed attachment
  -> document JSON and vector metadata
  -> retrieved pageContent
  -> chat context/prompt
  -> LLM
```

Potential future prompt-injection controls can operate after retrieval and before
prompt assembly, but must also account for pinned documents and parsed
attachments that do not necessarily traverse similarity search. No control is
implemented here.

## Document ingestion and file trust boundaries

### Upload-to-vector call chain

```text
frontend Workspace.uploadFile / uploadLink / uploadAndEmbedFile
  -> server workspace route + auth/workspace middleware
  -> handleFileUpload temporary file handling
  -> CollectorApi.processDocument(originalname) or processLink
  -> integrity-signed server-to-collector request with encrypted signer proof
  -> collector /process or /process-link + verifyPayloadIntegrity
  -> processSingleFile / URL converter
  -> extension/MIME/text checks + converter (PDFLoader for PDF)
  -> sanitized document JSON written to server documents storage
  -> workspace update-embeddings / Document.addDocuments
  -> text splitting/chunk metadata
  -> LanceDB.addDocumentToNamespace
  -> OllamaEmbedder.embedChunks
  -> LanceDB rows + document_vectors/workspace_documents records
```

- Browser upload clients are in `frontend/src/models/workspace.js`.
- Server routes are in `server/endpoints/workspaces.js`; parsing is delegated by
  `server/utils/collectorApi/` rather than performed inside Express.
- `collector/index.js` verifies request integrity before processing and clears
  its hot/tmp directories at collector startup.
- `collector/processSingleFile/index.js` resolves ordinary files within its watch
  directory, rejects unsupported/reserved inputs, selects a converter by file
  type, and passes internal uploads an explicit absolute path option.
- `collector/utils/files/index.js` provides MIME/binary checks,
  `sanitizeFileName`, `normalizePath`, `isWithin`, and document JSON writing.
  Its containment comment explicitly notes that symlinks are not detected by
  the string/path containment check.
- PDF conversion uses `collector/processSingleFile/convert/asPDF/index.js` and
  `PDFLoader`, with OCR fallback behavior in the converter stack.

### File and URL inputs

| Untrusted input        | Normalization/validation observed                                                                       | Remaining mapping concern                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Filename/path          | Upload middleware, collector watch-directory resolution, reserved-name checks, sanitization, `isWithin` | Absolute/internal paths and symlink behavior require threat-model review                                               |
| MIME/extension         | MIME detector, extension registry, binary/text heuristic                                                | MIME is evidence for parser selection, not a security guarantee                                                        |
| Document content       | Format converter/parser and text splitting                                                              | Parsed/retrieved content enters LLM prompts as untrusted text                                                          |
| URL                    | Collector URL parsing/validation and scraper/downloader                                                 | Loopback/`0.0.0.0` acceptance exists for scraping convenience; redirect/credential/SSRF policy needs Phase 1B analysis |
| Archive/plugin content | Imported-plugin archive inspection and containment checks                                               | Imported handler ultimately runs as server JavaScript                                                                  |

No claim is made that integrity signing between server and collector makes
uploaded content trusted or that the file surface is secure.

## Configuration and credential flow

- Configuration is split among process environment, `system_settings`, workspace
  columns, frontend form state, provider defaults, and file-backed plugin/MCP/flow
  configuration.
- Workspace chat/agent provider and model override the corresponding system
  defaults when connector resolution receives a workspace.
- Provider, embedding, vector, web-search, integration, and MCP credentials are
  entered through settings/configuration surfaces and loaded by their adapters.
- MCP configuration builds environment for stdio transports; remote MCP uses SSE
  or streamable HTTP transports. Imported plugins receive configured values in
  their runtime context.
- Developer API secrets are stored in `api_keys.secret`; the schema does not show
  encryption for that field. Other secrets may be protected by subsystem-specific
  `EncryptionManager` use; no blanket encryption-at-rest guarantee is inferred.
- Operational logging is heterogeneous (`console`, Prisma logs, event logs,
  telemetry). A complete credential-by-credential redaction proof was not found
  and is a Phase 1B question. No secret values are reproduced here.

## Agent execution end to end

### Interactive browser agent

```text
browser chat prompt
  -> streamChatWithWorkspace
  -> grepAgents (explicit @agent or automatic/native-tool route)
  -> WorkspaceAgentInvocation.new(uuid, workspace, user, thread)
  -> SSE agentInitWebsocketConnection(uuid)
  -> browser WebSocket /agent-invocation/:uuid
  -> AgentHandler.init
     -> load invocation workspace/user/thread/provider/model
     -> load built-ins + imported skills + flows + MCP tools
  -> AgentHandler.createAIbitat
  -> AgentHandler.startAgentCluster
  -> AIbitat provider exposes/reranks tool schemas
  -> model returns text or function/tool call
  -> AIbitat.handleExecution / handleAsyncExecution
  -> registered fn.handler(args)
  -> tool result event -> model iteration/final answer
  -> WebSocket chat/result events and WorkspaceChats persistence
```

- `server/endpoints/agentWebsocket.js` accepts the invocation UUID, constructs
  `AgentHandler`, and closes the invocation when the socket ends. The route does
  not use `validatedRequest`; possession and successful resolution of the
  invocation UUID are the observed rendezvous mechanism.
- `server/utils/agents/index.js#AgentHandler` reconstructs workspace/user/thread
  context from `workspace_agent_invocations` and selects agent provider/model.
- Developer API and scheduled jobs use
  `server/utils/agents/ephemeral.js#EphemeralAgentHandler`, which avoids the
  persisted invocation/WebSocket lifecycle while using the same AIbitat engine.
- `server/utils/agents/aibitat/index.js` maintains the function registry. Its sync
  and async execution paths invoke `fn.handler(args)` and feed results back into
  the agent loop. Tool schemas and provider adapters influence model selection;
  they are not authorization decisions.

### Intelligent tool selection

- Before a model call, AIbitat can call
  `server/utils/agents/aibitat/utils/toolReranker.js#ToolReranker`.
- The reranker uses embeddings over prompt/tool descriptions, parameters, and
  examples, then exposes a bounded top tool set. On reranker failure it returns
  the original tool inventory.
- This performs availability reduction/selection only. It does not bind an actor
  to capability/target/parameters, and it cannot be treated as deterministic
  authorization.

## Tool and skill execution systems

| Mechanism                | Registry/schema and selection                                                                        | Execution and side effects                                                                                                               | Existing approval/auth                                                                                  | Tests and Sentinel relevance                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Built-in AIbitat plugins | Agent settings and built-in plugin definitions; JSON-like function schemas; optional reranking       | `AIbitat` calls plugin `handler`; filesystem, SQL, web, email/calendar, file creation and other plugins have independent effect code     | Some tools call socket `requestToolApproval`; not universal and not deterministic policy                | Agent defaults/provider helper tests; candidate proposal hook plus per-effect controls         |
| Imported/custom skills   | File-backed plugin config under storage; `ImportedPlugin` loads schema and `handler.js`              | Handler module is loaded with Node `require` and runs in server process; can perform arbitrary module-permitted effects                  | Admin-only import/config/toggle/delete; runtime approval falls back according to handler/socket context | `server/__tests__/utils/agents/imported.test.js`; high-trust extension boundary                |
| MCP tools                | `MCPCompatibilityLayer` enumerates active server tools and converts input schemas to AIbitat plugins | Plugin handler calls `currentMcp.callTool`; real effect occurs in MCP process/remote server                                              | Admin config/toggle/suppression; no Sentinel capability/target/parameter authorization                  | No focused MCP test found; generic dispatch hook does not control remote internals             |
| Agent flows              | File-backed named flow with start/API/LLM/scrape nodes; exposed as `@@flow_<uuid>` plugin            | Outer AIbitat handler calls `AgentFlows.executeFlow`; `FlowExecutor` runs steps sequentially, including direct `fetch` in API-call steps | Admin flow management; commented direct execute endpoint; no shared per-step policy layer               | `agentFlows/executor.test.js`; outer proposal visible, inner actions need outcome/effect hooks |
| Scheduled tools          | Job stores prompt/tool identifier list; `ScheduledJob.availableTools` reuses available agent skills  | Worker creates `EphemeralAgentHandler`, executes AIbitat tools, persists trace to run                                                    | Endpoints single-user-only; worker overrides approval to approve all selected tool requests             | No scheduled-job focused test found; actor and unattended execution are Phase 1B priorities    |
| Developer API agent      | Same built-in/imported/flow/MCP loading via `EphemeralAgentHandler`                                  | Same AIbitat function dispatch and agent loop; REST/SSE event adapter                                                                    | API key only; workspace API passes no user                                                              | `apiChatHandler` path has no dedicated end-to-end auth test found                              |
| Direct UI/API mutations  | Express route-specific model/filesystem/vector calls                                                 | Workspace/user/document/settings deletes and mutations bypass the agent engine                                                           | Route middleware/role/workspace checks                                                                  | Must be audited separately from model-generated actions                                        |

The discovered built-in capability families are not one executor:

| Capability family            | Source                                                                                                | Real-effect boundary                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Web search/browsing          | `server/utils/agents/aibitat/plugins/web-browsing.js`                                                 | Provider-specific search and page `fetch` calls inside the plugin                              |
| Web scraping                 | `server/utils/agents/aibitat/plugins/web-scraping.js`                                                 | Scraper/collector-facing request inside the plugin                                             |
| Filesystem                   | `server/utils/agents/aibitat/plugins/filesystem/`                                                     | Individual read/search/write/edit/move/copy/directory handlers; search invokes bundled ripgrep |
| File creation                | `server/utils/agents/aibitat/plugins/create-files/`                                                   | Format-specific PDF/DOCX/XLSX/PPTX/text writers and output storage                             |
| SQL                          | `server/utils/agents/aibitat/plugins/sql-agent/`                                                      | Database connector/query implementations selected by the plugin                                |
| Gmail                        | `server/utils/agents/aibitat/plugins/gmail/`                                                          | Gmail bridge request actions, including draft/send/message mutations                           |
| Outlook                      | `server/utils/agents/aibitat/plugins/outlook/`                                                        | Microsoft token/API request bridge and mail mutations                                          |
| Google Calendar              | `server/utils/agents/aibitat/plugins/google-calendar/`                                                | Calendar bridge request actions and event mutations                                            |
| Memory/history/summarization | `server/utils/agents/aibitat/plugins/memory.js`, `chat-history.js`, `file-history.js`, `summarize.js` | Application/vector/history reads and writes or nested model work                               |

Tool approval calls occur in selected mutating handlers (for example filesystem,
mail, calendar, and file creation), while other read/network/model operations do
not share one approval requirement. Approval is also a user-interaction feature,
not deterministic authorization.

### MCP detail

- `server/utils/MCP/hypervisor/index.js#MCPHypervisor` loads a file-backed MCP
  server configuration, starts enabled stdio or remote SSE/streamable HTTP
  clients, carries configured environment/credentials, and handles connection
  timeouts and lifecycle.
- `server/utils/MCP/index.js#MCPCompatibilityLayer` lists active server tools,
  removes suppressed tools, converts each schema to an AIbitat function, and
  implements the handler with `callTool`.
- `server/endpoints/mcpServers.js` restricts reload/list/toggle/delete/tool
  suppression management to authenticated admins.
- **OBSERVED:** model-selected MCP calls enter AIbitat's ordinary function handler
  dispatch. **OBSERVED:** the effect itself then crosses the MCP transport and is
  controlled by the external server implementation.
- **UNKNOWN:** the pinned test suite contains no focused MCP transport/authorization
  regression proof, and remote-server redirect/credential behavior was not
  dynamically exercised in Phase 1A.

### Custom skill detail

- Community/import endpoints validate and unpack a plugin, write file-backed
  configuration, and leave management to authenticated admins.
- `server/utils/agents/imported.js` resolves a plugin directory and requires its
  `handler.js`. Tool parameters are emitted with a schema using
  `additionalProperties: false`, but schema adherence does not sandbox handler
  code.
- The handler receives plugin configuration, logging/introspection helpers, and
  runtime context. Side effects are bounded by the server process/container, not
  by a Sentinel policy boundary in the pinned baseline.

### Agent flow detail

- `frontend/src/pages/Admin/AgentBuilder/index.jsx` is the flow editor. It loads
  and saves through `frontend/src/models/agentFlows.js`; node components under
  `frontend/src/pages/Admin/AgentBuilder/nodes/` build the stored configuration,
  while the admin Agent Flows screens list, toggle, and delete flows.
- `server/utils/agentFlows/index.js#AgentFlows` validates storage paths, loads and
  saves flow JSON, creates an AIbitat plugin wrapper, and delegates execution.
- `server/utils/agentFlows/executor.js#FlowExecutor` executes supported node types
  sequentially. API-call nodes issue `fetch` directly; web-scraping and LLM nodes
  use their own helpers.
- The direct flow-execute HTTP route in `server/endpoints/agentFlows.js` is
  commented out in the pinned source. The active model path is through the flow
  plugin, but inner nodes do not re-enter the outer AIbitat function dispatcher.

### Scheduled tasks and effective actor

- `server/endpoints/scheduledJobs.js` permits management only in single-user mode.
  `BackgroundService` installs cron timers, creates a `scheduled_job_runs` row,
  and starts `server/jobs/run-scheduled-job.js` in a worker.
- The worker constructs `EphemeralAgentHandler({uuid, prompt})` without workspace,
  user, thread, or API-session context, attaches selected tools, and replaces the
  tool-approval callback with unconditional approval. It persists a structured
  execution trace and final status to the run row.
- **OBSERVED effective actor:** an instance-level scheduled/system execution,
  identified by job/run IDs, with no durable creating/triggering human identity
  in the job schema. Any later attribution to a human would be inference.

## Execution choke-point answer

**SINGLE UNIVERSAL CHOKEPOINT: PARTIAL**

| Field                       | Finding                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Candidate                   | `server/utils/agents/aibitat/index.js#handleExecution` and `#handleAsyncExecution`, specifically registered `fn.handler(args)` invocation                                                  |
| Covered                     | Model-selected built-in tools, imported skills, MCP compatibility tools, agent-flow outer calls, interactive agents, developer API agents, and scheduled ephemeral agents that use AIbitat |
| Not a final effect boundary | Flow handlers execute multiple inner nodes; MCP delegates to another process/server; imported JavaScript can perform arbitrary nested work; each built-in handler owns its real effect     |
| Bypasses                    | Direct HTTP/UI mutations, ingestion, background administrative work, and any connector path that does not use AIbitat; post-dispatch inner effects do not re-enter the candidate           |
| Authorization today         | Function availability/model selection and occasional approval prompts; no deterministic capability/target/parameter authorization                                                          |
| Confidence                  | High for the mapped AIbitat paths; medium for exhaustiveness across every optional integration                                                                                             |

**OBSERVED conclusion:** there is a common model-to-plugin dispatch point, but no
single universal point through which every real side effect passes. A future
design must not claim universal coverage by wrapping only `fn.handler(args)`.

**PROPOSED Phase 1C alternative:** use the AIbitat dispatch point to construct
and authorize a normalized proposal, while capability-specific restricted
executors (including flow-step and MCP adapters) enforce target/parameter policy
and produce outcome records. Direct application mutations require separate audit
observation hooks. This is not yet an architecture decision.

## Chat/activity persistence and existing logs

- `workspace_chats` is conversation state: prompt, serialized response, include
  flag, optional user/thread/API session, timestamps, and feedback/memory fields.
  Agent thoughts/outputs may be embedded in its response JSON.
- `workspace_agent_invocations` is a short-lived invocation rendezvous record,
  not a durable record of every proposed/executed tool call.
- `scheduled_job_runs.result` stores an execution trace for that subsystem only.
- `event_logs` stores event name, optional JSON metadata, optional user ID, and
  timestamp. `EventLogs.logEvent` is best-effort, logs failure, and returns rather
  than failing the protected mutation. Rows can be deleted by model helpers.
- Telemetry is optional operational/product telemetry. Console/Prisma logs are
  ephemeral operational output and use no universal structured correlation ID.

**OBSERVED:** chat history, scheduled traces, telemetry, and `event_logs` are
different application/operational records. None is a mandatory tamper-evident
security audit trail, and chat history must not be relabeled as one.

## Correlation identifiers

| Scope            | Existing identifier                             | Survival/limitation                                                        |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| HTTP request     | No general request ID middleware found          | Does not correlate route -> DB -> external effect globally                 |
| Workspace        | Integer ID and unique slug                      | Present through most browser/API chat and document paths                   |
| User             | Integer user ID                                 | Absent in single-user, API, and scheduled contexts                         |
| API client       | Secret lookup; optional API-key row/creator ID  | Middleware discards key row and does not establish actor context           |
| Chat             | Integer chat ID plus per-response UUID          | UUID correlates SSE chunks; chat ID appears after persistence              |
| Thread           | Integer ID and globally unique slug             | Carried through thread chat and invocation paths                           |
| Agent invocation | Unique invocation UUID                          | Links initial SSE handoff and interactive WebSocket lifecycle              |
| Agent tool turn  | AIbitat `msgUUID`; approval `requestId`         | Correlates emitter events inside an invocation, not all downstream effects |
| API session      | Caller-supplied `api_session_id`                | Partitions API chat; not an authenticated principal or idempotency key     |
| Scheduled task   | Job ID, run ID, worker-generated process/job ID | Strong inside scheduler, not linked to a human/workspace                   |
| Document/vector  | Document UUID (`docId`) and vector IDs          | Links Prisma mapping and vector records                                    |

## Network, filesystem, and process effects

### Network

- LLM/embedding/vector connectors call configured local or remote services.
- Agent flow API nodes call `fetch` on configured/generated targets.
- MCP supports child-process stdio and remote HTTP transports.
- Built-in web/search/scrape, Gmail, Outlook, calendar, SQL, and other integrations
  call external systems.
- URL ingestion sends a user-provided URL to collector download/scraping logic.
- Target normalization, redirects, credentials, and timeout behavior live in each
  adapter; no universal outbound-network authorization layer was found.

### Filesystem

- Application-internal storage includes SQLite, documents, LanceDB, uploads,
  plugin/flow/MCP config, and agent-created files.
- Collector reads temporary/watch paths, invokes parsers, and writes normalized
  document JSON.
- Built-in filesystem plugins read/search/write/move/copy/create within their
  configured/runtime rules; agent output handlers create downloadable files.
- Imported plugin JavaScript runs with server-process filesystem capability.

### Process/shell

- `server/utils/MCP/hypervisor/` starts stdio MCP server processes through the
  SDK transport.
- `server/utils/agents/aibitat/plugins/filesystem/search-files.js` invokes the
  bundled ripgrep binary with `spawnSync` and argument arrays.
- `collector/utils/WhisperProviders/ffmpeg/index.js` probes/invokes FFMPEG for
  media processing.
- `server/endpoints/utils.js` uses `execSync("git rev-parse HEAD")` for repository
  metadata, not agent command execution.
- These occurrences are not equivalent. Phase 1B must follow user/model influence
  separately for each runtime path.

## Representative side-effect inventory

| Operation                       | Effective actor and entry point                     | Backend authorization                                    | Effects/persistence/logging                                                             | Sentinel relevance                                                       |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Workspace create/update         | Browser user, workspace endpoints                   | Auth + role; membership on workspace-specific paths      | Prisma workspace/membership; best-effort event/telemetry on selected paths              | Governance configuration and mutation audit                              |
| Workspace delete/reset          | Browser/admin/API client, ordinary/admin/API routes | Route-specific role/membership or global API key         | Multiple Prisma deletes, Lance namespace deletion; best-effort event on ordinary paths  | Mandatory intent/outcome and partial-failure recovery                    |
| Document upload/embed           | User/API client -> server -> collector              | Route auth/workspace checks or API key                   | Temp/document files, parser, Ollama, LanceDB, Prisma mappings; selected event/telemetry | Untrusted content and cross-store outcome                                |
| Document removal                | User/API client, workspace/system routes            | Route-specific                                           | Prisma mapping/document delete, vector deletion, possible file deletion                 | Destructive multi-system operation                                       |
| Chat/agent request              | User/API client, chat/API endpoints                 | Session+membership or API key                            | LLM/network, vector reads, chat row; event/telemetry                                    | Guardrail observation and actor/correlation                              |
| Built-in tool call              | Delegated agent via AIbitat                         | Tool availability plus tool-specific/occasional approval | Network/file/DB/integration effects; telemetry, emitter results                         | Proposal normalization, deterministic authorization, restricted executor |
| MCP tool call                   | Delegated agent -> MCP plugin                       | Tool enabled/not suppressed; no Sentinel policy          | Remote process/network effect, result returned to agent                                 | Target/credential boundary and outcome audit                             |
| Agent flow                      | Delegated agent -> flow plugin                      | Flow enabled/available                                   | Sequential nested LLM/network/scrape effects                                            | One proposal can expand to multiple effects                              |
| Imported skill                  | Delegated agent -> required handler                 | Admin enables skill; runtime tool availability           | Arbitrary server-side JavaScript effects                                                | Trusted-extension policy and sandbox boundary                            |
| Scheduled execution             | System scheduled actor, BackgroundService           | Single-user configuration; unattended auto-approval      | Worker process, tool effects, scheduled run trace                                       | Missing human/workspace actor and fail-closed behavior                   |
| User/API-key deletion           | Admin or API client, admin routes                   | Admin session route or global API key                    | Prisma delete/cascades; selected event logs                                             | Privileged destructive audit                                             |
| Flow/plugin/MCP config deletion | Admin, management endpoints                         | Authenticated admin                                      | File/config/process changes                                                             | Changes future executable capability inventory                           |

This table is representative of security-relevant categories; it is not a claim
that every upstream route is a governed Sentinel operation.

## Trust-boundary map

| Boundary                             | Data crossing                                  | Validation/control observed                         | Phase 1B question                                                                   |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Browser -> server                    | JWT, prompt, settings, files, target IDs       | Express parsers, route middleware, model validation | Are all sensitive routes paired with resource authorization and bounded input?      |
| API client -> server                 | Global API key, workspace slug, prompt/session | Key secret lookup and route validation              | How is the key represented as an auditable actor and scoped?                        |
| Server -> collector                  | File/link processing request                   | Communication-key integrity verification            | What content/path/URL guarantees remain after transport authentication?             |
| Uploaded file -> parser              | Filename, MIME, bytes                          | Path/MIME/extension checks and converter selection  | Parser isolation, symlinks, decompression/resource exhaustion?                      |
| Collector -> document store          | Parsed text and metadata                       | Sanitized output naming                             | How is provenance/integrity retained without treating content as trusted?           |
| Server -> Ollama/provider            | Prompt, retrieved content, tools               | Provider adapters and context limits                | What fails closed, times out, or falls back on provider error?                      |
| Server -> LanceDB                    | Embeddings, namespace, metadata                | Workspace namespace and mapping rows                | Cross-store consistency and authorization of namespace operations?                  |
| Retrieved text -> LLM                | Untrusted chunks, pinned/parsed context        | Token/context assembly                              | Where should injection detection add denial signals without becoming authorization? |
| LLM output -> AIbitat                | Text/function name/arguments                   | Provider parsing/tool schema and registry lookup    | Where must schema, normalization, capability, target, and parameter checks occur?   |
| AIbitat -> plugin handler            | Parsed args and runtime context                | Generic function dispatch; optional approvals       | Which plugins bypass a restricted final-effect executor?                            |
| Flow handler -> node executor        | Flow config/intermediate values                | Node-type switch                                    | Can one authorization safely cover expanded nodes?                                  |
| MCP adapter -> MCP server            | Tool name/arguments/credentials                | MCP schema/transport                                | How are remote target identity, redirects, and results constrained?                 |
| Scheduler -> worker/agent            | Stored prompt/tool set, job/run IDs            | Queue limits/status rows                            | What principal, workspace, and policy snapshot governs unattended work?             |
| Frontend permission state -> backend | Hidden/visible controls                        | Independent backend middleware on mapped routes     | Which remaining presentation gates lack equivalent server checks?                   |

## Frontend architecture and future consumers

- `frontend/src/main.jsx` builds the browser router, lazy-loads workspace chat,
  workspace settings, system settings, agent builder, logs, and scheduled-job
  screens, and wraps protected routes.
- `frontend/src/pages/WorkspaceSettings/index.jsx` is the tab shell for general,
  chat, vector, members, and agent configuration. Its forms use
  `frontend/src/models/workspace.js#Workspace.update`.
- `frontend/src/components/WorkspaceChat/` owns prompt input, history, sources,
  streaming state, agent WebSocket state, attachments, abort, and chat controls.
- `frontend/src/models/` is the principal fetch client layer; authentication
  headers come from shared API helpers.
- Admin logs at the existing logging route consume operational event records.

**PROPOSED UI candidates:** a workspace governance tab beside existing settings,
an audit viewer as a separately protected administrative/workspace route, and
execution/denial state as new typed stream/WebSocket events consumed by
`handleChat`. These candidates require corresponding backend authorization and
must not rely on visibility controls for security.

## Error, retry, streaming, and cleanup patterns

- Express endpoints predominantly use local `try/catch`, `console.error`, and
  JSON/HTTP status responses. Error envelope shape is not uniform.
- Browser chat turns failures into closed SSE abort/status events; frontend fetch
  clients also handle transport errors/abort through `AbortController`.
- Provider adapters throw or return provider-specific failures; chat handlers
  translate representative Ollama/LLM errors to response events. Phase 0 proved
  explicit local Ollama outage and invalid-model failures without cloud fallback.
- Vector, Prisma model, event-log, collector, and plugin helpers frequently catch
  errors and return null/false/error objects. Callers vary in whether they stop,
  partially continue, or compensate.
- Agent tool errors return through AIbitat event/result paths and can influence
  subsequent model iterations. MCP/flow/imported implementations add their own
  error boundaries.
- Scheduled execution has queued/running/completed/failed/timed-out states and
  worker cleanup/kill paths. `ScheduledJobRun.start` uses a transaction for run
  state; the external tool effects are not part of that transaction.

**INFERRED:** protected Sentinel decisions cannot inherit a generic best-effort
logging convention. Governance/authorization errors must stop before execution,
and audit-write failure semantics must be explicit and fail closed.

## Existing test architecture

- The repository uses Jest from root scripts; server and collector tests live in
  their own `__tests__` trees. Frontend has build/lint validation but no frontend
  unit test files were found in the pinned tree.
- Relevant chat/provider tests:
  `server/__tests__/utils/chats/openaiCompatible.test.js` and
  `server/__tests__/utils/chats/openaiHelpers.test.js`.
- Relevant agent tests:
  `server/__tests__/utils/agents/defaults.test.js`,
  `server/__tests__/utils/agents/imported.test.js`,
  `server/__tests__/utils/agents/aibitat/emitter.test.js`, and provider helper
  tests under `server/__tests__/utils/agents/aibitat/providers/helpers/`.
- Flow tests: `server/__tests__/utils/agentFlows/executor.test.js`.
- File/path tests: `server/__tests__/utils/files/isWithin.test.js` plus collector
  URL, download, converter, Confluence, and FFMPEG tests.
- Retrieval-adjacent tests include
  `server/__tests__/utils/vectorDbProviders/pgvector/index.test.js` and
  `server/__tests__/utils/TextSplitter/index.test.js`.
- Authorization-adjacent coverage includes
  `server/__tests__/utils/middleware/workspaceDeletionProtection.test.js`.

**OBSERVED gaps relevant to future Sentinel work:** no focused pinned tests were
found for browser route authorization as an integrated matrix, MCP transports,
LanceDB/Ollama adapters, scheduled-agent identity/approval, or frontend stream
permission states. Sentinel tests should extend the existing Jest/server and
frontend conventions rather than create another framework.

## Candidate Sentinel control points

| Sentinel concern                      | Candidate hook and exact source                                                                                       | Coverage/advantages                                                       | Risks and known bypasses                                                                                    | Alternative                                                                       | Confidence                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| Audit observation                     | Route/service mutation boundary plus dedicated Prisma audit module                                                    | Captures actor/resource intent near mutation; queryable                   | Many endpoints and external stores; existing helpers swallow errors                                         | Central mutation services with transaction client; hybrid intent/outcome adapters | Medium                            |
| Workspace governance resolution       | After `validWorkspaceSlug` / `validWorkspaceAndThreadSlug`                                                            | Authorized workspace already resolved for browser paths                   | API handlers resolve directly; scheduled context absent; repeated lookups                                   | Shared request/workspace-context service used by all entry paths                  | High for browser, medium globally |
| Chat guardrail                        | `streamChatWithWorkspace` before provider call, plus equivalent `ApiChatHandler` and compatible/embed entry adapters  | Context, actor, workspace, and mode are available                         | No universal chat function; pinned/parsed context joins at different points; agent handoff splits transport | Shared isolated guardrail service called by every chat entry                      | High                              |
| Agent proposal interception           | `AIbitat.handleExecution/#handleAsyncExecution` before `fn.handler(args)`                                             | Common model-selected function dispatch; has name/args/invocation context | Generic args, flows/MCP/imported nested effects, direct mutations bypass                                    | Provider-specific proposal normalizer feeding one policy API                      | High                              |
| Deterministic execution authorization | New isolated Sentinel authorizer called before handler dispatch and again in capability-specific restricted executors | Can enforce capability/target/parameter order and fail closed             | A single generic wrapper overstates final-effect coverage                                                   | Per-capability adapters with common policy contract                               | Medium; Phase 1C decision         |
| Outcome audit                         | Around concrete plugin/flow-step/MCP executor plus direct mutation service                                            | Records actual success/failure close to effect                            | Distributed hooks and partial failure; remote outcomes may be ambiguous                                     | Standard executor result contract and correlation context                         | Medium                            |
| Frontend governance settings          | `frontend/src/pages/WorkspaceSettings/` + `Workspace.update`-style dedicated API client                               | Matches existing workspace UX structure                                   | Reusing generic update risks weak schema/auth separation                                                    | Dedicated governance endpoints/model client                                       | High location, decision pending   |
| Audit viewer                          | Protected route in `frontend/src/main.jsx`; dedicated backend query API                                               | Existing admin logging provides navigation precedent                      | Existing event log is insufficient and viewer must enforce scope                                            | Workspace and admin views over one audit query service                            | High location, decision pending   |

## Workspace governance choke-point answer

| Field             | Finding                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate         | Authorized workspace middleware followed by a request-scoped governance resolver                                                                                    |
| Consistent today? | No: browser routes use middleware, developer API routes often call `Workspace.get`, interactive agents reload by invocation, and scheduled agents have no workspace |
| Cache             | No governance cache exists; workspace/provider data is repeatedly resolved                                                                                          |
| Risk              | Stale profiles, API bypass, or an undefined scheduled policy if only middleware is patched                                                                          |
| Alternative       | Require an explicit `ExecutionContext`/workspace context at every chat/agent/direct-operation service boundary                                                      |
| Confidence        | High                                                                                                                                                                |

## Upstream-compatibility assessment

- High-value low-divergence seams are middleware-adjacent services, chat handler
  calls, the AIbitat handler dispatch boundary, Prisma models/migrations, typed
  event adapters, and dedicated frontend routes/components.
- Sentinel logic should remain in dedicated modules with narrow calls from pinned
  upstream files. Copying chat handlers, provider registries, agent frameworks, or
  workspace models would duplicate rapidly changing upstream behavior.
- The highest rebase-risk files are `server/index.js`, large workspace/API route
  modules, `stream.js`, `apiChatHandler.js`, AIbitat core, Prisma schema, and
  `frontend/src/main.jsx`. Hooks should be small and covered by focused tests.
- Agent tools do not converge at a universal final-effect executor. Pretending
  otherwise would reduce patch count at the cost of incomplete security coverage.
- Existing provider, vector, collector, and UI abstractions should be reused where
  their semantics match. Security-sensitive policy state and mandatory audit need
  explicit Sentinel contracts rather than overloaded telemetry/chat history.
- No post-`v1.15.0` upstream code was required to answer Phase 1A, so no newer
  upstream comparison, merge, or baseline change was performed.

## Highest-priority questions for Phase 1B

1. Which direct routes and agent capabilities are protected assets/operations,
   and what authorization matrix applies to single-user, multi-user, API, and
   scheduled actors?
2. Is invocation-UUID possession an acceptable WebSocket continuation boundary,
   and how should an invocation remain bound to its authenticated initiator?
3. How should global API keys be represented, scoped, revoked, and audited when
   middleware currently discards key/creator identity?
4. What actor and workspace policy govern scheduled execution, especially its
   unconditional approval override?
5. Which built-in/imported/MCP/flow actions can perform filesystem, network,
   database, credential, or process effects, including nested/bypass paths?
6. What SSRF/redirect/DNS/credential rules apply to URL ingestion, flow API calls,
   web tools, and remote MCP?
7. What parser/plugin sandbox and resource-exhaustion assumptions are acceptable
   for uploads, imported JavaScript, MCP stdio, and media conversion?
8. Which mutations must fail if mandatory audit cannot be committed, and how are
   external partial effects recovered or reconciled?
9. What sensitive values can reach console, telemetry, event metadata, chat
   output, tool results, or frontend responses?
10. Where can retrieved/pinned/attached untrusted text influence model proposals,
    and what denial-only semantic signals are appropriate?

## Decisions reserved for Phase 1C

- Actor/execution-context representation across user, API, scheduled, and agent
  delegation.
- Dedicated audit schema/store, integrity/checkpoint protocol, transaction and
  external-effect recovery design.
- Workspace governance profile storage, resolution, caching, and version snapshot.
- Shared chat guardrail service and all required entry adapters.
- Normalized action proposal schema and capability registry.
- AIbitat interception plus capability-specific restricted executor architecture.
- MCP, imported-skill, and agent-flow trust/authorization contracts.
- Typed stream/WebSocket authorization and outcome event contract.
- Minimal upstream patch boundaries and ADRs. No ADR is created by Phase 1A.

## Known unknowns

- Exhaustive authorization parity for every optional/mobile/embed/connector route
  was not dynamically tested.
- Every third-party provider/integration's timeout, redirect, and credential
  redaction behavior was not exhaustively traced.
- MCP remote and stdio behavior lacks focused pinned tests in the discovered suite.
- Optional/custom plugin code can add behavior not knowable from the pinned core.
- SQLite write contention and ordering under future audit load require targeted
  Phase 2 experiments.
- Cross-store crash recovery among SQLite, LanceDB, filesystem, collector, and
  external tools is not centrally specified.
- A stable scheduled human owner/workspace/policy snapshot does not exist in the
  observed schema.
- No global correlation identifier survives browser/API request through every
  model, tool, database, and outcome path.

## Phase 1A Definition of Done evidence

- [x] `docs/CODEBASE_NOTES.md` exists — this document.
- [x] Chat pipeline mapped — browser, thread, API, mode, SSE, WebSocket, provider,
      and persistence paths above.
- [x] Retrieval pipeline mapped — embedding, LanceDB lookup, context assembly,
      prompt, generation, and sources above.
- [x] Workspace model/schema mapped — workspace lifecycle, relations, resources,
      settings UI/API, and governance lookup analysis above.
- [x] Migration process mapped — Prisma schema/migrations, Docker deploy, legacy
      pragma distinction, transactions, and concurrency above.
- [x] Auth/authz surfaces mapped — session, roles, membership, API key, frontend,
      agent, and scheduled contexts above.
- [x] Agent/tool/MCP surfaces mapped — AIbitat, built-ins, imported skills, MCP,
      flows, scheduled/API variants, and bypasses above.
- [x] Relevant tests identified — existing suites and gaps above.
- [x] No functional governance code changed — Phase 1A changes documentation only.
- [x] `PROGRESS.md` updated — tracked with this work unit.
