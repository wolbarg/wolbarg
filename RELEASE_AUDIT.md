# Wolbarg 0.6.0 — Release audit

Date: 2026-07-26  
Scope: Full public-surface polish for `wolbarg@0.6.0` — SDK package, in-repo docs, website (`website/`), examples, GitHub community files, and marketing consistency.

---

## 1. Everything changed

### Versioning

- `package.json` / `package-lock.json` / `src/version.ts` → **0.6.0**
- Adapter peers in-tree: `@wolbarg/langchain`, `@wolbarg/mastra`, `@wolbarg/llamaindex` → `wolbarg >= 0.6.0`
- Demo / tutorial deps retargeted from empty `file:../../sdk` → `file:../..` (root package); locks regenerated without `neo4j-driver`
- `website/package.json` → **0.6.0**

### Changelog & release notes

- Keep-a-Changelog **[0.6.0]** section (production hardening, removals, fail-closed retrieval)
- `RELEASE_NOTES.md` polished for public 0.6.0 install / upgrade guidance

### README

- Mature-SDK structure: quick start, features, storage, embeddings, API, config, production, honest limits, examples, tests, benchmarks caveats, contributing, roadmap, resources
- Roadmap: website/docs sync marked complete

### In-repo documentation

- `docs/whats-new-0.6.md`, `docs/production.md`, `docs/api-overview.md`, `docs/benchmarks.md`, `docs/architecture.md`
- `docs/website-sync-0.6.md` checklist marked **complete**
- `docs/README.md` updated (website lives in-repo under `website/`)

### Website (MDX + marketing)

**Rewritten / aligned to 0.6.0**

- Guides: what's-new, limitations, production (new), best-practices
- Quick start, getting-started, installation, configuration, architecture, providers
- Hybrid search + rerankers → **fail-closed** callouts
- Graph memory page → removal notice; API stubs for `linkMemories` / `getRelated`
- API index, `wolbarg`, `recall`, `forget`, migration, FAQ, errors, observability
- Regenerated export catalog (`website/scripts/generate-api-docs.mjs` now falls back to `../src/index.ts`) — **191** exports, no graph symbols

**Landing / SEO**

- Homepage CTA “What's new in **0.6**”; Studio copy without SDK graph APIs
- `site.ts` keywords without Neo4j / graph memory; GitHub org links → `wolbarg/wolbarg`
- SEO / OG / JSON-LD `softwareVersion` **0.6.0**; benchmarks labeled **v0.4 historical**
- Redirects: `/docs/api/link-memories`, `/docs/api/get-related` → `/docs/guides/whats-new`
- Docs FAQ JSON-LD updated for fail-closed hybrid

- Companion `@wolbarg/*` adapters should peer-depend on `wolbarg >= 0.6.0` (bump when republishing those packages)
- Postgres storage/example docs default pool **20** + SSL/schema notes; integration peer pins documented as `>= 0.6.0`
- API overview labeled core-loop (not exhaustive); checkpoint helper methods listed; examples/ pointer README
- AbortSignal lists include `rememberFromMessages`; CONTRIBUTING changelog guidance aligned

---

## 2. Documentation improvements

- Operator-accurate production guide (SQLite/Postgres, SSL, pool 20, schema, backups, fail-closed retrieval)
- Architecture aligned with shipped concurrency / SSL / multi-tenant behavior
- API overview matches `src/index.ts` (graph explicitly absent)
- Website MDX and in-repo docs tell the same 0.6.0 story

---

## 3. README improvements

- Scannable sections matching common OSS SDK READMEs
- Quick-start API verified against current exports
- Honest limits and historical benchmark caveats
- Production recommendations without marketing fluff

---

## 4. Website improvements

- Full 0.5 → 0.6 accuracy pass (graph removal, fail-closed hybrid/rerank, Postgres SSL/schema/pool)
- New Production guide under Guides
- Marketing tone de-hyped; Studio no longer implies core graph APIs
- SEO/metadata updated for 0.6.0
- API generated reference regenerated from root `src/index.ts`

---

## 5. Marketing improvements

- Removed Neo4j / graph memory from product keywords and feature claims
- Release notes emphasize production hardening, not hype
- Benchmark figures labeled historical (v0.4) until re-run on 0.6.0
- Feature comparison matrix never claimed graph memory for Wolbarg (unchanged / verified)

---

## 6. Version consistency verification

| Surface | Expected | Status |
| --- | --- | --- |
| `package.json` | 0.6.0 | OK |
| `src/version.ts` | 0.6.0 | OK |
| `package-lock.json` root | 0.6.0 | OK |
| `CHANGELOG.md` latest | 0.6.0 | OK |
| `RELEASE_NOTES.md` | 0.6.0 | OK |
| README current release | 0.6.0 | OK |
| Website what's-new / SEO | 0.6.0 | OK |
| Website generated API catalog | no graph exports | OK |
| Adapter peers (langchain/mastra/llamaindex) | `>= 0.6.0` | OK |
| npm badge | dynamic from registry | OK after publish |

---

## 7. Remaining known limitations

- No checked-in public benchmark suite for **0.6.0** numbers (website stats are **v0.4 historical**)
- Postgres telemetry not implemented
- `rememberFromMessages({ mode: "extract" })` experimental
- Companion package **sources** incomplete in this checkout (`packages/openai`, `packages/vercel-ai`, `plugins/cursor` lack `package.json` — dist-only leftovers). Peers there cannot be bumped until those package repos are present; demos that `file:`-link them need published npm packages or full companion sources
- Empty leftover `sdk/` directory (not a package) — demos now point at repo root; consider deleting `sdk/` in a cleanup PR
- Planned connectors (Claude Code / Codex) remain TBD in internals docs by design
- Live site deploy still required for wolbarg.com to serve this tree

---

## 8. Intentionally left unchanged

- Core runtime behavior (no functional changes in this polish pass beyond prior 0.6 hardening already in tree)
- CI workflow logic (Ubuntu + Windows matrix already 0.6-ready)
- Historical CHANGELOG entries for ≤0.5.x
- Archived internals audits / RFCs
- Adapter package major versions remaining at 1.0.x (their own semver)
- External Studio product binary / wolbarg-benchmarks suite repository
- Competitor “graph” products in the comparison matrix (accurate descriptions of *them*, not Wolbarg)

---

## 9. Final assessment

**SDK package (`wolbarg@0.6.0`):** ready to publish to npm — version, changelog, README, production docs, GitHub community files, and honest limits are consistent.

**Website / docs:** in-repo MDX and marketing surfaces are aligned with 0.6.0 (graph removed, fail-closed retrieval, SSL/schema/pool, AbortSignal, production guide). Deploy `website/` to make wolbarg.com match.

**Companion packages:** incomplete in this monorepo checkout; publish adapters/connectors from their own sources with `wolbarg >= 0.6.0` peers before advertising monorepo `file:` demos as turnkey.

**Verdict:** The public SDK + website documentation are polished enough for a public **v0.6.0** release. Remaining gaps are operational (npm publish, website deploy, companion package peer bumps outside this tree) and known product limits already documented honestly — not polish blockers for the core package.
