# Sentinel LLM Security Policy

## Project status

Sentinel LLM is in foundation status. Phase 0 validated a pinned AnythingLLM baseline and local-model runtime; Sentinel governance, audit, deterministic authorization, and restricted execution are planned and are not yet implemented.

No production-supported Sentinel release currently exists. Security claims must be evaluated against the exact commit and documented phase status.

## Reporting a vulnerability

Do not open a public issue containing exploit steps, credentials, personal data, or other sensitive details.

Use GitHub's private vulnerability-reporting flow for `akshay9192/sentinel-llm` when it is available under the repository's **Security** tab. If private reporting is unavailable, contact the repository owner through the GitHub profile to establish a private channel before sharing details.

Include:

- the exact Sentinel commit;
- deployment and authentication mode;
- affected component and route;
- minimal reproduction steps;
- observed and expected behavior;
- potential impact;
- whether the behavior also exists in the pinned AnythingLLM baseline.

Sentinel maintainers will triage whether a report concerns Sentinel-specific code, the preserved upstream foundation, deployment configuration, or an unsupported threat model. Maintainers—not reporters or automated agents—will decide whether upstream coordination is necessary.

## Security model boundaries

- Authentication is not authorization.
- Model output is untrusted and cannot authorize a side effect.
- Semantic classification may add a denial signal but cannot override deterministic denial.
- Planned governance and execution paths must fail closed.
- Planned audit storage is described as tamper-evident, with explicitly bounded guarantees.
- The no-auth single-user mode inherited from AnythingLLM is intentionally accessible to anyone who can reach it; it must be deployed only within an appropriate network boundary.

The current target architecture and known limitations are documented in [PROJECT_PLAN.md](PROJECT_PLAN.md), [PROGRESS.md](PROGRESS.md), and [docs/BASELINE.md](docs/BASELINE.md).
