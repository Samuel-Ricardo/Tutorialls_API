# Development Guide — Tutorialls API

> Audience: developers contributing to the codebase
> All commands run from `tutorialls/` unless stated otherwise (the app lives in the nested folder; the repo root holds git/Docker/CI plumbing).

---

## Table of contents

- [1. First-time setup](#1-first-time-setup)
- [2. Day-to-day loop](#2-day-to-day-loop)
- [3. Branching flow](#3-branching-flow)
- [4. Commit conventions](#4-commit-conventions)
- [5. Adding a new module or use case](#5-adding-a-new-module-or-use-case)
- [6. Coding standards](#6-coding-standards)
- [7. Troubleshooting](#7-troubleshooting)

---

## 1. First-time setup

### Prerequisites

| Tool | Minimum | Notes |
| --- | --- | --- |
| Node.js | 20.x | the Dockerfile and `@types/node` target Node 20; newer majors may surface install issues (see [docs/testing.md](testing.md#31-repair-the-runner-first)) |
| npm | 9+ | lockfile (`package-lock.json`) is committed — always use `npm ci` |
| Docker Desktop | any recent | compose stack: `postgres`, `redis`, `rabbitmq:3-management-alpine`, `pgadmin` |
| Git | — | GitHub Flow workflow, see §3 |

### Steps

```bash
# 1. Clone & enter the app folder
git clone git@github.com:Samuel-Ricardo/Tutorialls_API.git
cd tutorialls

# 2. Install dependencies (lockfile-exact — fixes the known jest-cli corruption too)
npm ci

# 3. Environment
cp .env.example .env        # then edit values (see env reference in docs/devops.md §6)

# 4a. Full stack with Docker (app + postgres + redis + rabbitmq + pgadmin)
docker compose up --build

# 4b. Or: infra only via Docker, app locally
docker compose up -d postgres redis rabbitmq
npx prisma migrate deploy   # apply schema (compose never applies migrations automatically)
npm run start:dev

# 5. Verify
curl http://localhost:3000/            # "Hello World!"
curl http://localhost:5050/            # pgAdmin (admin@example.com / admin — change for real use)
curl http://localhost:15672/           # RabbitMQ mgmt UI (admin / admin — change for real use)
open http://localhost:3000/api/docs    # Swagger
```

> Note: `docker compose up` builds the image **without** running migrations — the API starts against whatever schema exists. Always run `npx prisma migrate deploy` (or the equivalent seed step) after `up`.

---

## 2. Day-to-day loop

```bash
npm run lint      # eslint --fix (formats too)
npm run format    # prettier --write
npm test          # unit suite (after npm ci repair)
npm run test:cov  # coverage report → tutorialls/coverage/
npm run test:e2e  # requires the docker infra stack + applied migrations
```

**Gates:** lint and unit tests run inside the Docker build (`npm run build:docker`) and therefore gate CI implicitly; coverage has no configured threshold yet (see [docs/testing.md](testing.md#8-definition-of-done-assessment)). The husky pre-commit hook is currently inert — see [docs/devops.md](devops.md#4-husky--lint-staged).

---

## 3. Branching flow

GitHub Flow with integration branches (established in the repository history — 259 commits, PR workflow up to #15):

```text
main            ← production; protected; receives merge PRs
develop         ← integration; features merge here first
feature/*       ← new capabilities (e.g. feature/domain_tutorial, feature/encryption)
bugfix/*        ← small corrections (e.g. bugfix/config_module)
hotfix/*        ← urgent fixes to main (e.g. hotfix/fix_cors)
```

Typical pattern:

```text
feature/foo → develop (PR) → main (PR)
hotfix/bar → main directly (PR)
```

Rules of thumb:

- Branch from `develop` for features; branch from `main` for hotfixes.
- One cohesive change per branch; keep PRs reviewable.
- Always merge via pull request (matching repository history — no direct pushes to `main`).

---

## 4. Commit conventions

The repository uses a structured emoji format (observed throughout git history):

```text
[ <emoji> ] | <verb>: <subject> (<scope>)
```

### Examples from the history

```text
[ :sparkles: ] | implements: use-case - create > tutorial (module::domain)
[ :passport_control: ] | use: guard - jwt > tutorials (module::application)
[ :card_file_box: ] | create: migration [create_tutorial_model] (app::database::prisma)
[ :white_check_mark: ] | update: test - auth (app::test)
[ :syringe: ] | update: module - tutorials [rabbitmq] (module::application)
[ :bug: ] | fix: authentication [guard] (app::module)
[ :cloud: ] | setup: rabbitmq - tutoral [service] (module::application)
[ :key: ] | update: config - env [redis] (module::infra)
[ :construction_worker: ] | create: docker-compose - rabbitmq (doccker::container)
[ :memo: ] | update: readme (docs)
```

### Emoji taxonomy

| Emoji | Meaning |
| --- | --- |
| `:sparkles:` | new code / features |
| `:label:` | DTOs / types |
| `:card_file_box:` | repositories, migrations, models |
| `:passport_control:` | auth/security (guards, use cases, services) |
| `:syringe:` | DI / registries / modules |
| `:video_game:` | controllers |
| `:white_check_mark:` | tests |
| `:key:` | env/config |
| `:construction_worker:` | docker / compose |
| `:heavy_plus_sign:` | dependencies |
| `:bug:` / `:pencil2:` | fixes / typo fixes |
| `:recycle:` | renames / refactors |
| `:fire:` | deletions |
| `:cloud:` | RabbitMQ / messaging |
| `:gear:` | scripts/tooling |
| `:memo:` | docs |

### Verb set

`create` · `implement(s)` · `update` · `fix` · `setup` · `add` · `use` · `delete` · `rename`

### Scope taxonomy

`module::application` · `module::domain` · `module::infra` · `app::database::prisma` · `app::test` · `app::module` · `app::cache` · `app::component` · `project::env` · `docs` · `doccker::container` (historical typo — use `docker::container` going forward)

---

## 5. Adding a new module or use case

The registry pattern is the project's signature wiring style. A complete recipe for adding a use case to an existing module:

### 5.1 Domain contract

```ts
// src/domain/use_case/tutorials/feature_x.use_case.ts (pure interface — no Nest imports)
export interface IFeatureXUseCase {
  execute(dto: IFeatureXDTO): Promise<Result>;
}
```

### 5.2 Registry token

```ts
// src/application/tutorial/use_case/feature_x.registry.ts (or extend tutorial.registry.ts)
export const TUTORIAL_USE_CASE_REGISTRY = {
  // …
  FEATURE_X: 'MODULE::TUTORIAL::USE_CASE::FEATURE_X',
};
```

Wire the token into the feature registry (`tutorial.registry.ts`) and the `MODULE` hub (`src/app.registry.ts`) so the single source of truth stays consistent.

### 5.3 Implementation

```ts
// src/application/tutorial/use_case/feature_x.use_case.ts
@Injectable()
export class FeatureXUseCase implements IFeatureXUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly repository: ITutorialRepository,
  ) {}
  async execute(dto: IFeatureXDTO) {
    return this.repository.featureX(dto);
  }
}
```

### 5.4 Binding (module provider)

```ts
// src/application/tutorial/tutorial.module.ts
providers: [
  // …
  { provide: MODULE.TUTORIAL.USE_CASE.FEATURE_X, useClass: FeatureXUseCase },
],
```

### 5.5 Consumption

```ts
// in a service constructor
constructor(
  @Inject(MODULE.TUTORIAL.USE_CASE.FEATURE_X)
  private readonly featureX: IFeatureXUseCase,
) {}
```

### 5.6 Checklist

- [ ] Interface lives in `domain/use_case/…` — no Nest decorators in `domain/`.
- [ ] Token registered in the feature registry **and** `app.registry.ts`.
- [ ] Provider bound in the module; exported only if another module consumes it.
- [ ] Unit test with a `useValue` fake for the token: `{ provide: MODULE.X.Y, useValue: fake }`.
- [ ] Typo-proof: token strings and their `MODULE.*` paths must match **exactly** — a mismatch fails at bootstrap, not compile time (a container-resolution spec is recommended; see [docs/architecture.md](architecture.md#53-assessment)).

> **Design note:** the domain interfaces earn their keep; the string tokens are optional ceremony. For simple internal wiring, class tokens are accepted and often clearer. If you add tokens, keep the namespace segments honest (`USE_CASE` tokens should say `USE_CASE`, not `POLICY` — several existing tokens drifted).

---

## 6. Coding standards

**Language & style**

- TypeScript, ES2021, CommonJS (tsconfig) — `strictNullChecks` is currently **off**; new code should still avoid `!` non-null assertions and `any` where practical.
- Prettier + ESLint are configured and run via `npm run format` / `npm run lint`. Format/lint before pushing.

**Layering**

| Layer | Must | Must not |
| --- | --- | --- |
| `domain/` | pure interfaces, entities, DTOs | Nest decorators, infra imports |
| `application/` | orchestration, use cases, policies, controllers | direct `PrismaService` outside repositories |
| `infra/` | engines, config, Prisma | business rules |
| `internal/` | error primitives | — |

**Wiring**

- Inject registry tokens typed as domain interfaces (never concrete classes).
- Prefer `useClass` bindings; `useValue` only for test fakes and immutable config.
- Keep `exports` blocks tight — re-declaring providers with `useClass` risks divergent instances.

**Data & validation**

- Zod schemas for request validation (extend to tutorial endpoints — tracked on the roadmap).
- Entities: keep `toDTO()`/`fromDTO()` as the only mapping surface; round-trip timestamps.
- Pagination: always validate `page`/`limit` before arithmetic (the current string-math bug pattern is known — see [docs/security.md](security.md#a6)).

**Security hygiene (non-negotiable)**

- Never log request bodies (they contain passwords).
- Never hardcode credentials — read from `EnvService`/`.env`.
- No secrets in comments, commit messages, or fixtures.
- Run the [code-security review checklist](https://owasp.org/www-project-top-ten/) before touching auth, crypto, or file I/O.

**Testing**

- Every new use case/policy gets a unit spec (delegation + at least one error path).
- Crypto and JWT changes require round-trip/tamper tests (current gaps listed in [docs/testing.md](testing.md#5-coverage-gaps)).
- Never assert broken behavior as expected (see the e2e discrepancies in [docs/api.md](api.md#8-known-discrepancies)).

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm test` → `Cannot find module '…jest-cli\build\index.js'` | corrupted `node_modules` (jest-cli missing `build/`) | `npm ci` |
| `jwt.sign` fails locally but works in Docker | `JwtModule.register` evaluated before `.env` load (S2 in [docs/security.md](security.md#s2)) | export env vars in shell or run via compose |
| `Invalid key length` on first ciphertext | `ENCRYPT_KEY` is not 32 bytes for aes-256 (E4) | derive key or use a 32-byte value |
| API starts but queries fail / empty DB | compose never runs `prisma migrate deploy` | `npx prisma migrate deploy` from `tutorialls/` |
| App crashes at boot when RabbitMQ is down | `TutorialService.onModuleInit` connects eagerly | start RabbitMQ first (`docker compose up -d rabbitmq`) or hold the fix on the roadmap |
| Pre-commit hooks don't run | husky hooksPath is root `.husky/_`; hook file misplaced in `tutorialls/.husky` | `npx husky add .husky/pre-commit "npx lint-staged"` from the repo root |

---

*Compiled 2026-08-17 against the live repository (source tree, git history, package scripts). Raw appendix: [`docs/_drafts/05-project-overview.md`](_drafts/05-project-overview.md) §3-4.*
