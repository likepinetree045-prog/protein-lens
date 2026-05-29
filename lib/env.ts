// 중앙 환경변수 헬퍼. 값이 없어도 빈 문자열을 반환해 부팅 시 크래시하지 않는다.
// (키 미설정 상태에서도 /api/debug 가 "missing"으로 친절히 보고할 수 있어야 함.)

export const env = {
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  // Neon via Vercel 마켓플레이스는 신형/구형 변수를 모두 주입할 수 있어 둘 다 수용한다.
  dbUrl:
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    "",

  debugSecret: process.env.DEBUG_SECRET ?? "",

  commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  vercelEnv: process.env.VERCEL_ENV ?? "development",
};

// 시크릿을 로그/디버그에 노출하지 않으면서 "설정 여부"만 보여준다.
export function maskEnv(v: string): string {
  if (!v) return "(MISSING)";
  return `len=${v.length} prefix=${v.slice(0, 6)}`;
}
