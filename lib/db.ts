import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { env } from "./env";

// ─────────────────────────────────────────────────────────────
// Neon(Postgres) 클라이언트. DATABASE_URL 미설정 시 null 을 반환해
// 호출부가 "DB 미연결" 상태를 친절히 다룰 수 있게 한다.
// 스키마는 사용자가 SQL 에디터를 만지지 않도록 코드(ensureSchema)로 생성한다.
// ─────────────────────────────────────────────────────────────

let _sql: NeonQueryFunction<false, false> | null = null;

export function db(): NeonQueryFunction<false, false> | null {
  if (!env.dbUrl) return null;
  if (!_sql) _sql = neon(env.dbUrl);
  return _sql;
}

export function isDbConfigured(): boolean {
  return !!env.dbUrl;
}

let _schemaReady = false;

// CREATE TABLE IF NOT EXISTS — 멱등. 최초 DB 접근 시 1회만 실행되도록 가드.
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const sql = db();
  if (!sql) throw new Error("DB not configured (DATABASE_URL missing)");

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date        date NOT NULL,
      name        text NOT NULL,
      protein_g   numeric NOT NULL,
      kind        text NOT NULL,
      confidence  text NOT NULL,
      basis       text NOT NULL DEFAULT '',
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS entries_date_idx ON entries (date)`;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id            int PRIMARY KEY DEFAULT 1,
      daily_goal_g  numeric NOT NULL DEFAULT 140,
      CONSTRAINT settings_singleton CHECK (id = 1)
    )
  `;
  await sql`INSERT INTO settings (id, daily_goal_g) VALUES (1, 140) ON CONFLICT (id) DO NOTHING`;
  _schemaReady = true;
}

// ── 타입 ──────────────────────────────────────────────────────
export type Kind = "label" | "product" | "food";
export type Confidence = "exact" | "estimate";

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  protein_g: number;
  kind: Kind;
  confidence: Confidence;
  basis: string;
  created_at: string;
}

export interface NewEntry {
  date: string;
  name: string;
  protein_g: number;
  kind: Kind;
  confidence: Confidence;
  basis: string;
}

function toEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    date:
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10),
    name: String(row.name),
    protein_g: Number(row.protein_g),
    kind: row.kind as Kind,
    confidence: row.confidence as Confidence,
    basis: String(row.basis ?? ""),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

// 월 범위 [first, nextMonthFirst) 계산. month = "YYYY-MM".
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { start, end };
}

// ── CRUD ──────────────────────────────────────────────────────
export async function listEntriesByMonth(month: string): Promise<Entry[]> {
  const sql = db();
  if (!sql) return [];
  await ensureSchema();
  const { start, end } = monthRange(month);
  const rows = (await sql`
    SELECT * FROM entries
    WHERE date >= ${start} AND date < ${end}
    ORDER BY date ASC, created_at ASC
  `) as Record<string, unknown>[];
  return rows.map(toEntry);
}

// 날짜별 단백질 합계 { "YYYY-MM-DD": grams }
export async function getDailySums(
  month: string,
): Promise<Record<string, number>> {
  const sql = db();
  if (!sql) return {};
  await ensureSchema();
  const { start, end } = monthRange(month);
  const rows = (await sql`
    SELECT date, SUM(protein_g) AS total FROM entries
    WHERE date >= ${start} AND date < ${end}
    GROUP BY date
  `) as Record<string, unknown>[];
  const out: Record<string, number> = {};
  for (const r of rows) {
    const d =
      r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
    out[d] = Number(r.total);
  }
  return out;
}

export async function addEntry(e: NewEntry): Promise<Entry> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const rows = (await sql`
    INSERT INTO entries (date, name, protein_g, kind, confidence, basis)
    VALUES (${e.date}, ${e.name}, ${e.protein_g}, ${e.kind}, ${e.confidence}, ${e.basis})
    RETURNING *
  `) as Record<string, unknown>[];
  return toEntry(rows[0]);
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<NewEntry, "name" | "protein_g" | "date">>,
): Promise<Entry | null> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const rows = (await sql`
    UPDATE entries SET
      name      = COALESCE(${patch.name ?? null}, name),
      protein_g = COALESCE(${patch.protein_g ?? null}, protein_g),
      date      = COALESCE(${patch.date ?? null}, date)
    WHERE id = ${id}
    RETURNING *
  `) as Record<string, unknown>[];
  return rows[0] ? toEntry(rows[0]) : null;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const rows = (await sql`DELETE FROM entries WHERE id = ${id} RETURNING id`) as unknown[];
  return rows.length > 0;
}

export async function getGoal(): Promise<number | null> {
  const sql = db();
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`SELECT daily_goal_g FROM settings WHERE id = 1`) as Record<
    string,
    unknown
  >[];
  return rows[0] ? Number(rows[0].daily_goal_g) : null;
}

export async function setGoal(grams: number): Promise<void> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  await sql`
    INSERT INTO settings (id, daily_goal_g) VALUES (1, ${grams})
    ON CONFLICT (id) DO UPDATE SET daily_goal_g = ${grams}
  `;
}
