import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "crypto";
import { db, ensureSchema } from "./db";

// ─────────────────────────────────────────────────────────────
// 이름(owner) + 비밀번호(PIN, 숫자 4~6자리) 기반 가벼운 인증.
// - PIN 은 salt + scrypt 해시로만 저장(평문 X).
// - 로그인 성공 시 HMAC 토큰 발급. 이후 데이터 API 는 이 토큰으로만 접근.
//   토큰 위조는 AUTH_SECRET(=DEBUG_SECRET 폴백) 없이는 불가능.
// ─────────────────────────────────────────────────────────────

export const PIN_RE = /^\d{4,6}$/;

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.DEBUG_SECRET ||
  "protein-lens-insecure-fallback";

function hashPin(pin: string, salt: string): Buffer {
  return scryptSync(pin, salt, 32);
}

export async function userExists(owner: string): Promise<boolean> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const rows = (await sql`SELECT 1 FROM users WHERE owner = ${owner}`) as unknown[];
  return rows.length > 0;
}

// 신규 등록. 이미 있으면 false(이름 선점됨).
export async function createUser(owner: string, pin: string): Promise<boolean> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const salt = randomBytes(16).toString("hex");
  const hash = hashPin(pin, salt).toString("hex");
  const rows = (await sql`
    INSERT INTO users (owner, pin_hash, pin_salt)
    VALUES (${owner}, ${hash}, ${salt})
    ON CONFLICT (owner) DO NOTHING
    RETURNING owner
  `) as unknown[];
  return rows.length > 0;
}

// 로그인 검증.
export async function verifyUser(owner: string, pin: string): Promise<boolean> {
  const sql = db();
  if (!sql) throw new Error("DB not configured");
  await ensureSchema();
  const rows = (await sql`
    SELECT pin_hash, pin_salt FROM users WHERE owner = ${owner}
  `) as { pin_hash: string; pin_salt: string }[];
  if (!rows[0]) return false;
  const expected = Buffer.from(rows[0].pin_hash, "hex");
  const actual = hashPin(pin, rows[0].pin_salt);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// ── 토큰 ──────────────────────────────────────────────────────
export function issueToken(owner: string): string {
  const sig = createHmac("sha256", SECRET).update(owner).digest("hex");
  return `${Buffer.from(owner).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let owner: string;
  try {
    owner = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!owner) return null;
  const expect = createHmac("sha256", SECRET).update(owner).digest("hex");
  if (sig.length !== expect.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  return owner;
}

// Authorization: Bearer <token> 에서 owner 추출. 실패 시 null.
export function ownerFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return verifyToken(m?.[1]);
}
