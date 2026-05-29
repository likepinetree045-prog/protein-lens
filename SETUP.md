# Protein Lens — 셋업 가이드 (주인용, 폰만으로 완결)

> 이 문서 하나만 **위 → 아래**로 따라가면 배포까지 끝납니다.
> 전부 **휴대폰 브라우저**에서 가능합니다. SQL 입력·CLI·터미널 필요 없음.
> 막히면 각 단계의 **"안 되면"** 항목을 보세요.

외부 서비스는 **2개뿐**입니다: **Gemini**(사진 분석) + **Neon**(기록 저장).

---

## ✅ 검증 결과 (2026-05 기준)

| 항목 | 무료? | 카드 필요? | 모바일 가입 | 비고 |
|---|---|---|---|---|
| **Gemini API** (`gemini-2.5-flash`) | ✅ | ❌ 불필요 | ✅ | 멀티모달(사진) 지원. 2025-12 한도 축소로 약 **10회/분·250회/일** — 친구 1명 식사 기록엔 충분 |
| **Neon (Vercel 마켓플레이스)** | ✅ | ❌ 불필요 | ✅ | 10 프로젝트 × 0.5GB. Vercel Storage 탭에서 연결 시 DB 키 **자동 주입(복붙 0회)** |

> 위는 공개 정보 기준입니다. **본인 계정에서 실제로 살아있는지는 6단계 `/api/debug`로 최종 확인**합니다 (추정 안내 아님).

---

## 1단계 — GitHub 레포를 Vercel로 가져오기

- [ ] 폰 브라우저에서 **https://vercel.com** 접속 → **Continue with GitHub** 로 로그인
- [ ] 우상단 메뉴 → **Add New… → Project**
- [ ] 목록에서 **`protein-lens`** 레포 → **Import**
- [ ] 설정은 건드리지 말고 아래로 스크롤 → **Deploy** 탭
- [ ] 첫 배포는 키가 없어 기능이 비어있는 게 정상입니다. 일단 배포되면 됩니다.

**안 되면**: 레포가 안 보이면 Import 화면의 **Adjust GitHub App Permissions**에서 `protein-lens` 접근을 허용하세요.

---

## 2단계 — Neon(DB) 연결 (키 복붙 0회)

- [ ] 배포된 프로젝트 화면에서 상단 탭 **Storage** 탭
- [ ] **Create Database** (또는 **Connect Store**) → 목록에서 **Neon** (Serverless Postgres)
- [ ] 플랜 선택 화면에서 **Free** 선택 → **Continue / Create**
  - 카드 입력 화면은 안 나옵니다. 나오면 **무료 플랜이 선택됐는지** 다시 확인하세요.
- [ ] 연결 대상 환경은 **All / Production·Preview·Development 전부** 선택
- [ ] 완료되면 Neon이 `DATABASE_URL` 등 DB 키를 **이 프로젝트의 환경변수에 자동으로 넣습니다.** (직접 복붙할 필요 없음)

**안 되면**:
- Neon이 목록에 없으면 **Marketplace / Browse Marketplace** 에서 "Neon" 검색.
- 무료 플랜이 안 보이면(과거 Upstash 사례) → 5단계의 **대안 DB(Supabase)** 로 가세요.
- ⚠️ **테이블은 직접 만들 필요 없습니다.** 앱이 처음 켜질 때 자동 생성합니다(SQL 에디터 만지지 마세요).

---

## 3단계 — Gemini 키 발급 (폰 OK)

- [ ] 새 탭에서 **https://aistudio.google.com/apikey** 접속 → 구글 로그인
- [ ] **Create API key** (또는 **API 키 만들기**) 탭 → 키가 생성됩니다
- [ ] 키 오른쪽 **복사** 아이콘 탭 (한 번만 보이니 바로 다음 단계로)

**안 되면**: "프로젝트 선택" 이 뜨면 기본 프로젝트 그대로 두고 만들면 됩니다. 결제 등록 요구는 무시(무료 티어로 충분).

---

## 4단계 — 환경변수 2개 추가

Vercel 프로젝트 → **Settings → Environment Variables** 에서:

- [ ] **`GEMINI_API_KEY`** = (3단계에서 복사한 키 붙여넣기)
- [ ] **`DEBUG_SECRET`** = 아무 긴 랜덤 문자열. 폰에서는 **https://www.uuidgenerator.net/** 의 UUID를 복사해 쓰면 됩니다 (예: `a1b2c3d4-...`).
- [ ] (선택) **`GEMINI_MODEL`** = `gemini-2.5-flash` — 나중에 모델이 막히면(`limit:0`) 여기 값만 바꾸세요.
- [ ] 각 변수는 **Production·Preview·Development 전부**에 적용 체크 → **Save**

> `DATABASE_URL` 류는 2단계에서 **자동으로 들어가 있으니 추가하지 마세요.**

---

## 5단계 — 다시 배포 (키 적용)

- [ ] Vercel 프로젝트 → **Deployments** 탭 → 맨 위 배포 오른쪽 **⋯ → Redeploy** → **Redeploy**
- [ ] 환경변수는 재배포해야 적용됩니다.

---

## 6단계 — ✅ 검증 (이게 제일 중요)

- [ ] 폰 브라우저 주소창에 입력:
  `https://<당신의-도메인>.vercel.app/api/debug?secret=<4단계 DEBUG_SECRET>`
- [ ] 화면 JSON에서 다음을 확인:
  - `"allOk": true`
  - `smoke` 의 `gemini` → `"ok": true`
  - `smoke` 의 `db` → `"ok": true` , `테이블 2/2`

**안 되면 (화면에 그대로 보입니다)**:
- `gemini ok:false` → 4단계 `GEMINI_API_KEY` 오타/미적용. 재배포(5단계) 했는지 확인. 메시지에 `limit` 이 보이면 `GEMINI_MODEL` 을 `gemini-2.5-flash` 로.
- `db ok:false / DATABASE_URL 미설정` → 2단계 Neon 연결이 안 된 것. Storage 탭 다시 확인 후 재배포.
- `unauthorized` → 주소의 `secret=` 값이 `DEBUG_SECRET` 과 다름.

---

## 7단계 — 친구에게 링크 전달

- [ ] 루트 주소 `https://<당신의-도메인>.vercel.app` 를 친구에게 전송.
- [ ] 친구는 설치 없이 바로 사용: 첫 화면에서 **이름 + 비밀번호(숫자 4~6자리)** → 달력에서 **날짜 탭 → 사진으로 추가**.
- [ ] 처음 쓰는 이름이면 비번을 새로 만들고, 다음부터는 같은 이름+비번으로 들어옵니다. 여러 명이 같은 링크를 써도 이름별로 분리·보호됩니다.
- [ ] (선택) 더 강한 토큰 위조 방지가 필요하면 Vercel env에 `AUTH_SECRET`(아무 랜덤 문자열) 추가. 없으면 `DEBUG_SECRET`을 사용합니다.
- [ ] (선택) 우상단 **목표** 버튼으로 일일 목표 g 설정(이름별로 저장).

---

## (대안) Neon 무료가 안 보일 때 — Supabase 폴백

2단계에서 Neon 무료를 못 쓰면 Supabase로:

- [ ] **https://supabase.com** → GitHub 로그인 → **New project** (무료, 카드 불필요)
- [ ] 프로젝트 생성 후 **Project Settings → Database → Connection string → URI** 복사
- [ ] Vercel **Settings → Environment Variables** 에 **`DATABASE_URL`** = 그 URI 붙여넣기 (비밀번호 부분 포함)
- [ ] 5·6단계 진행. 테이블은 앱이 자동 생성합니다.

> Supabase는 키를 **수동 복붙**해야 해서 한 단계 늘어납니다. 가능하면 Neon을 권장.

---

## 운영 메모

- 기록은 **서버 DB(Neon)** 에 저장되어 브라우저를 지워도 유지됩니다.
- 문제가 생기면 항상 **`/api/debug?secret=…`** 부터 확인하세요(원인이 화면에 나옵니다).
- 친구 화면에는 기술 에러 대신 **친절한 한국어 메시지 + 다시 시도** 버튼만 보입니다.
