// 친구(비개발자)에게 보여줄 친절한 한국어 메시지 + 서버용 구조화 로깅.
// 화면에는 friendly 메시지만, 기술 detail 은 서버 로그에만.

export type ErrorCode =
  | "no_image"
  | "bad_image"
  | "vision_call"
  | "parse"
  | "sanity"
  | "db"
  | "unknown";

const FRIENDLY: Record<ErrorCode, string> = {
  no_image: "사진이 없어요. 다시 한 번 찍어볼까요?",
  bad_image: "사진을 읽지 못했어요. 더 밝은 곳에서 다시 찍어보세요.",
  vision_call: "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
  parse: "결과를 이해하지 못했어요. 사진을 바꿔서 다시 시도해보세요.",
  sanity: "단백질 값을 확신하지 못했어요. 라벨이나 음식이 잘 보이게 다시 찍어주세요.",
  db: "기록을 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
  unknown: "문제가 생겼어요. 잠시 후 다시 시도해주세요.",
};

export function friendlyMessage(code: ErrorCode): string {
  return FRIENDLY[code] ?? FRIENDLY.unknown;
}

export class AppError extends Error {
  code: ErrorCode;
  stage: string;
  constructor(code: ErrorCode, stage: string, cause?: unknown) {
    super(typeof cause === "string" ? cause : (cause as Error)?.message ?? code);
    this.code = code;
    this.stage = stage;
  }
}

// request id, 입력 종류, 실패 단계, 원본 에러를 구조화해 서버 콘솔에 남긴다.
export function logStructured(input: {
  requestId: string;
  kind: string;
  stage: string;
  code: ErrorCode;
  rawError: unknown;
}): void {
  const { requestId, kind, stage, code, rawError } = input;
  const raw =
    rawError instanceof Error
      ? { message: rawError.message, stack: rawError.stack }
      : rawError;
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      requestId,
      kind,
      stage,
      code,
      raw,
    }),
  );
}

export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}
