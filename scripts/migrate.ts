// 명시적 마이그레이션 실행기 (선택). 앱은 최초 DB 접근 시 ensureSchema()로 자동 생성하므로
// 보통 실행할 필요가 없다. 로컬에서 미리 스키마를 만들고 싶을 때만:
//   DATABASE_URL=... npm run migrate
import { ensureSchema, isDbConfigured } from "../lib/db";

async function main() {
  if (!isDbConfigured()) {
    console.error("DATABASE_URL 미설정. 환경변수를 채운 뒤 다시 실행하세요.");
    process.exit(1);
  }
  await ensureSchema();
  console.log("✅ 스키마 준비 완료 (entries, settings)");
}

main().catch((e) => {
  console.error("마이그레이션 실패:", e);
  process.exit(1);
});
