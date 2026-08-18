# DevOps Posture Analysis — Tutorialls API

**Date:** 2026-08-17
**Scope:** repo root = `Tutorialls_API/` (git root); app in nested `tutorialls/`
**Basis:** file + git-history evidence only (paths + line numbers cited throughout)

---

## 1. docker-compose.yaml (`tutorialls/docker-compose.yaml`, 65 lines)

| Service | Image | Ports (host) | Volumes | Healthcheck | restart |
|---|---|---|---|---|---|
| `app` | build `.` (local Dockerfile) | 3000 | — | ❌ | ❌ *(missing!)* |
| `postgres` | `postgres:latest` **unpinned** | 5432 | `./.docker/data/db:/var/lib/postgresql/data` | ❌ | always |
| `redis` | `redis` **= latest, unpinned** | 6379 | — | ❌ | always |
| `rabbitmq` | `rabbitmq:3-management-alpine` | 5672, 15672 (mgmt) | `~/.docker-conf/rabbitmq/{data,log}` | ❌ | always |
| `pgadmin` | `dpage/pgadmin4` **unpinned** | 5050→80 | `./.docker/data/pgadmin` | ❌ | always |

**Findings**

- ❌ **No healthchecks on any service** (0/5) and `depends_on` uses default `service_started` (lines 8–11, 62–63) → `app` races DB/Redis/RabbitMQ readiness on every `up`.
- ❌ **No `restart` policy on `app`** (line 2) → a crash (e.g., DB not ready) leaves the API down permanently.
- ❌ **Hardcoded credentials in plaintext**: `POSTGRES_USER/PASSWORD: root/root` (l. 21–22), `RABBITMQ_DEFAULT_USER/PASS: admin/admin` (l. 47–48), `PGADMIN_DEFAULT_PASSWORD: admin` (l. 59). Same values mirrored in `.env.example` (l. 8, 24–29).
- ❌ **All ports published to `0.0.0.0`** (no `127.0.0.1:` binding): Postgres 5432, Redis 6379 (**no password**), RabbitMQ mgmt 15672, pgAdmin 5050 — a LAN attacker gets RDBMS + admin UI + broker with known creds.
- ⚠️ `external_links: host.docker.internal` (every service) — deprecated Compose directive; the modern equivalent is `extra_hosts`.
- ⚠️ Unpinned `postgres:latest` / `redis` / `pgadmin` → non-reproducible dev/prod drift.
- ✅ Proper local volumes for DB/pgAdmin; volume path for Postgres matches the (problematic, see §5/§6) `.docker/data/db`.

## 2. Dockerfile (`tutorialls/Dockerfile`, 34 lines)

| Aspect | Verdict |
|---|---|
| Multi-stage (`build` → `production`) | ✅ l. 1, l. 15 |
| Base image pinned | ✅ `node:20-slim` (both stages) |
| Non-root user | ✅ `USER node` l. 3, 20 |
| Layer caching | ✅ `COPY package*.json` + `npm ci` before code (l. 6–7) |
| `.dockerignore` | ❌ **does not exist anywhere in repo** |
| Prod deps pruning | ❌ full `node_modules` (incl. jest/ts/eslint) copied (l. 23) |
| Reproducible deps | ❌ l. 28 `RUN npm uninstall bcrypt && npm i bcrypt` — `npm i` ignores lockfile, version drifts |
| EXPOSE / HEALTHCHECK | ❌ neither declared |
| App start | ✅ `CMD ["npm","run","start:docker"]` (prisma generate → `node dist/main`) |

**Findings**

- **Missing `.dockerignore` is the single biggest container defect.** The build context includes `node_modules/` (Windows-built binaries), `dist`, `coverage`, `.git`, and `tutorialls/.docker/data/db` — the tracked Postgres data dir (§6). Consequences: (a) `COPY . .` (l. 9) **overwrites the fresh `npm ci` node_modules with host node_modules** → Linux image can carry Windows native `bcrypt`/other binaries → (b) which is exactly why l. 28 exists: commit `cf610e6 "fix: compatibility - bcrypt (docker)"` patches the symptom. `npm i bcrypt` (not `ci`) also unpins bcrypt from `package-lock.json`.
- `build:docker` (package.json l. 10) = `format` + `lint` + `test` + `nest build`: unit tests + lint run *inside* the image build — a real gate, but `prettier --write` mutates sources during build and CI gets no separate fast-fail job (§3).
- Production stage installs `openssl` (needed by Prisma) without `--no-install-recommends`/`apt-get clean` — minor bloat.
- `prisma generate` at runtime (start:docker) is acceptable on Prisma 5 but adds startup latency and requires network-free engine cache discipline; `binaryTargets` in schema (l. 9) includes `debian-openssl-1.1.x` (a legacy Debian target) alongside `native` — harmless here but confusing.

