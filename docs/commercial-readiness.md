# Commercial readiness report

**Product:** Architecture Canvas  
**Baseline version audited:** v0.1.12  
**Report date:** 2026-10-13  
**Scope:** Security, data integrity, Spec quality, docs, packaging readiness

## Executive status

| Category | Status |
|----------|--------|
| Core create / edit / collaborate | READY WITH CONDITIONS |
| Server authorization (RLS + RPCs) | READY WITH CONDITIONS |
| Local persistence / outbox | READY WITH CONDITIONS |
| Architecture Spec import/export | READY WITH CONDITIONS |
| Automated tests | READY WITH CONDITIONS |
| Windows installer / auto-update | NOT VERIFIED (build not run in this pass) |
| Privacy / legal | READY WITH CONDITIONS (draft only) |
| Paid licensing / billing | NOT IMPLEMENTED (intentionally deferred) |
| Public commercial sale | BLOCKED pending checklist below |

Overall: **READY WITH CONDITIONS** for a controlled beta / soft launch to trusted users. **Not** ready to claim full production SaaS compliance or paid storefront without the remaining actions.

## What was implemented in this pass

### Security & data integrity
- Additive migration `20261013120000_commercial_harden.sql` applied to the Architecture Canvas Supabase project:
  - CSPRNG join codes (`gen_random_bytes`, unbiased alphabet sampling)
  - Atomic 3-member join via `pg_advisory_xact_lock`
  - Uniform “Invalid join code” error (no project metadata leak)
  - Immutable `join_code` / project id trigger
  - Length constraints on names, descriptions, labels
- Client join-code validation before RPC
- Device identity: new installs store a random `deviceSecret`; existing installs migrate to persist the legacy derived password so cloud sign-in keeps working
- Spec parser: version gate, size/node/edge limits, finite coordinate checks, field clipping

### Spec / sync quality
- Exported Spec ordering made deterministic
- Outbox coalesce/order extracted to `src/features/collaboration/outbox.ts` for tests

### Verification infrastructure
- Vitest added (`npm test`)
- Unit tests: Spec parse/export round-trip, join codes, outbox ordering

### Documentation
- `docs/privacy-policy-draft.md`
- `docs/troubleshooting.md`
- `docs/release-checklist.md`
- `docs/THIRD-PARTY-NOTICES.md` (generated summary)
- This report
- Updates to `docs/architecture-spec.md` and customer-facing README

## Conflict model (documented)

Collaborators use **last-write-wins on `updated_at`** (ISO timestamps from the server / clients).

- Dragging nodes: remote position updates for that node id are ignored while dragging
- Pending outbox writes win over poll results for the same entity
- Equal timestamps: remote apply may still overwrite; treat as rare
- No CRDT merge of concurrent field edits — last successful write wins

## Known limitations

- Short join codes are convenient, **not** strong secrets; anyone with the code can join until the project is full
- Losing local app data (or `deviceSecret`) may prevent this install from recovering the same anonymous cloud identity
- Max 3 members; max ~300 nodes / ~500 edges (server policies)
- Theme is light-only
- No paid license gate yet
- Rate limiting against join-code guessing is not a dedicated edge service (RPC validates format; consider Supabase / WAF rate limits for production)

## Commands executed (this environment)

| Command | Result |
|---------|--------|
| `npm run lint` | Pass with existing warnings |
| `npm run build` | Pass |
| Supabase `apply_migration` commercial_harden | Success |
| `npm test` | **12/12 passed** |
| `npm run tauri:build` | **Not run** in this pass |

## Remaining maintainer actions before public sale

1. Run Windows NSIS build + install/upgrade/uninstall smoke on a clean PC  
2. Verify auto-update with a signed `v*` release and `latest.json`  
3. Confirm GitHub secrets: `TAURI_SIGNING_PRIVATE_KEY`, Supabase build env vars  
4. Legal review of privacy draft + open-source notices  
5. Decide pricing / whether a license key system is required for v1 sale  
6. Optional: enable Supabase Auth rate limits / CAPTCHA on sensitive RPCs  
7. Publish release notes that match shipped behavior only  

## Scenario verification (this pass)

| Scenario | Status |
|----------|--------|
| A New individual customer (install→edit→export) | NOT VERIFIED (installer not built here) |
| B Small team (3 join, 4th rejected) | PARTIAL (server join lock + tests; multi-client manual still needed) |
| C Unstable network / outbox | PARTIAL (code paths exist; automated e2e not present) |
| D Invalid Spec imports | VERIFIED AUTOMATICALLY (unit tests) |
| E Upgrade from older build | NOT VERIFIED |
| F Production backend unavailable | PARTIAL (cached snapshot path exists; not freshly exercised) |
