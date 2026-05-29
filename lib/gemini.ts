import { GoogleGenAI, Type } from "@google/genai";
import { env } from "./env";
import { AppError, type ErrorCode } from "./errors";
import type { Confidence, Kind } from "./db";

export interface AnalysisResult {
  name: string; // 음식/제품명
  servingDesc: string; // 1회 제공량 설명 (예: "100g", "1캔(250ml)")
  proteinGrams: number; // 단백질 g
  kind: Kind; // label | product | food
  confidence: Confidence; // exact | estimate
  basis: string; // 근거 1줄
}

const PROMPT = `너는 단백질 추적 앱의 분석기다. 주어진 음식 사진 1장을 보고 단백질 함량을 판단한다.

먼저 입력 종류를 자동 판별하라:
1) 영양성분표(라벨)가 보이면 → kind="label", 표의 단백질 수치를 그대로 읽어라(confidence="exact"). 1회 제공량(serving) 기준 값을 사용하라.
2) 포장 제품인데 라벨이 안 보이면 → kind="product", 제품을 식별하고 알려진 1회 제공량 단백질을 반환(보통 confidence="estimate", 표준 규격이 명확하면 "exact").
3) 조리된/일반 음식이면 → kind="food", 음식 종류를 식별하고 보이는 양 기준 1인분 단백질을 추정(confidence="estimate").

규칙:
- name 과 basis 는 한국어로.
- proteinGrams 는 0 이상 300 이하의 숫자. 사진에 음식이 없으면 0 과 basis="음식을 찾지 못함".
- servingDesc 는 어떤 양 기준인지 짧게(예: "100g", "1인분 약 150g", "1캔 250ml").
- basis 는 판단 근거 한 줄(예: "라벨 표기", "닭가슴살 100g 평균").
- 반드시 지정된 JSON 스키마로만 응답하라.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    servingDesc: { type: Type.STRING },
    proteinGrams: { type: Type.NUMBER },
    kind: { type: Type.STRING, enum: ["label", "product", "food"] },
    confidence: { type: Type.STRING, enum: ["exact", "estimate"] },
    basis: { type: Type.STRING },
  },
  required: [
    "name",
    "servingDesc",
    "proteinGrams",
    "kind",
    "confidence",
    "basis",
  ],
} as const;

export async function analyzeImage(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<AnalysisResult> {
  if (!env.geminiKey) {
    throw new AppError("vision_call", "config", "GEMINI_API_KEY 미설정");
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiKey });

  // 1) 비전 호출
  let raw: string;
  try {
    const res = await ai.models.generateContent({
      model: env.model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
        maxOutputTokens: 1024,
        // gemini-2.5-flash 는 기본 thinking 이 켜져 있어 출력 토큰을 사고에 소진,
        // JSON 본문이 비어 파싱 실패가 잦다. 구조화 추출이라 thinking 은 불필요 → 끔.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    raw = (res.text ?? "").trim();
    if (!raw) {
      const reason = res.candidates?.[0]?.finishReason ?? "unknown";
      throw new AppError("parse", "parse", `빈 응답 (finishReason=${reason})`);
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("vision_call", "vision_call", e);
  }

  // 2) 파싱
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new AppError("parse", "parse", `raw=${raw.slice(0, 200)} :: ${e}`);
  }

  // 3) sanity 검증
  const result = coerce(parsed);
  if (result instanceof AppError) throw result;
  return result;
}

function coerce(o: Record<string, unknown>): AnalysisResult | AppError {
  const proteinGrams = Number(o.proteinGrams);
  const kind = String(o.kind) as Kind;
  const confidence = String(o.confidence) as Confidence;

  if (!Number.isFinite(proteinGrams) || proteinGrams < 0 || proteinGrams > 300) {
    return new AppError(
      "sanity",
      "sanity",
      `proteinGrams 비정상: ${o.proteinGrams}`,
    );
  }
  if (!["label", "product", "food"].includes(kind)) {
    return new AppError("sanity", "sanity", `kind 비정상: ${o.kind}`);
  }
  if (!["exact", "estimate"].includes(confidence)) {
    return new AppError("sanity", "sanity", `confidence 비정상: ${o.confidence}`);
  }

  return {
    name: String(o.name ?? "알 수 없음").slice(0, 120),
    servingDesc: String(o.servingDesc ?? "").slice(0, 80),
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    kind,
    confidence,
    basis: String(o.basis ?? "").slice(0, 200),
  };
}

export type { ErrorCode };
