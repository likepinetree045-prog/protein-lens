import { NextResponse } from "next/server";
import { getGoal, isDbConfigured, setGoal } from "@/lib/db";
import { friendlyMessage, logStructured, newRequestId } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET → { goal, dbConfigured }
export async function GET() {
  const requestId = newRequestId();
  try {
    const goal = await getGoal();
    return NextResponse.json({ ok: true, dbConfigured: isDbConfigured(), goal });
  } catch (e) {
    logStructured({ requestId, kind: "settings:get", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}

// PUT { daily_goal_g }
export async function PUT(req: Request) {
  const requestId = newRequestId();
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
    await setGoal(goal);
    return NextResponse.json({ ok: true, goal });
  } catch (e) {
    logStructured({ requestId, kind: "settings:put", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}