## 3. CI — `.github/workflows/docker-publish.yml` (98 lines)

**Triggers** (l. 8–16): push → `main` + semver tags `v*.*.*`; pull_request → `main`. Scheduled cron is commented out.

**Single job `build`** (ubuntu-latest, permissions `contents: read`, `packages: write`, `id-token: write`):

| Step | PR | push main/tag |
|---|---|---|
| cosign install (v2.2.4) | skip (l. 43) | ✅ |
| buildx setup (SHA-pinned v3.0.0) | ✅ | ✅ |
| ghcr login (`GITHUB_TOKEN`, actor) | skip | ✅ |
| metadata tags | ✅ | ✅ semver |
| build+push (`context: ./tutorialls`, gha cache mode=max) | build only (`push: false`) | ✅ push |
| cosign sign (fulcio, rekor) | skip | ✅ |

**Quality assessment**

- ✅ **Lint + tests do run before publish** — but *only as a side-effect of the Docker build* (`build:docker`), not as a dedicated CI gate. A failing test fails the image build, so PRs are still blocked; the cost is slow feedback (full image build to find a lint error) and no npm-level caching beyond BuildKit layers.
- ✅ **Actions pinned by SHA** for third-party actions (l. 44, 52, 58, 69, 76); `actions/checkout@v4` is tag-pinned (l. 38).
- ✅ **Supply chain**: `id-token: write` + cosign signing on all non-PR pushes; `cache-to: gha, mode=max` for cross-run layer caching.
- ✅ **Secrets**: only `secrets.GITHUB_TOKEN` — no custom secrets required, good.
- ❌ **No test:e2e anywhere** (`build:docker` runs `npm test` = unit only; `test:e2e` exists in package.json l. 23 but is never invoked).
- ❌ **No dependency audit / SAST / container vuln scan / SBOM** in the pipeline (buildx + cosign only).
- ❌ **No concurrency group, no job timeout, no `workflow_dispatch`**, no provenance attestation (buildx `provenance` defaults could be enabled), no deploy step — publish-only CI.
- ⚠️ `username: ${{ github.actor }}` with `GITHUB_TOKEN` works for GHCR but is fragile if the actor changes; prefer `${{ github.actor }}` is fine in practice — keep.

## 4. Husky + lint-staged

**Evidence**
- `.husky/` contains **only the `_/` scaffold dir** — no `.husky/pre-commit`, no `.husky/commit-msg`, no `.husky/pre-push`. `glob .husky/*` → no files.
- `git config core.hooksPath` → `.husky/_` (husky v9, enabled by `prepare: "cd ../ && husky"`, package.json l. 24).
- `.husky/_/pre-commit` is the stock 2-line shim (sources `h`); with no sibling user hook file it is a **no-op**.
- `.lintstagedrc.json` (3 lines): `"*.{ts}": ["npm run format", "npm run lint", "npm run test:staged"]`.
- package.json: `test:staged` = `jest --passWithNoTests --color --findRelatedTests --coverage` (l. 18); `build:docker` (l. 10).

**Verdict: husky is installed and enabled, but ZERO hooks are wired** — lint-staged config and `test:staged` are **dead configuration**. Nothing runs format/lint/tests on commit or push; every gate depends on CI. (Prettier/eslint/jest as deps are healthy; the hook wiring is missing.)

## 5. Prisma & database lifecycle

- ✅ **Migrations folder present**: 7 migrations `prisma/migrations/20240826...→20240830...` (create_user_model → update_user_model ×2 → create_tutorial_model → sync ×2 → sync_prod).
- ✅ Schema (`prisma/schema.prisma`): `User` (uuid, email unique, **password**), `Tutorial`; generator `prisma-client-js` with `binaryTargets ["native","debian-openssl-1.1.x"]`.
- ⚠️ **`start:docker` = `prisma generate && start:prod`** (package.json l. 13): generates the client at container start but **never runs `prisma migrate deploy`** → schema must be applied out-of-band; a fresh `docker compose up`/CI deploy gives a **running API against an empty DB** (no schema, no seed).
- ⚠️ **No seed file / seed script** in package.json; no `prisma/seed.ts`.
- ❌ **"Database dump" is not an SQL dump — it's the raw Postgres data directory, committed to git**: commit `ee12b16 "[ :card_file_box: ] create: databse dump"` added `tutorialls/.docker/data/db/...` (PG_VERSION, `base/1/`, `base/4/`, `base/16384/`, hundreds of binary relation files). **These files are still tracked in HEAD** (`git ls-files` → `tutorialls/.docker/data/db/PG_VERSION`, `base/1/112`, …). That is: (a) repo bloat of many MB of binary churn, (b) a **PII/credential exposure risk** (the DB contains user emails and bcrypt password hashes), (c) `git status --ignored` confirms only `pgadmin` is ignored — nothing ignores `.docker/data/db`. Intended seeds/dumps belong in the repo as SQL/Prisma seed, never as a live data directory.

