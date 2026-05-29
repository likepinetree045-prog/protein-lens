import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { isDebugAuthorized } from "@/lib/auth";
import { env, maskEnv } from "@/lib/env";
import { db, ensureSchema, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Gemini/DB 스모크 여유

interface ProbeResult {
  label: string;
  ok: boolean;
  detail: string;
}

// Gemini 키가 살아있고 모델이 응답하는지 가벼운 텍스트 호출로 확인.
async function probeGemini(): Promise<ProbeResult> {
  if (!env.geminiKey) {
    return { label: "gemini", ok: false, detail: "GEMINI_API_KEY 미설정" };
  }
  try {
    const ai = new GoogleGenAI({ apiKey: env.geminiKey });
    const res = await ai.models.generateContent({
      model: env.model,
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      config: { maxOutputTokens: 5, temperature: 0 },
    });
    const text = (res.text ?? "").trim();
    return {
      label: "gemini",
      ok: true,
      detail: `model=${env.model} 응답 OK (${text.slice(0, 20) || "빈 응답"})`,
    };
  } catch (e) {
    return {
      label: "gemini",
      ok: false,
      detail: `호출 실패: ${(e as Error).message.slice(0, 160)}`,
    };
  }
}

// DB 연결 + 스키마 생성 + 테이블 존재 확인.
async function probeDb(): Promise<ProbeResult> {
  if (!isDbConfigured()) {
    return {
      label: "db",
      ok: false,
      detail: "DATABASE_URL 미설정 (Vercel Storage 탭에서 Neon 연결 필요)",
    };
  }
  try {
    const sql = db()!;
    await sql`SELECT 1`;
    await ensureSchema();
    const rows = (await sql`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('entries', 'settings')
    `) as { n: number }[];
    return {
      label: "db",
      ok: rows[0].n === 2,
      detail: `연결 OK · 테이블 ${rows[0].n}/2 (entries, settings)`,
    };
  } catch (e) {
    return {
      label: "db",
      ok: false,
      detail: `연결 실패: ${(e as Error).message.slice(0, 160)}`,
    };
  }
}

export async function GET(req: Request) {
  if (!isDebugAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized — ?secret=<DEBUG_SECRET> 필요" },
      { status: 401 },
    );
  }

  const [gemini, dbRes] = await Promise.all([probeGemini(), probeDb()]);

  return NextResponse.json({
    env: {
      geminiKey: maskEnv(env.geminiKey),
      dbUrl: env.dbUrl ? "set" : "(MISSING)",
      model: env.model,
      vercelEnv: env.vercelEnv,
      commitSha: env.commitSha,
    },
    smoke: [gemini, dbRes],
    allOk: gemini.ok && dbRes.ok,
    checkedAt: new Date().toISOString(),
  });
}
