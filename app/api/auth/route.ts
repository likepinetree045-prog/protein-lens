import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import {
  PIN_RE,
  createUser,
  issueToken,
  userExists,
  verifyUser,
} from "@/lib/userauth";
import { friendlyMessage, logStructured, newRequestId } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanOwner(v: unknown): string {
  return String(v ?? "").trim().slice(0, 60);
}

// GET ?owner=NAME → { exists } : 이 이름이 처음인지(등록) 아닌지(로그인) 판단용
export async function GET(req: Request) {
  const requestId = newRequestId();
  const owner = cleanOwner(new URL(req.url).searchParams.get("owner"));
  if (!owner) {
    return NextResponse.json({ ok: false, message: "이름을 입력해주세요." }, { status: 400 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { ok: false, message: "서버 준비가 안 됐어요. 잠시 후 다시 시도해주세요." },
      { status: 200 },
    );
  }
  try {
    const exists = await userExists(owner);
    return NextResponse.json({ ok: true, exists });
  } catch (e) {
    logStructured({ requestId, kind: "auth:check", stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}

// POST { owner, pin, mode: "register" | "login" } → { ok, token } | { ok:false, code }
export async function POST(req: Request) {
  const requestId = newRequestId();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청" }, { status: 400 });
  }

  const owner = cleanOwner(body.owner);
  const pin = String(body.pin ?? "");
  const mode = String(body.mode ?? "");

  if (!owner) {
    return NextResponse.json({ ok: false, code: "owner", message: "이름을 입력해주세요." }, { status: 400 });
  }
  if (!PIN_RE.test(pin)) {
    return NextResponse.json(
      { ok: false, code: "pin_format", message: "비밀번호는 숫자 4~6자리예요." },
      { status: 400 },
    );
  }

  try {
    if (mode === "register") {
      const created = await createUser(owner, pin);
      if (!created) {
        return NextResponse.json(
          { ok: false, code: "taken", message: "이미 쓰는 이름이에요. 로그인하거나 다른 이름을 써주세요." },
          { status: 200 },
        );
      }
      return NextResponse.json({ ok: true, token: issueToken(owner) });
    }

    if (mode === "login") {
      const valid = await verifyUser(owner, pin);
      if (!valid) {
        return NextResponse.json(
          { ok: false, code: "bad_pin", message: "비밀번호가 일치하지 않아요." },
          { status: 200 },
        );
      }
      return NextResponse.json({ ok: true, token: issueToken(owner) });
    }

    return NextResponse.json({ ok: false, message: "mode 필요" }, { status: 400 });
  } catch (e) {
    logStructured({ requestId, kind: `auth:${mode}`, stage: "db", code: "db", rawError: e });
    return NextResponse.json({ ok: false, message: friendlyMessage("db") }, { status: 200 });
  }
}