## 6. Security hygiene

**Secrets in VCS**
- ✅ `.env` is **not tracked** (git ls-files: only `.env.example`); `.env` ignored by both root `.gitignore` (l. 76) and nested `tutorialls/.gitignore` (l. 42). Local `tutorialls/.env` exists untracked. **Key names present locally** (values not inspected/printed): `DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, ENCRYPT_KEY, ENCRYPT_ALGORITHM, ENCRYPT_BREAKPOINT, HASH_ROUNDS, REDIS_HOST, REDIS_PORT, REDIS_TTL, RABBITMQ_URL, RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASS, RABBITMQ_QUEUE`.
- ⚠️ `.env.example` ships functional-but-weak defaults (JWT `"secret"`, `HASH_ROUNDS=1`, ENCRYPT_KEY placeholder, root/root & admin/admin) — acceptable as an example, dangerous if copied to prod.
- ❌ **`.docker/data/db` (live DB volume) is tracked in git** — the .gitignore completeness gap (see §5). `tutorialls/.gitignore` only ignores `/.docker/data/pgadmin`.

**Application/codebase**
- ❌ **`security.middleware.ts` l. 14: `console.log({ body: req.body })`** — logs every request body in plaintext, **including signup/login payloads with raw passwords** (encryption happens *after* the log, l. 15). Credential/PII leak into logs — must be removed.
- ⚠️ `main.ts`: `app.enableCors()` **without options** (open CORS, l. 10); ValidationPipe `whitelist: true` / `forbidNonWhitelisted: true` **commented out** (l. 18–19) → mass-assignment surface; **no helmet, no rate limiting** (no `@nestjs/throttler` in deps).
- ⚠️ `EnvService.REDIS.TTL` reads `CACHE_TTL` (`env.service.ts` l. 29) but `.env(.example)` defines **`REDIS_TTL`** — config contract drift → cache TTL silently undefined.
- ⚠️ Repo hygiene: dirty tree (`M` on 3 DTO files) + stray untracked `tutorialls/a.js`; README is the stock NestJS template (no deployment/ops docs).
- ✅ Dockerfile runs as non-root (`USER node`), CI uses least-privilege `GITHUB_TOKEN`, cosign signing exists.

## 7. Observability

| Capability | Status | Evidence |
|---|---|---|
| Health endpoint (`/health`, terminus) | ❌ **missing** | no `@nestjs/terminus` in deps; no `health*` files in src |
| Metrics (`/metrics`, prometheus/OTel) | ❌ **missing** | no prometheus/opentelemetry deps |
| Tracing | ❌ missing | — |
| Structured logging (pino/winston) | ❌ missing | only Nest default `Logger` |
| Logging present | ⚠️ minimal | `Logger.error` in `exception.filter.ts` (l. 21–22) duplicating exceptions; guard log `local.guard.ts` l. 10; the insecure body `console.log` (§6) |
| API docs | ✅ Swagger at `/api/docs` (`main.ts` l. 31) | `@nestjs/swagger` in deps |

**There is no heartbeat, no `/metrics`, no structured request logging — outside an orchestrator's TCP probe the app is operationally invisible.** No SLOs/alerts/dashboards exist in-repo; Swagger is the only ops-adjacent surface.

## 8. Deployment-readiness score

**Score: 3 / 10 — "runnable dev artifact, not production-deployable"**

