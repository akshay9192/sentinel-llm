# AGENTS.md

## Purpose

This file defines the operating rules for AI coding agents working in this repository.

The objective is not merely to generate code. The objective is to make the smallest correct, maintainable, secure, well-tested change that satisfies the user's actual request while preserving the repository's existing contracts and conventions.

These instructions intentionally combine two ideas:

1. **LLM coding discipline:** think before editing, surface assumptions, avoid speculative work, make surgical changes, define success criteria, and verify the result rather than trusting intuition.
2. **Clean-code engineering discipline:** keep code readable, consistent, cohesive, well-named, testable, appropriately encapsulated, and free from unnecessary complexity.

When these ideas conflict, correctness, user intent, repository-specific rules, and minimal scope take priority over stylistic cleanup.

---

# 1. Instruction Precedence

When deciding what to do, follow this order of authority:

1. Explicit instructions from the user for the current task.
2. Security, privacy, legal, and data-safety constraints.
3. Repository-specific instructions in the nearest applicable `AGENTS.md`, `CONTRIBUTING.md`, project documentation, CI configuration, test configuration, formatter, linter, type checker, and build tooling.
4. Existing public contracts and behavior of the codebase.
5. Existing local patterns in the files and modules being changed.
6. This repository-wide `agents/AGENTS.md`.
7. General language/framework conventions.
8. Personal stylistic preference.

A deeper `AGENTS.md` overrides this file for files within its directory tree when the instructions conflict.

Never ignore an existing project convention merely because another design appears theoretically cleaner.

---

# 2. Core Operating Principle

For every task:

> Understand first. Identify the root cause. Define success. Change as little as necessary. Verify with evidence. Review the final diff.

## 2.1 Mandatory Task Preflight

At the start of every new coding task or requested repository change, before running
other repository commands or editing files:

1. Read `agents/AGENTS.md` in full.
2. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .agents/preflight.ps1
   -Acknowledge` from the repository root.
3. Before touching files in a subdirectory, locate and read any deeper applicable
   `AGENTS.md` files.

The acknowledgement records that the agent has read the instructions; the script
cannot itself prove comprehension. If the preflight fails, stop and resolve the
reported problem before continuing.

Do not equate more code with more progress.

Do not equate a green-looking implementation with a verified implementation.

Do not treat the repository as a blank slate.

---

# 3. Agent Mindset

## 3.1 Do not guess silently

If an assumption materially affects behavior, architecture, compatibility, security, data, or the user's expected outcome, make the assumption explicit in your reasoning or resolve it from repository evidence.

Examples of material assumptions:

- whether an API is public or internal;
- whether a schema migration must be backward compatible;
- whether a function is called concurrently;
- whether an endpoint must preserve an existing response shape;
- whether a configuration key is required in production;
- whether generated files are committed;
- whether a failing test is pre-existing;
- whether a browser feature must support mobile/touch/keyboard;
- whether a command can safely mutate data.

Do not ask the user questions that the repository can answer.

Inspect code, tests, configuration, history, documentation, call sites, or schemas first.

## 3.2 Distinguish facts from hypotheses

When debugging, do not present a plausible explanation as a confirmed root cause.

Use this mental model:

- **Observed:** directly supported by logs, code, tests, reproduction, stack traces, or repository evidence.
- **Inferred:** strongly suggested by evidence but not yet proven.
- **Unknown:** insufficient evidence.

Try to convert important inferences into observations before editing.

## 3.3 Prefer evidence over intuition

Use actual repository evidence:

- tests;
- types;
- interfaces;
- schemas;
- call sites;
- compiler errors;
- runtime errors;
- logs;
- profiling output;
- CI configuration;
- package manifests;
- lockfiles;
- migration history;
- API definitions;
- existing user-facing behavior.

Do not invent behavior based only on what a framework usually does.

---

# 4. Task Classification Before Editing

Before making changes, classify the task. Different task types require different verification.

## 4.1 Bug fix

Required approach:

1. Understand the reported behavior.
2. Reproduce it when practical.
3. Identify the root cause.
4. Write or identify a test that demonstrates the failure when practical.
5. Implement the smallest root-cause fix.
6. Run the regression test.
7. Run nearby relevant tests.
8. Inspect the diff for accidental changes.

Avoid symptom patches unless the root cause is outside the repository or cannot safely be changed.

## 4.2 Feature

Required approach:

1. Identify the desired user-visible or API-visible behavior.
2. Find analogous features or patterns in the repository.
3. Define acceptance criteria.
4. Determine affected boundaries and contracts.
5. Implement the minimum complete feature.
6. Add appropriate tests.
7. Verify integration points.
8. Update documentation only where behavior/setup/API changed.

Do not add adjacent features because they appear useful.

## 4.3 Refactor

Required approach:

1. Establish current behavior with tests or other evidence.
2. Define what must remain unchanged.
3. Refactor in small steps.
4. Run tests before and after meaningful changes.
5. Avoid changing public behavior unless explicitly requested.
6. Avoid combining unrelated feature work with the refactor.

A refactor is not an excuse to redesign the project.

## 4.4 Performance optimization

Required approach:

1. Identify the actual bottleneck.
2. Measure baseline behavior when practical.
3. Determine whether the bottleneck is algorithmic, I/O-bound, network-bound, database-bound, memory-bound, CPU-bound, render-bound, or synchronization-bound.
4. Make the narrowest effective optimization.
5. Measure again.
6. Preserve readability unless the measured benefit justifies complexity.

Never optimize based solely on aesthetic concerns.

## 4.5 Security fix

Required approach:

1. Identify the trust boundary.
2. Determine the attack path or unsafe behavior.
3. Fix the root cause at the correct boundary.
4. Preserve or improve authentication, authorization, validation, logging, and error handling.
5. Add focused security/regression tests where possible.
6. Check that the fix does not create a bypass elsewhere.
7. Avoid disclosing secrets or sensitive data in tests, logs, or examples.

Do not weaken a security control just to make a request pass.

## 4.6 Documentation-only change

Do not modify production code unless documentation reveals a genuine inconsistency that the user asked to resolve.

Verify documentation against actual code/configuration before stating commands, endpoints, environment variables, supported versions, or behavior.

---

# 5. Repository Reconnaissance

Before editing a non-trivial task, inspect enough of the repository to understand the local system.

## 5.1 Start narrow

Begin with files directly related to the request.

Then inspect only what is necessary:

- call sites;
- definitions;
- interfaces;
- tests;
- configuration;
- schemas;
- nearby modules;
- package manifests;
- relevant CI steps.

Do not read the entire repository without a reason.

## 5.2 Determine project structure

Identify as relevant:

- application entry points;
- package/workspace boundaries;
- frontend/backend separation;
- shared libraries;
- test directories;
- migrations;
- generated-code locations;
- public API definitions;
- infrastructure/deployment files;
- scripts;
- formatting/lint/typecheck commands.

## 5.3 Identify established commands

Prefer commands already defined by the project, such as:

- `npm test`, `pnpm test`, `yarn test`;
- `pytest`;
- `go test ./...`;
- `cargo test`;
- `mvn test`, `gradle test`;
- project-specific scripts;
- formatter/linter scripts;
- CI commands.

Do not create a new validation workflow when the project already has one.

## 5.4 Check working-tree state

Before modifying files, account for existing user changes.

Do not overwrite, discard, reset, clean, or rewrite work that you did not create.

If unrelated modified files exist, leave them alone.

If the task overlaps a user-modified file, preserve the user's changes and edit carefully.

---

# 6. Planning Standard

For non-trivial work, create a short execution plan with verification attached to each step.

Good plan:

```text
1. Trace authentication failure through middleware and token parser.
   Verify: reproduce with existing failing request/test.

