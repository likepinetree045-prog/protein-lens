import { NextResponse } from "next/server";
import { analyzeImage } from "@/lib/gemini";
import { ownerFromRequest } from "@/lib/userauth";
import {
  AppError,
  friendlyMessage,
  logStructured,
  newRequestId,
  type ErrorCode,
} from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Gemini 비전 호출 여유

// POST { imageBase64, mimeType } → 분석 결과 JSON (저장은 하지 않음)
export async function POST(req: Request) {
  const requestId = newRequestId();
  // 로그인한 사용자만 분석 가능(Gemini 무료 한도 오남용 방지).
  if (!ownerFromRequest(req)) {
    return NextResponse.json(
      { ok: false, code: "auth", message: "다시 로그인해주세요." },
      { status: 401 },
    );
  }
  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return fail(requestId, "no_image", "parse_body", "잘못된 요청 형식");
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType) {
    return fail(requestId, "no_image", "validate", "imageBase64/mimeType 누락");
  }

  try {
    const result = await analyzeImage({ imageBase64, mimeType });
    return NextResponse.json({ ok: true, requestId, result });
  } catch (e) {
    const code = e instanceof AppError ? e.code : "unknown";
    const stage = e instanceof AppError ? e.stage : "unknown";
    return fail(requestId, code, stage, e);
  }
}

function fail(
  requestId: string,
  code: ErrorCode,
  stage: string,
  rawError: unknown,
) {
  logStructured({ requestId, kind: "analyze", stage, code, rawError });
  return NextResponse.json(
    { ok: false, requestId, code, message: friendlyMessage(code) },
    { status: 200 }, // 친구 화면에서 항상 친절 메시지로 처리하기 위해 200 + ok:false
  );
}