| Dimension | Score | Rationale |
|---|---|---|
| CI/CD pipeline | 6/10 | Real GHCR publish + cosign signing, SHA-pinned actions; gates hidden inside Docker build, no e2e/scan/SBOM |
| Containerization | 4/10 | Multistage + non-root + cacheable `npm ci`; no `.dockerignore`, devDeps shipped, bcrypt reinstall hack |
| Local compose environment | 3/10 | 5 services wired; no healthchecks/readiness, no app restart, unpinned images, hardcoded creds, all ports on 0.0.0.0 |
| Git & secrets hygiene | 2/10 | `.env` safe, but **live DB volume tracked in git**, plaintext request-body logging, open CORS |
| Database lifecycle | 3/10 | Migrations in repo; **no `migrate deploy` anywhere**, no seed, "dump" is a raw data dir in git |
| Quality gates (local) | 2/10 | Husky wired but **0 hooks**; lint-staged dead config |
| Observability | 1/10 | No health, metrics, tracing, or structured logs |
| Deployment strategy | 2/10 | Publish-only CI; no deploy job, no environment matrix, no rollback procedure, no ops docs |

**Summary of strengths:** multi-stage non-root Dockerfile, lockfile + `npm ci`, unit tests+lint as a build gate, SHA-pinned actions, GHCR image signing, `.env` correctly ignored, 7 schema migrations versioned.

## 9. Recommendations (ranked)

**P0 — must fix before anyone considers prod**
1. **Untrack the database volume**: `git rm -r --cached tutorialls/.docker/data/db`, add `/.docker/` (or `/.docker/data/db`) to `tutorialls/.gitignore`. Treat the historical commit as a credential/PII exposure: rotate `JWT_SECRET`, `ENCRYPT_KEY`, DB & RabbitMQ passwords (they may exist in the dump), and — with owner approval — purge history (BFG/filter-repo) or at minimum stop propagating clones.
2. **Delete `console.log({ body: req.body })`** in `security.middleware.ts`; log request metadata (method, path, status, request-id) — never bodies/passwords.
3. **Add `.dockerignore`** in `tutorialls/`: `node_modules, dist, coverage, .docker, .git, *.log, .env*` — fixes the context-bloat and the Windows-`node_modules`-overwrite that l. 28 of the Dockerfile is patching.
4. **Make migrations deterministic**: run `prisma migrate deploy` in the start sequence (e.g., `start:docker: "prisma generate && prisma migrate deploy && node dist/main"`) or a dedicated entrypoint; add a real seed path (`prisma/seed.ts` or tracked SQL) if fixtures are needed.
5. **Remove the `npm uninstall bcrypt && npm i` workaround**: copy only prod deps into the runtime stage (`RUN npm ci --omit=dev` against a lockfile from the builder, or `npm prune --omit=dev`) so the image is reproducible and lean.

**P1 — CI & local-dev hardening**
6. **Move lint/tests out of the Docker build into a dedicated CI job** (fail in minutes, not after an image build); add `test:e2e` with Postgres/Redis/RabbitMQ services; add Actions npm cache.
7. **Add container + dependency scanning**: `aquasecurity/trivy-action` (or GHCR native scanning), `npm audit` job, SBOM attestation (`docker buildx` provenance / syft) — complements the existing cosign signing.
8. **Compose hygiene**: pin images (`postgres:16-alpine`, `redis:7-alpine`, `pgadmin` tag), bind ports to `127.0.0.1`, add healthchecks to all services, `depends_on: condition: service_healthy`, `restart: unless-stopped` on `app`, and move creds out of the file into `.env` (+ `requirepass` for Redis, non-default RabbitMQ/pgAdmin creds).
9. **Secrets policy**: replace example defaults with real generated secrets (`openssl rand -base64 32`), `HASH_ROUNDS >= 10`, and add env validation (Joi/zod) so `CACHE_TTL`/`REDIS_TTL` drift fails fast.

**P2 — quality of life & production path**
10. **Wire the hooks that were configured**: `husky add .husky/pre-commit "npx lint-staged"` (+ optional `commit-msg` with commitlint) — lint-staged and `test:staged` are ready but inert.
11. **Observability**: add `@nestjs/terminus` `/health` (incl. Postgres/Redis/RabbitMQ indicators), `/metrics` via prom-client, structured logging (pino) with request-id middleware; delete/tune nothing yet — there are no alerts to tune.
12. **Pipeline polish**: `concurrency` group for main, 30-min timeout, `workflow_dispatch`, GitHub-required status check (PR protection), and a deploy job stub (SSH/Render/Railway/VPS) that `docker compose up -d` the published digest — with a documented rollback = redeploy previous image digest.
13. **Ops docs**: replace the stock README with env matrix, runbook (fresh-up, upgrade, backup/restore — `pg_dump` to tracked SQL), and an SLO draft (availability + latency) once `/health` + `/metrics` exist.

**Quick wins (30 min total):** dockerignore, delete the `console.log`, compose `127.0.0.1:` bindings + pins, husky hooks, `.docker/data/db` untrack + ignore.