2. Correct expiration handling in token validation only.
   Verify: regression test covers expired and valid tokens.

3. Run authentication test suite and type checker.
   Verify: all relevant checks pass.

4. Inspect final diff for unrelated changes.
```

Bad plan:

```text
1. Fix auth.
2. Improve code.
3. Test it.
```

Plans should be concrete enough to determine when the task is done.

Do not create elaborate plans for trivial edits.

---

# 7. Define Success Before Implementation

Translate vague tasks into observable success criteria.

Examples:

### “Fix the upload bug”

Better success criteria:

- the previously failing file can be uploaded;
- invalid files are still rejected;
- upload size limits remain enforced;
- the regression test passes;
- existing upload tests continue to pass.

### “Add validation”

Better success criteria:

- invalid input returns the documented error;
- valid input remains accepted;
- validation occurs at the correct boundary;
- tests cover required boundary cases.

### “Make the page responsive”

Better success criteria:

- layout works at the project's supported widths;
- no horizontal overflow;
- controls remain accessible by keyboard/touch;
- content remains readable;
- existing desktop behavior is preserved unless intentionally changed.

A task is not complete until the success criteria have been checked.

---

# 8. Surgical Change Policy

This is one of the most important rules.

Every changed line should be explainable in relation to the user's request, necessary supporting work, or cleanup caused directly by your own change.

## 8.1 Do not perform unrelated cleanup

Do not:

- reformat unrelated sections;
- rename unrelated variables;
- reorganize imports across untouched files;
- convert style patterns repository-wide;
- modernize syntax unrelated to the task;
- replace libraries without necessity;
- restructure folders because you prefer another architecture;
- remove pre-existing dead code unless requested;
- rewrite comments unrelated to the change;
- change unrelated dependencies.

If unrelated problems are discovered, mention them separately.

## 8.2 Clean your own footprint

If your change causes something to become obsolete, clean it up.

Examples:

- remove imports your change made unused;
- remove a helper replaced by your implementation if no longer referenced;
- remove temporary logging/debug code;
- remove superseded test fixtures created by your change;
- update comments that your change made inaccurate.

## 8.3 Apply the Boy Scout principle locally

Improve clarity in the exact code you must touch when the improvement supports the requested change.

Do not turn “leave it cleaner” into permission for broad refactoring.

---

# 9. Simplicity First

Write the minimum code needed for a complete solution.

## 9.1 Avoid speculative architecture

Do not create extension points for hypothetical future needs.

Avoid unnecessary:

- factories;
- registries;
- service locators;
- plugin systems;
- strategy hierarchies;
- generic repositories;
- wrapper classes;
- adapters around stable local APIs;
- configuration flags;
- feature toggles;
- dependency-injection frameworks;
- event buses;
- custom DSLs;
- metaprogramming;
- generalized utilities.

Use them only when the repository already uses them or the current task demonstrates a real need.

## 9.2 Do not abstract one occurrence prematurely

A small block of obvious code is often better than a generic helper used once.

Extract when extraction improves one or more of:

- clarity;
- reuse across real call sites;
- testability;
- separation of concerns;
- domain meaning;
- isolation of side effects;
- reduction of meaningful duplication.

## 9.3 Avoid defensive code for impossible states

Use actual contracts and types.

Do not add layers of checks for states that cannot occur unless:

- input crosses a trust boundary;
- external systems are unreliable;
- a documented contract allows the state;
- the language/runtime cannot enforce the invariant;
- historical evidence shows the state occurs.

Excess defensive code can obscure real invariants.

---

# 10. Root-Cause Debugging Protocol

When debugging, use a disciplined process.

## 10.1 Reproduce

Prefer a minimal reliable reproduction.

Capture:

- input;
- environment assumptions;
- error/incorrect output;
- relevant logs;
- stack trace;
- failing test;
- expected behavior.

## 10.2 Trace backward from the failure

Identify where the incorrect state first becomes incorrect.

Do not patch only the final visible symptom if the bad state originated earlier.

## 10.3 Inspect invariants

Ask:

- What should always be true here?
- Where is that invariant established?
- Where is it first violated?
- Why did existing validation/types/tests not catch it?

## 10.4 Prefer deterministic fixes

Do not use unexplained:

- retries;
- sleeps;
- timeout increases;
- race-dependent workarounds;
- broad exception suppression;
- cache clearing;
- random reinitialization;
- duplicate state writes.

If retries are legitimately required for an unreliable external dependency, define:

- which failures are retryable;
- maximum attempts;
- backoff policy;
- idempotency behavior;
- timeout behavior;
- observability.

## 10.5 Prove the fix

A bug fix should ideally include a regression test that would have failed before the change.

If a test is impractical, use the strongest alternative evidence and report it.

---

# 11. Clean Naming Rules

Names should reduce the amount of explanation required to understand the code.

## 11.1 Prefer domain names

Use terminology already used by the product, protocol, schema, or business domain.

Good:

- `assessmentResult`
- `invoiceTotal`
- `retryDeadline`
- `authenticatedUser`
- `frameworkDocument`

Weak:

- `data`
- `result2`
- `obj`
- `thing`
- `stuff`
- `tmp`
- `helper`
- `manager`

Generic words are acceptable only when their scope makes meaning obvious.

## 11.2 Make distinctions meaningful

Avoid pairs like:

- `userData` / `userInfo` when no distinction is obvious;
- `process()` / `handle()` / `manage()` without domain meaning;
- `item1`, `item2`;
- `newValue`, `oldValue` outside a small local transformation.

## 11.3 Use searchable names

Important concepts should be discoverable with repository search.

Avoid unexplained single-letter names except for conventional, tiny scopes such as indices or mathematical notation.

## 11.4 Avoid type encodings

Do not encode implementation details into names when the language/type system already expresses them.

Avoid unnecessary prefixes/suffixes such as:

- `strName`;
- `arrUsers`;
- `IUserInterface` solely because it is an interface;
- Hungarian notation.

Follow project conventions when established naming differs.

## 11.5 Magic values

Replace a literal with a named constant when:

- it has domain meaning;
- it is reused;
- changing it requires coordinated edits;
- its meaning is not obvious from context.

Do not create constants like `ONE = 1` or `EMPTY_STRING = ""` merely to avoid literals.

---

# 12. Function Design

## 12.1 One coherent responsibility

A function should represent one understandable operation at its level of abstraction.

It may contain multiple steps if those steps form one coherent operation.

Avoid arbitrary line-count rules.

## 12.2 Keep abstraction levels coherent

Do not mix high-level orchestration with low-level parsing, SQL construction, DOM manipulation, or cryptographic details in the same function when separation would improve clarity.

## 12.3 Prefer descriptive function names

Names should describe intent rather than mechanism when possible.

Prefer:

- `validateCheckoutRequest()`
- `calculateRenewalDate()`
- `loadAssessmentEvidence()`

Over:

- `doCheck()`
- `processData()`
- `runLogic()`

## 12.4 Limit parameters

Prefer a small meaningful parameter list.

If a function requires many loosely related parameters, investigate whether:

- responsibilities are mixed;
- a domain value object already exists;
- a request/context structure would make the contract clearer.

Do not create a parameter object solely to reduce the visible parameter count if it has no semantic meaning.

## 12.5 Avoid ambiguous boolean flags

Calls like:

```text
saveUser(user, true, false)
```

are difficult to understand.

Prefer explicit operations or named option objects when appropriate.

Do not mechanically eliminate every boolean parameter; a clearly named boolean can be appropriate when it represents actual data rather than selecting unrelated behavior.

## 12.6 Make side effects clear

A function named `getUser()` should not unexpectedly mutate persistent state.

Separate reads and writes when practical.

If side effects are essential, make them clear through naming, placement, or documentation.

---

# 13. Control Flow

## 13.1 Reduce unnecessary nesting

Use early returns/guards when they make the main path easier to read.

## 13.2 Prefer positive conditions where clearer

Avoid mentally expensive double negatives.

Prefer:

```text
if user.isActive
```

Over:

```text
if !user.isInactive
```

Do not rename established APIs solely to enforce this preference.

## 13.3 Branching versus polymorphism

Repeated type-driven branching can indicate a missing abstraction, but polymorphism is not automatically superior.

Use polymorphism, dispatch tables, strategies, or handlers when they reduce real repetition and improve extensibility for existing cases.

Keep a small `if`/`switch` when it is clearer and simpler.

Do not introduce inheritance hierarchies solely to remove a three-line branch.

## 13.4 Boundary conditions

Centralize tricky boundary logic when practical.

Examples:

- inclusive/exclusive date boundaries;
- pagination limits;
- array/index boundaries;
- size limits;
- timeout thresholds;
- timezone conversion;
- rounding rules;
- rate limits;
- schema version boundaries.

Boundary behavior should be explicit and tested.

---

# 14. Objects, Modules, and Data Structures

## 14.1 Encapsulate invariants

A domain object should protect important invariants where appropriate.

Examples:

- valid email/address types;
- non-negative money;
- valid date ranges;
- identifiers with required format;
- state transitions.

Do not create value-object classes for every primitive. Use them where they materially improve correctness or domain clarity.

## 14.2 Hide internal structure

Expose operations or stable data contracts rather than leaking unnecessary internals.

Avoid callers reaching through long chains of internal objects.

## 14.3 Avoid confused hybrids

Be clear whether a structure is primarily:

- a data carrier;
- a domain object with behavior/invariants;
- a service coordinating operations.

Do not create objects that expose all state publicly while also pretending to enforce internal invariants.

## 14.4 Keep responsibilities cohesive

A module/class should have a focused reason to change.

Large modules are not automatically wrong, but mixed responsibilities should be separated when they impede comprehension, testing, or safe modification.

## 14.5 Law of Demeter as a guideline

Prefer dependencies on immediate collaborators rather than distant internals.

Avoid chains like:

```text
order.customer.account.billing.profile.address.country
```

when a stable domain operation could express the intent.

Do not create trivial forwarding methods everywhere merely to satisfy this guideline mechanically.

---

# 15. Dependency Injection and Boundaries

Use dependency injection when it improves testability, substitutability, or separation from external systems.

Good candidates:

- databases;
- HTTP clients;
- message queues;
- filesystem interfaces;
- clocks;
- randomness;
- email/SMS providers;
- external AI/model clients;
- payment gateways.

Do not introduce a DI container/framework for a simple object graph unless the project already uses one.

Constructor injection or explicit function parameters are often sufficient.

---

# 16. Configuration

## 16.1 Keep true configuration visible

Configuration that varies by environment or deployment should generally be represented at an appropriate high-level boundary.

Examples:

- service URLs;
- timeouts;
- feature availability;
- resource limits;
- credentials via secure environment/secret systems;
- model selection where legitimately configurable.

## 16.2 Prevent over-configurability

Do not expose every implementation detail as a configuration option.

Configuration has a maintenance cost.

Only add configuration when a real deployment/operator/user need exists.

## 16.3 Validate configuration early

Required configuration should fail clearly and early rather than creating mysterious downstream failures.

Do not log secret configuration values.

---

# 17. Error Handling

## 17.1 Do not swallow errors

Avoid broad patterns like:

```text
try:
    ...
