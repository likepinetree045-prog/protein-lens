"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/db";
import { monthLabel, monthStr, todayStr } from "@/lib/dates";
import Calendar from "@/components/Calendar";
import DayDetail from "@/components/DayDetail";
import NameGate from "@/components/NameGate";

interface MonthData {
  entries: Entry[];
  dailySums: Record<string, number>;
  goal: number | null;
  dbConfigured: boolean;
}

const OWNER_KEY = "protein-lens:owner";
const goalCacheKey = (owner: string) => `protein-lens:goal:${owner}`;

export default function HomePage() {
  const now = new Date();
  const today = todayStr();

  // ── 사용자 이름(소유자) ──────────────────────────────────────
  const [owner, setOwner] = useState<string | null>(null);
  const [ownerLoaded, setOwnerLoaded] = useState(false);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(OWNER_KEY);
    if (saved) setOwner(saved);
    setOwnerLoaded(true);
  }, []);

  function saveOwner(name: string) {
    window.localStorage.setItem(OWNER_KEY, name);
    setOwner(name);
    setEditingName(false);
  }

  // ── 달력 상태 ────────────────────────────────────────────────
  const [year, setYear] = useState(now.getFullYear());
  const [month1, setMonth1] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entries?month=${monthStr(year, month1)}&owner=${encodeURIComponent(owner)}`,
      );
      const json = await res.json();
      if (json.ok) {
        const cached = Number(window.localStorage.getItem(goalCacheKey(owner)));
        const goal = json.goal ?? (Number.isFinite(cached) && cached > 0 ? cached : null);
        if (json.goal) window.localStorage.setItem(goalCacheKey(owner), String(json.goal));
        setData({
          entries: json.entries,
          dailySums: json.dailySums,
          goal,
          dbConfigured: json.dbConfigured,
        });
      } else {
        setData({ entries: [], dailySums: {}, goal: null, dbConfigured: false });
      }
    } catch {
      setData({ entries: [], dailySums: {}, goal: null, dbConfigured: false });
    } finally {
      setLoading(false);
    }
  }, [owner, year, month1]);

  useEffect(() => {
    void load();
  }, [load]);

  function prev() {
    if (month1 === 1) {
      setYear((y) => y - 1);
      setMonth1(12);
    } else setMonth1((m) => m - 1);
  }
  function next() {
    if (month1 === 12) {
      setYear((y) => y + 1);
      setMonth1(1);
    } else setMonth1((m) => m + 1);
  }

  async function changeGoal() {
    if (!owner) return;
    const cur = data?.goal ?? 140;
    const input = window.prompt("일일 목표 단백질 (g)", String(cur));
    if (input == null) return;
    const g = Number(input);
    if (!Number.isFinite(g) || g <= 0) return;
    window.localStorage.setItem(goalCacheKey(owner), String(g));
    setData((d) => (d ? { ...d, goal: g } : d));
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, daily_goal_g: g }),
    }).catch(() => {});
  }

  // ── 렌더 ─────────────────────────────────────────────────────
  if (!ownerLoaded) return <main className="app-shell" />;

  if (!owner || editingName) {
    return (
      <NameGate
        initial={owner ?? ""}
        onSubmit={saveOwner}
        onCancel={editingName && owner ? () => setEditingName(false) : undefined}
      />
    );
  }

  const selectedEntries =
    selectedDate && data
      ? data.entries.filter((e) => e.date === selectedDate)
      : [];

  return (
    <main className="app-shell">
      {!selectedDate ? (
        <>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setEditingName(true)}
              style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
            >
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em" }}>
                {owner}님의 기록
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                이름 탭 → 바꾸기
              </div>
            </button>
            <button
              onClick={changeGoal}
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
            >
              목표 {data?.goal ? `${Math.round(data.goal)}g` : "설정"}
            </button>
          </header>

          {data && !data.dbConfigured && (
            <div
              className="card"
              style={{ marginBottom: 16, borderColor: "var(--danger)", fontSize: 13 }}
            >
              DB가 아직 연결되지 않았어요. 기록이 저장되지 않습니다. (주인용: SETUP.md 참고)
            </div>
          )}

          <Calendar
            year={year}
            month1={month1}
            dailySums={data?.dailySums ?? {}}
            goal={data?.goal ?? null}
            today={today}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onPrev={prev}
            onNext={next}
          />

          {loading && (
            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
              불러오는 중…
            </p>
          )}
        </>
      ) : (
        <DayDetail
          owner={owner}
          date={selectedDate}
          dateLabel={`${year}년 ${monthLabel(month1)} ${Number(selectedDate.slice(8, 10))}일`}
          entries={selectedEntries}
          goal={data?.goal ?? null}
          onChanged={load}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </main>
  );
}
