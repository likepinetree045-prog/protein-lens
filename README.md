# Protein Lens

사진 한 장으로 단백질 함량을 알아내고, **월간 달력**에 날짜별로 기록을 쌓는 개인용 웹 앱.
친구에게는 배포 링크만 보내면 끝 — 설치·로그인 없음, 모바일 우선.

## 배포·셋업

👉 **[SETUP.md](./SETUP.md)** 를 위→아래로 따라가세요. 폰만으로 완결됩니다.

## 스택

- Next.js 15 (App Router) on Vercel Hobby — $0
- Google Gemini (`gemini-2.5-flash`, 멀티모달) — 사진 분석/추정
- Neon Postgres (Vercel 마켓플레이스, 키 자동 주입) — 기록 영속 저장

외부 의존은 **Gemini + DB 2개뿐**.

## 동작

0. 첫 진입 시 **이름 + 비밀번호(숫자 4~6자리)** → 그 이름으로 기록이 분리·저장된다. 처음 쓰는 이름이면 비번 설정, 있는 이름이면 비번 입력. 같은 이름+비번으로 다시 들어오면 이어짐. 여러 명이 한 배포를 공유 가능. PIN은 salt+scrypt 해시로 저장, 로그인 성공 시 HMAC 토큰 발급(데이터 API는 토큰으로만 접근).
1. 앱 = **월간 달력**. 각 날짜에 그날 단백질 누적 g 표시(목표 대비 농도).
2. 날짜를 **직접 탭**(자동 날짜 넘김 없음) → 그 날 상세.
3. **사진으로 추가** → 클라에서 리사이즈 → `/api/analyze`(Gemini 비전) → 구조화 JSON.
   - 영양성분표=수치 OCR(정확) / 포장제품=식별 / 일반음식=1인분 추정.
4. 결과 확인·수정 후 **선택한 날짜에 저장**(`/api/entries`).

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY, DATABASE_URL, DEBUG_SECRET 채우기
npm run dev                  # http://localhost:3000
```

스키마는 최초 DB 접근 시 자동 생성됩니다. 미리 만들려면: `npm run migrate`

## 디버그

`/api/debug?secret=<DEBUG_SECRET>` — env 설정 여부 + Gemini/DB 스모크 결과.

## API

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/analyze` | POST | `{imageBase64, mimeType}` → 분석 결과(저장 X) |
| `/api/entries` | GET `?month=YYYY-MM` / POST / PATCH `?id=` / DELETE `?id=` | 월별 조회·추가·수정·삭제 |
| `/api/settings` | GET / PUT | 일일 목표 단백질 g |
| `/api/debug` | GET `?secret=` | 검증 |

향후 목표(v1 범위 밖): 에러→GitHub Issue 자동 발행, 주간 리포트, 음식 DB 연동.