except Exception:
    pass
```

unless deliberately justified and observable.

## 17.2 Preserve context

When wrapping an error, preserve the original cause/stack where the language supports it.

Add context that helps diagnose the operation that failed.

## 17.3 Use appropriate error boundaries

Handle errors where meaningful recovery or translation is possible.

Examples:

- domain layer returns domain failure;
- API boundary translates it to HTTP response;
- job runner records failure/retry state;
- UI presents actionable feedback.

Do not catch and rethrow unchanged errors at every layer.

## 17.4 Avoid leaking internals

Public error messages should not expose:

- stack traces;
- database details;
- filesystem paths;
- internal hostnames;
- secrets/tokens;
- implementation details useful to an attacker.

Log detailed diagnostics securely where appropriate.

---

# 18. Comments and Documentation

## 18.1 Code should explain what; comments should explain why

Prefer clear naming and structure for obvious behavior.

Useful comments explain:

- non-obvious intent;
- external constraints;
- protocol quirks;
- compatibility requirements;
- invariant reasoning;
- security concerns;
- non-obvious performance decisions;
- why an apparently simpler approach is unsafe.

## 18.2 Avoid noise

Do not add comments that merely translate syntax into English.

Bad:

```text
// Increment counter by one
counter += 1
```

## 18.3 No commented-out code

Delete obsolete code. Version control preserves history.

## 18.4 Keep comments accurate

If behavior changes, update nearby comments and docs that would become misleading.

## 18.5 Documentation scope

Update documentation when the change affects:

- setup;
- environment variables;
- public APIs;
- commands;
- deployment;
- user behavior;
- external integrations;
- operational procedures.

Do not create new Markdown files reflexively for minor internal implementation changes.

---

# 19. Source Code Organization

Follow repository formatting first. Within that constraint:

- keep strongly related code near each other;
- declare variables close to first use;
- keep dependent private helpers reasonably close to callers when local style supports it;
- use whitespace to separate concepts;
- avoid arbitrary horizontal alignment that creates formatting churn;
- avoid excessively long lines when they harm readability;
- maintain consistent indentation;
- keep public/high-level flow easy to discover.

Do not reorder an entire file merely to satisfy these preferences during a small task.

---

# 20. Testing Philosophy

Tests are executable statements of expected behavior.

## 20.1 Test behavior, not implementation trivia

Prefer testing observable contracts.

Avoid assertions that break whenever private implementation details are refactored without behavior changing.

## 20.2 Regression tests for bugs

For a bug fix, prefer a test that:

1. demonstrates the previously failing scenario;
2. fails on the old behavior;
3. passes after the fix.

## 20.3 Test important boundaries

Consider relevant cases such as:

- empty input;
- minimum/maximum values;
- just-below/at/just-above thresholds;
- invalid format;
- unauthorized/forbidden access;
- missing resources;
- duplicates;
- concurrency when relevant;
- timeout/error behavior for external boundaries;
- locale/timezone/date transitions;
- serialization/deserialization edges.

Do not generate combinatorial test explosions for irrelevant theoretical cases.

## 20.4 Tests should be FIRST-like

Tests should generally be:

- **Fast enough** for their intended layer;
- **Independent** where possible;
- **Repeatable/deterministic**;
- **Self-checking** through clear assertions;
- **Timely** and maintained with the code they protect.

## 20.5 Assertion count

There is no mandatory one-assert-per-test rule.

Prefer one coherent behavior per test.

Multiple assertions are acceptable when they jointly describe that behavior more clearly.

## 20.6 Avoid test cheating

Do not:

- delete failing tests to make CI green;
- weaken assertions without requirement changes;
- add arbitrary sleeps;
- globally mock the code under test;
- skip/flaky-mark tests without understanding why;
- update snapshots blindly without reviewing behavior;
- mock so much that the test can no longer detect the bug.

## 20.7 Test layer selection

Use the lowest layer that reliably validates the behavior.

- Unit tests for isolated logic.
- Integration tests for boundaries between real components.
- End-to-end tests for critical user flows and system contracts.

Do not use expensive E2E tests for logic that a focused unit test can prove.

---

# 21. Verification Ladder

Verification is mandatory.

Use the strongest practical checks for the change.

A typical order:

1. Reproduction/regression test.
2. Focused tests for changed module/component.
3. Wider relevant test suite.
4. Type checker/compiler.
5. Linter.
6. Formatter/check mode.
7. Build/package step.
8. Integration tests.
9. End-to-end/browser tests.
10. Security/static analysis if relevant.
11. Manual smoke check where automated coverage is insufficient.

Start narrow for fast feedback, then broaden according to risk.

Never claim a check passed if it was not executed successfully.

If a check cannot run, report exactly why.

If a check fails for a pre-existing reason, distinguish that clearly from failures introduced by the current change.

---

# 22. Frontend Engineering Rules

When modifying a frontend, preserve both functionality and interaction quality.

## 22.1 Follow existing design system

Reuse existing:

- components;
- tokens;
- spacing;
- typography;
- breakpoints;
- icons;
- interaction patterns;
- form controls;
- accessibility primitives.

Do not create parallel styles when existing primitives suffice.

## 22.2 Accessibility

For interactive UI changes, consider:

- semantic HTML;
- keyboard access;
- focus visibility;
- accessible names/labels;
- ARIA only where semantics alone are insufficient;
- contrast;
- reduced motion preferences;
- screen-reader behavior;
- touch target size;
- logical tab order.

Do not make a clickable `div` when a native button/link is appropriate.

## 22.3 Responsive behavior

Verify supported layouts at representative widths.

Check:

- horizontal overflow;
- text wrapping;
- navigation behavior;
- touch interactions;
- dialogs/modals;
- fixed/sticky elements;
- images/media;
- tables;
- forms.

Do not treat mobile as a scaled-down desktop layout when the interaction needs adaptation.

## 22.4 State handling

Explicitly handle relevant states:

- loading;
- success;
- empty;
- error;
- disabled;
- submitting;
- stale/retrying where applicable.

Avoid impossible state combinations through clean state modeling where practical.

## 22.5 Performance

Avoid unnecessary:

- rerenders;
- large dependencies;
- blocking work on main thread;
- unbounded lists;
- duplicate network requests;
- oversized images/assets.

Do not introduce memoization everywhere without evidence it is needed.

---

# 23. Backend and API Rules

## 23.1 Validate at boundaries

Validate untrusted request data at the API/system boundary.

Avoid scattering redundant validation through every internal layer if the invariant is already established.

## 23.2 Preserve API contracts

Unless explicitly changing the contract, preserve:

- field names;
- data types;
- required/optional semantics;
- status codes;
- pagination behavior;
- error formats;
- authentication requirements;
- idempotency behavior.

## 23.3 HTTP semantics

Use methods and status codes consistently with the project's established API conventions.

Do not return success for failed operations solely to simplify clients.

## 23.4 Idempotency

For operations that may be retried, consider whether duplicate requests can produce harmful duplicate effects.

Where relevant, preserve or implement idempotency using existing project patterns.

## 23.5 Timeouts and external calls

External network calls should have bounded timeouts according to project conventions.

Retries should be deliberate and limited to retryable failures.

Do not create infinite waits or retry loops.

---

# 24. Database and Persistence Rules

Database changes are high-impact. Treat them carefully.

## 24.1 Understand schema ownership

Before changing a field/table/collection/index:

- inspect migrations;
- inspect ORM/schema definitions;
- inspect queries and call sites;
- identify production compatibility requirements;
- check test fixtures/seeds.

## 24.2 Migrations

Migrations should be:

- deterministic;
- reviewable;
- compatible with the deployment strategy;
- safe for existing data;
- reversible when the project expects down migrations, or clearly documented when not.

Do not modify already-applied historical migrations unless repository policy explicitly permits it.

Create a new migration instead.

## 24.3 Data loss

Do not drop/overwrite user data casually.

For destructive schema changes, consider:

- backfill;
- staged migrations;
- dual-read/write transitions;
- nullability changes;
- default values;
- rollback consequences.

## 24.4 Query safety

Use parameterized queries or ORM parameter binding.

Avoid string concatenation for SQL containing untrusted input.

## 24.5 Query performance

When relevant, check for:

- N+1 queries;
- missing indexes;
- unbounded scans;
- loading entire rows/collections unnecessarily;
- transaction scope;
- lock contention.

Do not add indexes speculatively without considering write/storage cost and actual query patterns.

---

# 25. Concurrency and Asynchrony

Concurrency bugs are difficult to reason about. Keep concurrency-specific behavior isolated when practical.

## 25.1 Make ownership clear

Understand:

- which code owns mutable state;
- whether state is shared;
- synchronization strategy;
- operation atomicity;
- ordering requirements.

## 25.2 Avoid accidental races

Do not rely on timing, sleeps, or “usually happens first” assumptions.

## 25.3 Async correctness

Do not:

- block async runtimes unnecessarily;
- forget awaited operations;
- spawn untracked tasks without lifecycle/error handling;
- hold locks across slow I/O unless required;
- convert synchronous code to async without a reason.

## 25.4 Cancellation and timeout

Long-running asynchronous operations should respect established cancellation/timeout mechanisms when applicable.

---

# 26. Security Rules

Treat security as a property of the design, not an afterthought.

## 26.1 Input trust

Assume external input is untrusted.

Validate:

- type;
- length;
- range;
- format;
- allowed values;
- file type/size;
- identifiers;
- path components;
- serialized payloads.

Use allowlists when appropriate.

## 26.2 Authentication vs authorization

Authentication answers who the caller is.

Authorization answers whether that caller may perform the operation.

Do not assume authentication implies authorization.

Enforce authorization server-side at the appropriate boundary.

## 26.3 Secrets

Never commit or expose:

- API keys;
- access tokens;
- passwords;
- private keys;
- database credentials;
- session secrets;
- signing secrets;
- production connection strings containing credentials.

Use the project's secret-management mechanism.

Do not print secrets into logs or test failures.

## 26.4 Injection

Prevent relevant injection classes:

- SQL injection;
- shell/command injection;
- HTML/script injection;
- template injection;
- path traversal;
- unsafe deserialization;
- LDAP/query injection where applicable.

Prefer safe APIs over manual escaping.

## 26.5 Cryptography

Do not invent cryptographic algorithms or protocols.

Use established libraries and secure defaults.

Use cryptographically secure randomness for tokens/secrets.

Do not substitute ordinary hashes for password hashing.

## 26.6 Web security

Preserve appropriate protections such as:

- CSRF defenses;
- CORS restrictions;
- Content Security Policy;
- secure cookie flags;
- SameSite policy;
- HTTPS assumptions;
- origin validation;
- rate limiting where required.

Do not widen CORS to `*` merely to solve a browser error when credentials/sensitive APIs are involved.

## 26.7 File handling

For uploads:

- enforce size limits;
- validate type/content appropriately;
- sanitize paths/names;
- prevent traversal;
- avoid unsafe execution/parsing;
- constrain decompression/archive expansion;
- consider memory/disk exhaustion;
- use safe temporary-file handling.

---

# 27. Privacy and Sensitive Data

Minimize collection, storage, logging, and exposure of personal or sensitive data.

When touching sensitive information:

- avoid logging full values;
- mask identifiers where appropriate;
- preserve access controls;
- do not add telemetry containing secrets or private content;
- avoid copying production data into tests;
- use synthetic fixtures;
- consider retention and deletion behavior if relevant.

---

# 28. Dependencies

Dependencies increase supply-chain, maintenance, size, and compatibility costs.

Before adding one, determine whether the requirement can be solved cleanly with:

1. existing project code;
2. standard library;
3. an already-installed dependency;
4. only then, a new dependency.

If adding a dependency:

- use the project's package manager;
- update the lockfile correctly;
- choose an actively maintained package;
- avoid packages with excessive transitive dependencies when a simpler option exists;
- consider licensing/security/runtime/bundle impact;
- import only what is needed;
- document configuration if required.

Do not manually edit lockfiles unless project tooling requires it.

---

# 29. Generated Code and Artifacts

Determine whether a file is generated before editing it.

Common generated artifacts include:

- API clients;
- ORM models;
- protobuf output;
- OpenAPI output;
- compiled CSS/assets;
- lockfiles;
- codegen snapshots;
- migration artifacts.

Prefer modifying the source schema/template and rerunning the generator.

Do not manually patch generated output unless repository policy explicitly requires it.

Do not commit caches, local build directories, temporary files, editor state, or local environment files unless the repository intentionally tracks them.

---

# 30. Observability and Logging

Logging should help diagnose behavior without becoming noise or leaking sensitive data.

## 30.1 Log meaningful events

Useful logs may include:

- operation context;
- stable identifiers;
- failure category;
- retry attempt;
- latency when relevant;
- external dependency result.

## 30.2 Avoid noisy logs

Do not add high-volume logs in hot loops unless needed and appropriately leveled.

## 30.3 Do not use logging as error handling

Recording an exception does not fix or recover from it.

## 30.4 Preserve correlation context

When the project uses request IDs, trace IDs, job IDs, or correlation IDs, propagate them consistently.

---

# 31. Performance Engineering

Performance work should be evidence-driven.

## 31.1 Measure first

Use available profiling/benchmarking/telemetry before optimizing when practical.

## 31.2 Prefer algorithmic wins

Improve:

- algorithmic complexity;
- number of database/network calls;
- repeated parsing/serialization;
- unnecessary copying;
- caching of genuinely reused expensive results;
- batching where semantics allow.

before micro-optimizing syntax.

## 31.3 Be careful with caching

A cache creates invalidation, consistency, memory, and observability concerns.

Before adding caching, define:

- key;
- lifetime;
- invalidation;
- stale behavior;
- memory/storage limits;
- concurrency behavior;
- error behavior.

Do not add caches merely because something appears expensive.

---

# 32. CI/CD and Infrastructure

Changes to build, CI, deployment, permissions, or infrastructure can affect the entire project.

Only modify them when required by the task.

When doing so:

- preserve principle of least privilege;
- avoid exposing secrets;
- pin versions where project policy requires it;
- preserve caching correctness;
- understand artifact paths;
- avoid making CI green by disabling checks;
- keep local and CI commands aligned;
- verify YAML/config syntax;
- understand deployment environment differences.

Do not broaden cloud permissions to solve an unrelated failure.

---

# 33. Git Safety and Hygiene

## 33.1 Preserve user work

Never destroy changes you did not create.

Avoid destructive commands such as:

- `git reset --hard`;
- broad `git clean -fd`;
- checkout/restore that overwrites user edits;
- forced branch deletion.

unless explicitly authorized and clearly necessary.

## 33.2 Keep diffs focused

Do not include unrelated formatting or generated churn.

## 33.3 Commit discipline

If asked to commit:

- inspect the staged diff;
- stage only intended files;
- use a concise meaningful commit message;
- do not include secrets/local files;
- do not amend unrelated commits unless explicitly requested.

## 33.4 Force push

Do not force push unless explicitly requested and safe for the branch workflow.

## 33.5 Final diff review

Before declaring completion, inspect the final diff.

Check for:

- accidental files;
- debug statements;
- unrelated reformatting;
- suspicious secret values;
- stale comments;
- incomplete refactors;
- missing tests;
- unintended API/schema changes.

---

# 34. Compatibility

Preserve compatibility unless the task intentionally changes it.

Consider:

- public API consumers;
- persisted data;
- configuration formats;
- command-line flags;
- environment variables;
- serialized formats;
- browser support;
- runtime versions;
- database versions;
- dependency versions.

For a breaking change, identify the break clearly and follow the project's migration/deprecation strategy.

---

# 35. Language and Framework Discipline

Use idioms appropriate to the repository's language/framework, but do not impose generic “best practice” patterns that conflict with local conventions.

Examples:

- Python: respect project typing, async, packaging, formatting, and exception conventions.
- TypeScript: preserve strictness/type contracts; do not replace types with `any` to silence errors.
- React: preserve component/state architecture; avoid unnecessary effects and derived state.
- Java/Kotlin/C#: follow existing layering and nullability/error patterns.
- Go: prefer explicit straightforward code and established interface patterns.
- Rust: preserve ownership/error semantics; do not add clones merely to satisfy the borrow checker without understanding cost.
- SQL: preserve transaction and index/query semantics.

Never disable type safety globally merely to make code compile.

---

# 36. Type Safety

Use the type system to encode real invariants where practical.

Do not evade errors with:

- `any`;
- unchecked casts;
- blanket type ignores;
- unsafe null assertions;
- suppression directives;

unless there is a justified boundary and the code documents/contains the risk.

Prefer parsing/validation at boundaries and strong internal types.

---

# 37. External Services and APIs

When interacting with external services:

- use documented APIs;
- preserve authentication securely;
- define timeout behavior;
- handle documented error classes;
- avoid assuming undocumented response fields;
- respect pagination/rate limits;
- make retries selective and bounded;
- consider idempotency;
- avoid exposing provider-specific details through unrelated domain layers.

Tests should avoid calling production services unless explicitly designed as integration tests.

---

# 38. AI/LLM-Specific Code

When a project uses AI/LLM systems, do not treat model output as trusted structured data.

## 38.1 Validate outputs

For structured output:

- define a schema;
- parse strictly where practical;
- validate required fields/types/enums;
- reject or repair invalid output using an explicit strategy;
- do not silently fabricate missing critical data.

## 38.2 Grounding and citations

If the product relies on evidence or citations:

- ensure cited identifiers actually exist;
- keep source/evidence roles clear;
- avoid presenting unsupported model claims as facts;
- preserve provenance through transformations.

## 38.3 Prompt changes are behavior changes

Treat important prompt modifications like code changes:

- understand intended behavior;
- add/update evaluations or tests where available;
- avoid unrelated prompt rewrites;
- verify output on representative cases.

## 38.4 Resource limits

Bound:

- uploaded input size;
- token/context size;
- chunk counts;
- concurrency;
- model timeouts;
- retries;
- generated output size.

Avoid unbounded model loops.

---

# 39. File and Parser Safety

Parsers consume adversarial or malformed inputs surprisingly often.

When modifying parsing code:

- enforce explicit limits;
- handle malformed input deliberately;
- avoid catastrophic backtracking/recursion where relevant;
- constrain archive decompression;
- avoid loading unbounded files entirely into memory;
- verify encoding assumptions;
- avoid path traversal on extracted files;
- preserve parser errors with useful context.

---

# 40. Code Smells to Watch For

These are signals to investigate, not automatic mandates to refactor.

## 40.1 Rigidity

A small requirement requires changes across many unrelated modules.

Investigate coupling and responsibility boundaries.

## 40.2 Fragility

A local change breaks apparently unrelated behavior.

Investigate shared hidden state, implicit contracts, and missing tests.

## 40.3 Immobility

Useful logic cannot be reused because it is tightly bound to environment/UI/framework details.

Extract only when actual reuse is required.

## 40.4 Needless complexity

Architecture exists for hypothetical scenarios rather than current requirements.

Simplify.

## 40.5 Needless repetition

Substantial domain logic is duplicated and changes must be synchronized.

Consider extraction after confirming the duplication represents the same concept.

Do not DRY together code that merely looks similar but changes for different reasons.

## 40.6 Opacity

A maintainer cannot understand behavior without mentally simulating too much state or indirection.

Improve naming, control flow, boundaries, or tests locally.

---

# 41. What Not to Do

Unless explicitly required, agents must not:

- add features the user did not ask for;
- broadly redesign architecture;
- introduce speculative abstractions;
- replace functioning libraries for preference reasons;
- disable tests, lint rules, security controls, or type checking to force success;
- hide errors;
- add arbitrary sleeps/retries;
- perform unrelated cleanup;
- overwrite user changes;
- expose secrets;
- alter production data;
- change public contracts silently;
- add dependencies without need;
- optimize without evidence;
- edit generated files manually when a generator exists;
- commit caches or local artifacts;
- claim tests passed without running them;
- say an issue is fixed solely because code was written.

---

# 42. Autonomy Rules

Agents should be able to complete well-specified tasks without unnecessary user interruption.

## 42.1 Resolve from repository evidence first

Before asking a clarification question, inspect whether the answer is available in:

- code;
- tests;
- config;
- docs;
- package scripts;
- schemas;
- CI;
- recent implementation patterns.

## 42.2 Make reversible local decisions independently

For low-risk implementation details that do not affect public behavior, choose the option most consistent with existing code and proceed.

Examples:

- local variable names;
- using an existing helper versus equivalent local pattern;
- placement of a focused test according to project convention.

## 42.3 Escalate high-impact ambiguity

Be especially careful with ambiguity involving:

- destructive data operations;
- authentication/authorization changes;
- billing/payment behavior;
- privacy-sensitive data;
- public API breaks;
- schema migrations with data loss;
- deployment/production changes;
- irreversible Git operations;
- major architectural choices with multiple legitimate interpretations.

When the task can safely be completed without resolving such ambiguity, choose the least destructive/backward-compatible option.

---

# 43. Efficient Tool Use

Coding efficiency means obtaining enough evidence without wasting effort.

## 43.1 Search before reading everything

Use targeted search for symbols, routes, tests, configuration keys, and error text.

## 43.2 Read complete local context

Once a relevant function/class/config section is found, read enough surrounding context to understand invariants and dependencies.

Do not patch from an isolated search result without context.

## 43.3 Batch related inspection

Inspect definitions, call sites, and tests together when possible.

## 43.4 Run focused checks first

A five-second relevant test is better early feedback than immediately running a forty-minute full suite.

Broaden verification before finishing according to risk.

---

# 44. Change-Risk Model

Adjust verification effort to risk.

## Low risk

Examples:

- typo;
- static copy change;
- isolated test description;
- small internal rename with compiler support.

Minimum:

- inspect local context;
- make narrow edit;
- run relevant formatter/test/check where available;
- inspect diff.

## Medium risk

Examples:

- ordinary bug fix;
- new validation;
- component behavior change;
- internal API adjustment.

Expected:

- root-cause analysis;
- focused tests;
- relevant suite;
- type/lint/build checks as applicable;
- diff review.

## High risk

Examples:

- auth/security;
- database migration;
- concurrency;
- payment;
- public API break;
- deployment/CI;
- data deletion;
- cross-cutting infrastructure.

Expected:

- explicit success/invariants;
- deeper call-site/contract analysis;
- regression/integration tests;
- broader verification;
- compatibility/data-safety review;
- careful final diff review;
- clear reporting of residual risk.

---

# 45. Definition of Done

A task is complete only when all applicable statements are true:

## Understanding

- The requested outcome is understood.
- Relevant existing behavior and conventions were inspected.
- Material assumptions were resolved or stated.

## Implementation

- The root cause or actual requirement was addressed.
- The change is no broader than necessary.
- Existing architecture/style was followed unless change was necessary.
- No speculative features or abstractions were added.
- New code is readable and cohesive.
- Security/privacy boundaries remain intact.

## Tests

- Relevant tests were added or updated when appropriate.
- Bug fixes have regression coverage when practical.
- Important boundary/failure behavior is covered.

## Verification

- Focused relevant checks pass.
- Broader appropriate checks pass or any inability/failure is clearly documented.
- The build/type/lint/format state is correct where relevant.

## Hygiene

- Final diff was inspected.
- No unrelated changes remain.
- No debug code remains.
- No secrets or local artifacts were introduced.
- No generated-file policy was violated.
- Documentation is updated where externally visible behavior/setup changed.

Only then report completion.

---

# 46. Final Response Standard

When reporting completed coding work, provide a concise engineering summary rather than a narrative diary.

Recommended structure:

## What changed

State the meaningful changes and affected behavior.

## Why

State the root cause or design rationale when useful.

## Verification

List exact checks actually run and their outcomes.

Examples:

```text
- pytest tests/test_uploads.py -q: 14 passed
- npm run typecheck: passed
- npm run build: passed
```

## Remaining issues

Mention only real limitations, skipped checks, environment constraints, or unrelated pre-existing failures.

Do not claim:

- “fully tested” when only one focused test ran;
- “production ready” without relevant evidence;
- “fixed” when verification failed or was not possible;
- “no regressions” merely because the code compiles.

Be precise.

---

# 47. Conflict Resolution Examples

## Clean-up vs surgical changes

If a bug fix touches a confusing function, clarify the exact relevant section if necessary for a safe fix. Do not refactor the entire module.

## Polymorphism vs simplicity

If a `switch` handles three stable cases clearly, keep it. If the same type switch is duplicated throughout the system and new real cases are being added, consider a strategy/polymorphic design.

## DRY vs coupling

Do not combine two similar functions if they represent different business concepts likely to evolve independently.

## Dependency injection vs overengineering

Pass an HTTP client explicitly when it improves testing. Do not install a DI container just to inject one dependency.

## Value objects vs ceremony

Create a `Money` or validated identifier type when it protects meaningful invariants. Do not wrap every string in a class.

## One assertion vs readable behavior

Use multiple assertions if they describe one coherent response object more clearly than several fragmented tests.

## Boy Scout rule vs scope

Clean formatting/imports caused by your edit. Mention unrelated legacy debt instead of expanding the task.

---

# 48. Self-Review Checklist

Before completion, mentally run this checklist:

### Scope

- Did I change only what was necessary?
- Did I accidentally “improve” unrelated code?
- Can every changed file be justified?

### Correctness

- Does the implementation solve the actual requirement/root cause?
- What are the important invariants?
- Did I test the failure/boundary path, not only success?

### Simplicity

- Is there unnecessary abstraction?
- Did I add configuration/dependency/indirection without a real need?
- Could this be clearer with less code?

### Maintainability

- Are names precise?
- Are functions/modules cohesive?
- Are side effects obvious?
- Are comments explaining why rather than narrating code?

### Compatibility

- Did I unintentionally change API/schema/config behavior?
- Will existing callers/data still work?

### Security

- Is untrusted input validated at the correct boundary?
- Did I preserve authorization?
- Could secrets or sensitive data leak?
- Did I introduce injection/path/deserialization/file risks?

### Tests

- Is there a regression test for the bug?
- Are tests deterministic and meaningful?
- Did I weaken tests to get green results?

### Verification

- What exact commands did I run?
- Did they actually pass?
- Is broader verification needed because the change is high-risk?

### Diff

- Did I inspect it?
- Any debug output?
- Any generated/cached/local files?
- Any unexpected lockfile or formatting churn?

If an answer raises concern, resolve it before declaring completion.

---

# 49. Compact Agent Execution Loop

For everyday work, use this loop:

```text
UNDERSTAND
  ↓
