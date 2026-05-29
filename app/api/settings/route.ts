import { NextResponse } from "next/server";
import { getGoal, isDbConfigured, setGoal } from "@/lib/db";
import { ownerFromRequest } from "@/lib/userauth";
import { friendlyMessage, logStructured, newRequestId } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, code: "auth", message: "다시 로그인해주세요." }, { status: 401 });
}

// GET → { goal, dbConfigured } (owner=토큰에서)
export async function GET(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();
  try {
    const goal = await getGoal(owner);
    return NextResponse.json({ ok: true, dbConfigured: isDbConfigured(), goal });
  } catch (e) {
    logStructured({ requestId, kind: "settings:get", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}

// PUT { daily_goal_g }
export async function PUT(req: Request) {
  const requestId = newRequestId();
  const owner = ownerFromRequest(req);
  if (!owner) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청" }, { status: 400 });
  }
  const goal = Number(body.daily_goal_g);
  if (!Number.isFinite(goal) || goal <= 0 || goal > 1000) {
    return NextResponse.json({ ok: false, message: "daily_goal_g 확인(1~1000)" }, { status: 400 });
  }
  try {
    await setGoal(owner, goal);
    return NextResponse.json({ ok: true, goal });
  } catch (e) {
    logStructured({ requestId, kind: "settings:put", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}
