"use client";

import {
  buildMonthGrid,
  dayOfMonth,
  monthLabel,
  weekdayLabel,
} from "@/lib/dates";

interface Props {
  year: number;
  month1: number; // 1-12
  dailySums: Record<string, number>;
  goal: number | null;
  today: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Calendar({
  year,
  month1,
  dailySums,
  goal,
  today,
  selectedDate,
  onSelect,
  onPrev,
  onNext,
}: Props) {
  const cells = buildMonthGrid(year, month1);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button onClick={onPrev} aria-label="이전 달" style={navBtn}>
          ‹
        </button>
        <div style={{ fontSize: 22, fontWeight: 800 }}>
          {year}년 {monthLabel(month1)}
        </div>
        <button onClick={onNext} aria-label="다음 달" style={navBtn}>
          ›
        </button>
      </div>

      <div style={grid}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 11,
              color: i === 0 ? "#ff7d7d" : "var(--muted)",
              fontWeight: 600,
              paddingBottom: 4,
            }}
          >
            {weekdayLabel(i)}
          </div>
        ))}

        {cells.map((date, idx) => {
          if (!date) return <div key={`e${idx}`} />;
          const sum = dailySums[date] ?? 0;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const ratio = goal && goal > 0 ? Math.min(sum / goal, 1) : 0;
          const reached = goal != null && sum >= goal && goal > 0;
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              style={{
                ...cell,
                border: isSelected
                  ? "1.5px solid var(--accent)"
                  : isToday
                    ? "1.5px solid var(--muted)"
                    : "1px solid var(--border)",
                background:
                  sum > 0
                    ? `rgba(198, 255, 0, ${0.06 + ratio * 0.22})`
                    : "var(--card)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? "var(--accent)" : "var(--text)",
                }}
              >
                {dayOfMonth(date)}
              </span>
              {sum > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: reached ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {Math.round(sum)}g
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "var(--card-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  width: 40,
  height: 40,
  borderRadius: 12,
  fontSize: 22,
  lineHeight: 1,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const cell: React.CSSProperties = {
  aspectRatio: "1 / 1",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  padding: 0,
};