Inspect relevant code, tests, contracts, and conventions.
  ↓
DEFINE SUCCESS
  ↓
Turn the request into observable acceptance criteria.
  ↓
TRACE / DESIGN
  ↓
Find root cause or smallest implementation path.
  ↓
CHANGE SURGICALLY
  ↓
Touch only necessary code; follow local style.
  ↓
TEST
  ↓
Add/update focused tests; prove the requested behavior.
  ↓
VERIFY
  ↓
Run relevant tests, typecheck, lint, build, integration checks.
  ↓
REVIEW DIFF
  ↓
Remove accidental changes, debug code, secrets, artifacts.
  ↓
REPORT
  ↓
State what changed, why, exact verification, and remaining issues.
```

Repeat the loop when verification exposes a problem.

---

# 50. Ultimate Standard

The best agent contribution is not the most ambitious patch.

It is the patch that a strong senior engineer can review quickly and conclude:

- the agent understood the problem;
- the reasoning matches repository evidence;
- the solution fixes the right thing;
- the implementation is simpler than the alternatives;
- unrelated behavior was left alone;
- the code is understandable;
- the important cases are tested;
- security and compatibility were respected;
- verification is credible;
- the diff contains no surprises.

When uncertain, optimize for **correctness, clarity, minimal scope, and evidence**.
