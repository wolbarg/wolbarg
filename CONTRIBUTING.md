# Contributing to Wolbarg

Thanks for helping improve Wolbarg. This repository is the **core `wolbarg` SDK** (SQLite + PostgreSQL semantic memory). Framework adapters and the Cursor connector live in separate packages.

## Development setup

Requirements: **Node.js 22.5+**, npm.

```bash
npm install
npm run typecheck
npm test
npm run build
npm run test:dist
```

Live Postgres tests (optional):

```bash
cp .env.test.example .env.test.local
# set WOLBARG_TEST_DATABASE_URL; database needs pgvector
npm test
```

## Guidelines

- Prefer small, focused PRs with tests for correctness changes.
- Do not add features that turn Wolbarg into an agent framework.
- Keep public claims aligned with implemented behavior (especially hybrid/rerank fail-closed, SSL defaults, and removed graph APIs).
- Match existing TypeScript style; avoid drive-by refactors unrelated to the PR.
- Update `CHANGELOG.md` for user-visible changes (add under the latest version section, or ask a maintainer).
- Keep `SDK_VERSION` in `src/version.ts` in sync with `package.json` `version`.

## API / docs

- Public exports are listed in `src/index.ts`.
- Prefer JSDoc (`@param`, `@returns`, `@throws`, `@example`) on new public surfaces.
- Operator docs: `docs/production.md`, `docs/architecture.md`.

## Pull requests

1. Describe the problem and the fix.
2. Note breaking changes explicitly.
3. Link related issues.
4. Ensure CI is green (Ubuntu + Windows workflows).

## Security

Please do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
