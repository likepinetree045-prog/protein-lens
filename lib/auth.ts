import { env } from "./env";

// /api/debug 전용 인가. 헤더 `Authorization: Bearer <DEBUG_SECRET>` 또는
// 쿼리 `?secret=<DEBUG_SECRET>` 를 허용한다 (모바일 브라우저에서 URL로 접근 가능).
// DEBUG_SECRET 미설정 시 항상 거부 → 디버그 정보가 의도치 않게 공개되지 않는다.
export function isDebugAuthorized(req: Request): boolean {
  if (!env.debugSecret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${env.debugSecret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === env.debugSecret;
}
