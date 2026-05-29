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
const TOKEN_KEY = "protein-lens:token";
const goalCacheKey = (owner: string) => `protein-lens:goal:${owner}`;

export default function HomePage() {
  const now = new Date();
  const today = todayStr();

  // ── 인증(이름 + 토큰) ────────────────────────────────────────
  const [owner, setOwner] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [relogin, setRelogin] = useState(false);

  useEffect(() => {
    const o = window.localStorage.getItem(OWNER_KEY);
    const t = window.localStorage.getItem(TOKEN_KEY);
    if (o && t) {
      setOwner(o);
      setToken(t);
    }
    setAuthLoaded(true);
  }, []);

  function onAuthed(name: string, tok: string) {
    window.localStorage.setItem(OWNER_KEY, name);
    window.localStorage.setItem(TOKEN_KEY, tok);
    setOwner(name);
    setToken(tok);
    setRelogin(false);
    setSelectedDate(null);
    setData(null);
  }

  const logout = useCallback(() => {
    window.localStorage.removeItem(OWNER_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    setOwner(null);
    setToken(null);
    setSelectedDate(null);
    setData(null);
  }, []);

  // ── 달력 상태 ────────────────────────────────────────────────
  const [year, setYear] = useState(now.getFullYear());
  const [month1, setMonth1] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!owner || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?month=${monthStr(year, month1)}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
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
  }, [owner, token, year, month1, logout]);

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
    if (!owner || !token) return;
    const cur = data?.goal ?? 140;
    const input = window.prompt("일일 목표 단백질 (g)", String(cur));
    if (input == null) return;
    const g = Number(input);
    if (!Number.isFinite(g) || g <= 0) return;
    window.localStorage.setItem(goalCacheKey(owner), String(g));
    setData((d) => (d ? { ...d, goal: g } : d));
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_goal_g: g }),
    }).catch(() => {});
  }

  // ── 렌더 ─────────────────────────────────────────────────────
  if (!authLoaded) return <main className="app-shell" />;

  if (!owner || !token || relogin) {
    return (
      <NameGate
        onAuthed={onAuthed}
        onCancel={owner && token && relogin ? () => setRelogin(false) : undefined}
      />
    );
  }

  const selectedEntries =
    selectedDate && data ? data.entries.filter((e) => e.date === selectedDate) : [];

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
              onClick={() => setRelogin(true)}
              style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
            >
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em" }}>
                {owner}님의 기록
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>이름 탭 → 바꾸기/로그아웃</div>
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
            <div className="card" style={{ marginBottom: 16, borderColor: "var(--danger)", fontSize: 13 }}>
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
          token={token}
          date={selectedDate}
          dateLabel={`${year}년 ${monthLabel(month1)} ${Number(selectedDate.slice(8, 10))}일`}
          entries={selectedEntries}
          goal={data?.goal ?? null}
          onChanged={load}
          onAuthExpired={logout}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </main>
  );
}
