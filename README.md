# HEAIR Readiness Platform API

Working backend for role-adaptive Higher Education AI Readiness (HEAIR) assessments. The fixed HEAIR taxonomy is seeded as four dimensions, twelve sub-dimensions, and 60 role-specific Likert questions.

## Run locally

### No-database interactive demo

```bash
npm install
npm run demo
```

Open `http://127.0.0.1:3001` to use the role-adaptive assessment and see a readiness report. This is an in-memory product demo; it does not persist results or call AI services.

### Full API with Postgres

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run db:bootstrap
npm run dev
```

The service starts at `http://localhost:3000`; `GET /health` confirms it is available.

## Core flow

1. `POST /auth/register` with `{ "email", "password", "fullName" }`.
2. Send `Authorization: Bearer <token>` for subsequent calls.
3. `npm run db:bootstrap` creates a local demo institution/department (or use an admin provisioning workflow), then `PATCH /me/role` with role and department UUID.
4. `POST /assessments`; repeatedly use `GET /assessments/:id/next-question` and `POST /assessments/:id/responses` (`{questionId,value}`).
5. `POST /assessments/:id/complete`, then `POST /assessments/:id/report`.

## Architecture notes

- The static assessment and deterministic recommendations run with no AI credentials.
- `knowledge_documents`/`knowledge_chunks` and `scripts/ingest_knowledge.ts` provide the grounded RAG ingestion path. Configure an embedding provider to populate the `vector(1536)` column and replace the deterministic recommendation generator with a structured-output LLM adapter for production.
- Analytics access defaults to self-only. Promote users to `admin` or `dept_viewer` through a controlled admin process before exposing dashboard routes.
- Use a production migration pipeline, TLS, secret management, audit logs, and SSO/OIDC before handling institutional data.

## GitHub Pages survey

The static survey in `docs/` is deployed by `.github/workflows/pages.yml`. In GitHub, open **Settings → Pages** and set the source to **GitHub Actions**. The survey works with deterministic HEAIR reports immediately.

For Claude-enhanced summaries, deploy this API separately (GitHub Pages cannot run server code), set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` as server environment variables, then set the deployed API URL in `docs/config.js`. Never put an AI API key in `docs/`, repository secrets committed to Git, or browser JavaScript. Protect `/public/recommendations` with a rate limit/WAF before production use.
