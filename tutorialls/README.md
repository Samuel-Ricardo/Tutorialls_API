# tutorialls — NestJS application

This folder contains the **Tutorialls API** NestJS application (NestJS 10 · Prisma 5 · PostgreSQL · Redis · RabbitMQ · JWT). The git root of the repository is one level up; all documentation lives there.

## Quick start

```bash
npm ci                        # lockfile-exact install (repairs the jest-cli issue)
cp .env.example .env          # configure environment (Windows: copy .env.example .env)
docker compose up --build     # app + postgres + redis + rabbitmq + pgadmin
npx prisma migrate deploy     # apply the 7 versioned migrations (compose does NOT do this)
```

- API: http://localhost:3000 · Swagger: http://localhost:3000/api/docs
- RabbitMQ mgmt: http://localhost:15672 · pgAdmin: http://localhost:5050

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | watch-mode development server |
| `npm run build` | `nest build` |
| `npm run build:docker` | format → lint → test → build (the CI gate, runs inside the Docker build) |
| `npm test` / `npm run test:cov` / `npm run test:e2e` | unit suite / coverage / e2e (e2e needs the compose infra) |
| `npm run lint` / `npm run format` | ESLint + Prettier |

## Documentation

| Doc | Content |
|---|---|
| [`../README.md`](../README.md) | Project overview, quick start, endpoint summary, roadmap |
| [`../docs/architecture.md`](../docs/architecture.md) | Layers, modules, DI registry pattern, request lifecycle, Prisma |
| [`../docs/api.md`](../docs/api.md) | Full API reference with examples and known discrepancies |
| [`../docs/testing.md`](../docs/testing.md) | Test inventory, how to run, coverage gaps, QA roadmap |
| [`../docs/devops.md`](../docs/devops.md) | Compose topology, Dockerfile, CI, env reference, readiness score |
| [`../docs/security.md`](../docs/security.md) | Findings register + remediation roadmap |
| [`../docs/development.md`](../docs/development.md) | Contributing guide: branching, commits, "add a use case" recipe |

_License: see [`../LICENSE`](../LICENSE) (MIT © 2024 Samuel_Ricardo)._