# DevOps — Tutorialls API

> Audience: platform engineers, contributors running the stack locally
> Scope: repo root (`Tutorialls_API/`) is the git root; the application, compose file, and Dockerfile live in the nested `tutorialls/` folder.
> Status: deployment-readiness score **3/10** — runnable dev artifact, not production-deployable (details in [§8](#8-deployment-readiness-score)).

---

## Table of contents

- [1. Local stack — docker-compose](#1-local-stack--docker-compose)
- [2. Dockerfile walkthrough](#2-dockerfile-walkthrough)
- [3. CI pipeline](#3-ci-pipeline)
- [4. Husky + lint-staged](#4-husky--lint-staged)
- [5. Database lifecycle](#5-database-lifecycle)
- [6. Environment variable reference](#6-environment-variable-reference)
- [7. Observability](#7-observability)
- [8. Deployment-readiness score](#8-deployment-readiness-score)
- [9. Prioritized improvements](#9-prioritized-improvements)

---

## 1. Local stack — docker-compose

`tutorialls/docker-compose.yaml` (65 lines) defines **5 services**:

```mermaid
graph LR
    APP["app :3000<br/>NestJS (Dockerfile build)"]
    PG[("postgres :5432<br/>postgres:latest")]
    RD[("redis :6379<br/>redis (latest)")]
    RMQ["rabbitmq :5672 + :15672<br/>3-management-alpine"]
    PGA["pgadmin :5050 → 80<br/>dpage/pgadmin4"]

    APP -->|DATABASE_URL| PG
    APP -->|REDIS_HOST/PORT| RD
    APP -->|RABBITMQ_URL| RMQ
    PGA -->|admin UI| PG
    RMQ -.->|mgmt UI :15672| USER["Operations"]
    PGA -.->|DB dashboard :5050| USER
```

| Service | Image | Ports (host) | Volumes | Healthcheck | Restart |
| --- | --- | --- | --- | --- | --- |
| `app` | build `.` | 3000 | — | ❌ | ❌ **missing** |
| `postgres` | `postgres:latest` (unpinned) | 5432 | `./.docker/data/db:/var/lib/postgresql/data` | ❌ | `always` |
| `redis` | `redis` (latest, unpinned) | 6379 | — | ❌ | `always` |
| `rabbitmq` | `rabbitmq:3-management-alpine` | 5672, 15672 | `~/.docker-conf/rabbitmq/{data,log}` | ❌ | `always` |
| `pgadmin` | `dpage/pgadmin4` (unpinned) | 5050 → 80 | `./.docker/data/pgadmin` | ❌ | `always` |

**Findings**

- ❌ No healthchecks on any service; `depends_on` uses default `service_started` → `app` races Postgres/Redis/RabbitMQ readiness on every `up`.
- ❌ No `restart` policy on `app` → a crash (e.g. DB not ready) leaves the API down permanently.
- ❌ Hardcoded plaintext credentials: `root/root` (Postgres), `admin/admin` (RabbitMQ), `admin` (pgAdmin), mirrored in `.env.example` defaults. Redis runs with **no password**.
- ❌ All ports published to `0.0.0.0` — a LAN attacker gets RDBMS + broker + admin UIs with known credentials. Bind to `127.0.0.1` for local dev.
- ⚠️ `external_links: host.docker.internal` on every service — deprecated Compose directive; modern equivalent is `extra_hosts`.
- ✅ Local named volumes/volume mounts for DB and pgAdmin; note the Postgres volume path is the *committed data directory* problem (§5).

---

## 2. Dockerfile walkthrough

`tutorialls/Dockerfile` (34 lines), multi-stage:

| Stage | Base | Steps | Verdict |
| --- | --- | --- | --- |
| `build` | `node:20-slim` (pinned ✅) | `USER node` → `COPY package*.json` → `npm ci` → `COPY . .` → `RUN npm run build:docker` (= `prettier --write` → `eslint --fix` → `jest` → `nest build`) | Good layer caching; quality gates run inside the build |
| `production` | `node:20-slim` | `apt-get install openssl` → `USER node` → copy `node_modules`, `package*.json`, `dist`, `prisma` → **`RUN npm uninstall bcrypt && npm i bcrypt`** → `CMD ["npm","run","start:docker"]` (= `prisma generate && node dist/main`) | Lean-ish; native-module hack |

**Findings**

- ❌ **No `.dockerignore`** — the build context includes `node_modules/` (Windows-built binaries), `dist`, `coverage`, `.git`, and `tutorialls/.docker/data/db`. Consequence: `COPY . .` **overwrites the fresh `npm ci` node_modules with host node_modules**, which is exactly why the `bcrypt` reinstall hack exists (`npm i` ignores the lockfile → version drift). Write `tutorialls/.dockerignore` with: `node_modules`, `dist`, `coverage`, `.docker`, `.git`, `*.log`, `.env*`.
- ❌ Full `node_modules` (including jest/ts/eslint) copied into the runtime stage; prefer `npm ci --omit=dev` in a builder output or `npm prune --omit=dev`.
- ❌ No `EXPOSE`, no `HEALTHCHECK`.
- ⚠️ `prettier --write` mutates sources during the Docker build; a CI lint job would keep the gate without source churn (`--check`).
- ⚠️ `apt-get install openssl` without `--no-install-recommends`/`apt-get clean` — minor bloat.
- ✅ Non-root (`USER node`), pinned base images, dependencies installed via `npm ci` (lockfile-respecting) in the build stage.

---

## 3. CI pipeline

`.github/workflows/docker-publish.yml` (98 lines) — single job `build` on `ubuntu-latest`.

**Triggers:** push to `main` + semver tags `v*.*.*`; pull requests into `main` (scheduled cron commented out).

**Permissions:** `contents: read`, `packages: write`, `id-token: write`.

| # | Step | PR | push main/tag |
| --- | --- | --- | --- |
| 1 | Checkout (`actions/checkout@v4`) | ✅ | ✅ |
| 2 | cosign install (v2.2.4, SHA-pinned) | skip | ✅ |
| 3 | Buildx setup (SHA-pinned v3.0.0) | ✅ | ✅ |
| 4 | GHCR login (`GITHUB_TOKEN`/actor) | skip | ✅ |
| 5 | Docker metadata (tags/labels) | ✅ | ✅ semver |
| 6 | Build + push, `context: ./tutorialls`, gha cache `mode=max` | build only (push: false) | ✅ push |
| 7 | cosign sign digit (fulcio/ephemeral cert via OIDC) | skip | ✅ |

**Assessment**

- ✅ Lint + unit tests **do** run before publish — but only as a side effect of the image build (`build:docker`), not as a dedicated gate. A failing test fails the image build, but feedback is slow and coverage is discarded.
- ✅ Third-party actions pinned by SHA; `actions/checkout@v4` tag-pinned.
- ✅ Supply chain: `id-token: write` + cosign signing on every non-PR push; `cache-to: gha, mode=max`.
- ✅ No custom secrets required (only `GITHUB_TOKEN`).
- ❌ `test:e2e` never runs in CI; no dependency audit (`npm audit`), no SAST, no container vulnerability scan, no SBOM/provenance attestation.
- ❌ No `concurrency` group, no job timeout, no `workflow_dispatch`; publish-only — no deploy step anywhere.
- ❌ Unit tests + lint are not separated into a fast-fail job; the only gate is a full image build.

---

## 4. Husky + lint-staged

| Item | Evidence | Status |
| --- | --- | --- |
| `core.hooksPath` | `.husky/_` (repo root — set by `prepare: "cd ../ && husky"` in `tutorialls/package.json`) | enabled |
| Root `.husky/` | contains only the `_/` scaffold (v9 shims) — **no `.husky/pre-commit`** at the git root | inert |
| `tutorialls/.husky/pre-commit` | contains `npx lint-staged` — but it sits in the app folder, **not** where husky looks (`.husky/pre-commit` relative to the git root) | misplaced, never executed |
| `.lintstagedrc.json` (`tutorialls/`) | `"*.{ts}": ["npm run format", "npm run lint", "npm run test:staged"]` | configured, dead |
| `test:staged` | jest `--passWithNoTests --findRelatedTests --coverage` | configured, dead |

**Verdict: husky is installed and enabled, but zero hooks are wired.** The `npx lint-staged` hook exists in the wrong location; nothing runs format/lint/tests on commit or push. Fix: `npx husky add .husky/pre-commit "npx lint-staged"` from the repo root (keep `.husky/` at the git root, not inside `tutorialls/`).

---

## 5. Database lifecycle

- ✅ 7 versioned migrations under `tutorialls/prisma/migrations/` (see [docs/architecture.md](architecture.md#62-migration-history)).
- ❌ **`prisma migrate deploy` is never run** — `start:docker` is `prisma generate && node dist/main` (package.json `start:docker`). A fresh `docker compose up` yields a running API against an **empty database** (no schema, no seed). Migrations must be applied out-of-band via `npx prisma migrate deploy`.
- ❌ No seed file/script (`prisma/seed.ts` absent).
- ❌ **Committed PostgreSQL data directory** — commit `ee12b16` added `tutorialls/.docker/data/db/**` (raw Postgres data files: `PG_VERSION`, `base/*`, hundreds of binary relation files; ~1,281 files still tracked in HEAD). This is (a) repo bloat, (b) a credential/PII exposure vector if the DB ever held real rows (user emails + bcrypt hashes), and (c) a broken "backup" pattern — intended fixtures belong as SQL/Prisma seeds. The local `tutorialls/.gitignore` ignores only `/.docker/data/pgadmin`, not `.docker/data/db`. → `git rm -r --cached tutorialls/.docker/data/db` + ignore it.

---

## 6. Environment variable reference

Names and purpose only — **never commit values**. Template: `tutorialls/.env.example` (tracked); local `tutorialls/.env` (gitignored, verified never committed).

| Variable | Purpose | Consumed by | Example value in template |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) | Prisma | `postgresql://root:root@postgres:5432/tutorialls_database` |
| `JWT_SECRET` | HS256 signing key | `JwtModule`/strategy | `"secret"` ⚠️ placeholder |
| `JWT_EXPIRES_IN` | Token lifetime | `JwtModule` | `1d` |
| `ENCRYPT_KEY` | AES key for request-body cipher | `NodeEncryptUserUseCase` | `"256-bit key"` ⚠️ not a valid 32-byte key |
| `ENCRYPT_ALGORITHM` | Cipher algorithm | encrypt/decrypt use cases | `aes-256-ctr` |
| `ENCRYPT_BREAKPOINT` | Ciphertext delimiter (`iv⟨bp⟩payload`) | decrypt use case | `:` |
| `HASH_ROUNDS` | bcrypt cost factor | `BcryptHashPasswordUseCase` | `1` ⚠️ insecure default (see [docs/security.md](security.md#s4)) |
| `REDIS_HOST` | Redis host | `CacheModule` | `redis` |
| `REDIS_PORT` | Redis port | `CacheModule` | `6379` |
| `REDIS_TTL` | Cache TTL (seconds) — **defined in env files** | — | `5` |
| `CACHE_TTL` | Cache TTL — **read by `EnvService`** (drift: not defined in env files) | `EnvService.getCacheTTL()` | — |
| `RABBITMQ_URL` | AMQP connection string | `ClientsModule.registerAsync` | `amqp://admin:admin@rabbitmq:5672` |
| `RABBITMQ_HOST` | RabbitMQ host | compose/app networking | `rabbitmq` |
| `RABBITMQ_PORT` | AMQP port | compose/app networking | `5672` |
| `RABBITMQ_USER` | Broker user | compose env | `admin` |
| `RABBITMQ_PASS` | Broker password | compose env | `admin` |
| `RABBITMQ_QUEUE` | Queue name — **ignored by the emit path** (hardcoded `tutorials_queue` in `tutorial.service.ts:31`) | — | `tutorialls_queue` |
| `RABBITMQ_QUEUE_DURABLE` | Queue durability — read by `EnvService`, **never defined** in env files | — | — |

**Known drift (documented in [docs/security.md](security.md#c2)):** `EnvService` reads `CACHE_TTL` while env files define `REDIS_TTL` → cache TTL is `undefined` in practice; `RABBITMQ_QUEUE_DURABLE` is read but never defined; `RABBITMQ_QUEUE` is configured but bypassed by the hardcoded emit queue.

---

## 7. Observability

| Capability | Status | Evidence |
| --- | --- | --- |
| Health endpoint (`/health`) | ❌ missing | no `@nestjs/terminus`, no health files |
| Metrics (`/metrics`) | ❌ missing | no prometheus/OTel deps |
| Tracing | ❌ missing | — |
| Structured logging | ❌ missing | Nest default `Logger` only |
| Logging | ⚠️ minimal | `Logger.error` duplicates exceptions in the filter; insecure `console.log({ body })` in `security.middleware.ts:14` (dead code, must be deleted) |
| API docs | ✅ Swagger at `/api/docs` | `@nestjs/swagger` |

Outside an orchestrator TCP probe, the app is operationally invisible: no heartbeat, no metrics, no SLOs or alerts exist in-repo.

---

## 8. Deployment-readiness score

**Overall: 3 / 10 — "runnable dev artifact, not production-deployable"**

| Dimension | Score | Rationale |
| --- | --- | --- |
| CI/CD pipeline | 6/10 | Real GHCR publish + cosign signing, SHA-pinned actions; gates hidden inside Docker build, no e2e/scan/SBOM |
| Containerization | 4/10 | Multi-stage + non-root + cacheable `npm ci`; no `.dockerignore`, devDeps shipped, bcrypt reinstall hack |
| Local compose environment | 3/10 | 5 services wired; no healthchecks/readiness, no app restart, unpinned images, hardcoded creds, all ports on 0.0.0.0 |
| Git & secrets hygiene | 2/10 | `.env` safe; live DB volume tracked in git, plaintext request-body logging, open CORS |
| Database lifecycle | 3/10 | Migrations in repo; no `migrate deploy` anywhere, no seed, "dump" is a raw data dir in git |
| Quality gates (local) | 2/10 | Husky enabled but 0 hooks wired; lint-staged dead config |
| Observability | 1/10 | No health, metrics, tracing, or structured logs |
| Deployment strategy | 2/10 | Publish-only CI; no deploy job, no environment matrix, no rollback procedure, no ops docs |

**Strengths to build on:** multi-stage non-root Dockerfile · lockfile + `npm ci` · lint+tests as a build gate · SHA-pinned actions · GHCR image signing · `.env` correctly ignored · 7 versioned migrations.

---

## 9. Prioritized improvements

### P0 — must fix before anyone considers production

1. **Untrack the database volume**: `git rm -r --cached tutorialls/.docker/data/db`; add `/.docker/` to `tutorialls/.gitignore`. Treat the historical commit as a credential/PII exposure: rotate `JWT_SECRET`, `ENCRYPT_KEY`, DB & RabbitMQ passwords; with owner approval, purge history (BFG/filter-repo).
2. **Delete `console.log({ body: req.body })`** in `security.middleware.ts`; log request metadata only (method, path, status, request-id).
3. **Add `tutorialls/.dockerignore`** — fixes build-context bloat and the Windows `node_modules` overwrite that the Dockerfile's bcrypt hack patches.
4. **Make migrations deterministic**: `start:docker` → `prisma generate && prisma migrate deploy && node dist/main`; add a real seed path.
5. **Remove the `npm uninstall bcrypt && npm i` workaround**; copy only production deps (`npm ci --omit=dev`) into the runtime stage.

### P1 — CI & local hardening

1. Move lint/tests into a dedicated fast-fail CI job; add `test:e2e` with service containers; add Actions npm cache.
2. Add container + dependency scanning: Trivy action, `npm audit` job, SBOM/provenance attestation alongside cosign.
3. Compose hygiene: pin images (`postgres:16-alpine`, `redis:7-alpine`, pgAdmin tag), bind ports to `127.0.0.1`, add healthchecks + `depends_on: condition: service_healthy`, `restart: unless-stopped` on `app`, Redis `requirepass`, non-default credentials via `.env`.
4. Secrets policy: replace example defaults with generated secrets (`openssl rand -base64 32`), `HASH_ROUNDS ≥ 10` (12 typical), env validation (Joi/zod) so `CACHE_TTL`/`REDIS_TTL` drift fails fast.

### P2 — quality of life & production path

 1. Wire the hooks that were configured: `npx husky add .husky/pre-commit "npx lint-staged"` at the **repo root** (+ optional commit-msg linting).
 2. Observability: `@nestjs/terminus` `/health` (Postgres/Redis/RabbitMQ indicators), `/metrics` via prom-client, structured logging with a request-id middleware.
 3. Pipeline polish: `concurrency` group for `main`, 30-minute timeout, `workflow_dispatch`, PR protection requiring the status check, and a deploy job stub (SSH/Render/Railway/VPS) that pulls the published digest — with rollback = redeploy previous digest.
 4. Ops docs: env matrix, fresh-up runbook, upgrade + backup/restore (`pg_dump` to tracked SQL), SLO draft once `/health` + `/metrics` exist.

**Quick wins (≈ 30 min total):** dockerignore · delete the console.log · compose `127.0.0.1:` bindings + image pins · wire the husky hook at repo root · untrack + ignore `.docker/data/db`.

---

*Evidence set: `tutorialls/docker-compose.yaml`, `tutorialls/Dockerfile`, `.github/workflows/docker-publish.yml`, `tutorialls/.env.example`, `*.gitignore`, husky files, git history — compiled 2026-08-17. Raw appendix: [`docs/_drafts/04-devops-analysis.md`](_drafts/04-devops-analysis.md).*
