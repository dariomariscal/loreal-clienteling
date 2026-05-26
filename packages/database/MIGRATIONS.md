# Migrations workflow

Drizzle ORM + Postgres. Two file types live in `migrations/`:

1. **Auto-generated** from `schema/*.ts` via `drizzle-kit generate`.
2. **Custom** (hand-written SQL) via `drizzle-kit generate --custom`.

Both are tracked in `migrations/meta/_journal.json` and applied in order of
the `when` timestamp by `drizzle-orm/node-postgres/migrator`.

## Daily workflow

### A. You changed a schema file (`schema/*.ts`)

```bash
pnpm --filter @loreal/database generate     # writes 000X_xxx.sql
pnpm --filter @loreal/database migrate      # applies it
```

### B. You need SQL that drizzle can't express (seed data, complex indexes, functions, idempotent fixes)

```bash
pnpm --filter @loreal/database generate:custom --name=fix_xxx
# → writes empty 000X_fix_xxx.sql with a real timestamp + journal entry.
# Edit the file, fill in the SQL.
pnpm --filter @loreal/database migrate
```

**Never invent a `when` timestamp manually in `_journal.json`.** Always let
drizzle-kit produce the file so the timestamp is monotonically increasing.
Out-of-order timestamps caused migrations to run in the wrong order in the
past — see the 0003→0004 incident.

### C. You're iterating locally and don't want to litter `migrations/` with throwaway files

```bash
pnpm --filter @loreal/database push   # syncs schema → DB without a file
```

When the shape is final, switch back to `generate` for the canonical file.
**Never `push` against staging or prod** — those use `migrate` exclusively so
every change is auditable in git.

## Hard rules

| Rule | Why |
|---|---|
| Never edit a migration after `migrate` ran it | Drizzle stores a content hash. Edits silently no-op (if the SQL is idempotent) or fail (if it's not). Either way the DB diverges from git. |
| To fix a shipped migration, write a NEW one | `000X_fix_yyy.sql` that does the corrective ALTER/UPDATE. Same pattern as moving forward through Rails/Prisma history. |
| Custom SQL must be idempotent | Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for constraints. Lets the same file run cleanly in environments that already received an out-of-band partial apply. |
| `_journal.json` is generated, not edited | Only edit it to fix a documented incident (and document why in the commit). |

## Recovering from a stuck migration

If `pnpm migrate` says "✓ applied" but the tables are missing, drizzle thinks
the file already ran but it didn't. Two cases:

**1. The file is unchanged but the SQL never actually executed** (e.g. earlier
partial apply registered the hash):

```sql
-- inspect:
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;
-- the bad entry corresponds to your migration's hash. delete it:
DELETE FROM drizzle.__drizzle_migrations WHERE id = <bad_id>;
```

Then re-run `pnpm migrate`.

**2. The file was edited after first apply** — hashes no longer match.
Recover by either (a) reverting the file to its applied content and writing a
new corrective migration, or (b) `DELETE`ing the entry and ensuring the SQL
is idempotent before re-applying.

## Inspecting state

```bash
# What does the DB think it has applied?
psql $DATABASE_URL -c "SELECT id, hash, to_timestamp(created_at/1000) FROM drizzle.__drizzle_migrations ORDER BY id"

# What is the journal-ordered list of pending files?
ls migrations/*.sql
cat migrations/meta/_journal.json | jq '.entries[] | {idx, tag, when}'

# Open the DB browser
pnpm --filter @loreal/database studio
```
