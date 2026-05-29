import { NextResponse } from "next/server";
import {
  addEntry,
  deleteEntry,
  getDailySums,
  getGoal,
  isDbConfigured,
  listEntriesByMonth,
  updateEntry,
  type Confidence,
  type Kind,
} from "@/lib/db";
import { ownerFromRequest } from "@/lib/userauth";
import {
  friendlyMessage,
  logStructured,
  newRequestId,
} from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unauthorized() {
  return NextResponse.json({ ok: false, code: "auth", message: "다시 로그인해주세요." }, { status: 401 });
}

// GET ?month=YYYY-MM → { entries, dailySums, goal, dbConfigured } (owner=토큰에서)
export async function GET(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ ok: false, message: "month=YYYY-MM 필요" }, { status: 400 });
  }
  try {
    const [entries, dailySums, goal] = await Promise.all([
      listEntriesByMonth(owner, month),
      getDailySums(owner, month),
      getGoal(owner),
    ]);
    return NextResponse.json({ ok: true, dbConfigured: isDbConfigured(), entries, dailySums, goal });
  } catch (e) {
    logStructured({ requestId, kind: "entries:get", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, code: "db", message: friendlyMessage("db") }, { status: 200 });
  }
}

// POST { date, name, protein_g, kind, confidence, basis }
export async function POST(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const name = String(body.name ?? "").trim();
  const protein_g = Number(body.protein_g);
  const kind = String(body.kind ?? "food") as Kind;
  const confidence = String(body.confidence ?? "estimate") as Confidence;
  const basis = String(body.basis ?? "");

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, message: "date=YYYY-MM-DD 필요" }, { status: 400 });
  }
  if (!name || !Number.isFinite(protein_g) || protein_g < 0 || protein_g > 1000) {
    return NextResponse.json({ ok: false, message: "name/protein_g 확인" }, { status: 400 });
  }

  try {
    const entry = await addEntry({ owner, date, name, protein_g, kind, confidence, basis });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    logStructured({ requestId, kind: "entries:post", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, code: "db", message: friendlyMessage("db") }, { status: 200 });
  }
}

// PATCH ?id= { name?, protein_g?, date? }
export async function PATCH(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, message: "id 필요" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청" }, { status: 400 });
  }
  const patch: { name?: string; protein_g?: number; date?: string } = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (body.protein_g !== undefined) {
    const p = Number(body.protein_g);
    if (!Number.isFinite(p) || p < 0 || p > 1000) {
      return NextResponse.json({ ok: false, message: "protein_g 확인" }, { status: 400 });
    }
    patch.protein_g = p;
  }
  if (typeof body.date === "string" && DATE_RE.test(body.date)) patch.date = body.date;

  try {
    const entry = await updateEntry(owner, id, patch);
    if (!entry) return NextResponse.json({ ok: false, message: "없는 기록" }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    logStructured({ requestId, kind: "entries:patch", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, code: "db", message: friendlyMessage("db") }, { status: 200 });
  }
}

// DELETE ?id=
export async function DELETE(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, message: "id 필요" }, { status: 400 });
  }
  try {
    const removed = await deleteEntry(owner, id);
    return NextResponse.json({ ok: removed });
  } catch (e) {
    logStructured({ requestId, kind: "entries:delete", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, code: "db", message: friendlyMessage("db") }, { status: 200 });
  }
}
