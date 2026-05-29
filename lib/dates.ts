// 클라이언트/서버 공용 날짜 유틸 (로컬 타임존 기준, UTC 변환으로 인한 날짜 밀림 방지).

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// 로컬 날짜를 YYYY-MM-DD 로 (toISOString 의 UTC 변환 문제 회피)
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function monthStr(year: number, month1: number): string {
  return `${year}-${pad2(month1)}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export function weekdayLabel(i: number): string {
  return WEEKDAYS[i];
}

export function monthLabel(month1: number): string {
  return MONTHS[month1 - 1];
}

// 달력 그리드용: 해당 월의 (앞쪽 빈칸 포함) 날짜 배열. 빈칸은 null.
export function buildMonthGrid(year: number, month1: number): (string | null)[] {
  const firstDow = new Date(year, month1 - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${pad2(month1)}-${pad2(d)}`);
  }
  // 마지막 줄 채우기 (7의 배수)
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

// 시:분 (로컬)
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
