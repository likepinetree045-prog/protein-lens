"use client";

import { useState } from "react";
import type { Entry } from "@/lib/db";
import type { AnalysisResult } from "@/lib/gemini";
import { timeLabel } from "@/lib/dates";
import CameraButton from "./CameraButton";
import ResultCard from "./ResultCard";
import ErrorRetry from "./ErrorRetry";

interface Props {
  owner: string;
  date: string;
  dateLabel: string;
  entries: Entry[];
  goal: number | null;
  onChanged: () => void; // 월 데이터 재조회
  onClose: () => void;
}

type Flow =
  | { step: "idle" }
  | { step: "analyzing" }
  | { step: "result"; result: AnalysisResult; saving: boolean }
  | { step: "manual"; saving: boolean }
  | { step: "error"; message: string };

// 직접 입력 시 ResultCard 에 넣을 빈 시드.
const MANUAL_SEED: AnalysisResult = {
  name: "",
  servingDesc: "",
  proteinGrams: 0,
  kind: "food",
  confidence: "estimate",
  basis: "직접 입력",
};

export default function DayDetail({
  owner,
  date,
  dateLabel,
  entries,
  goal,
  onChanged,
  onClose,
}: Props) {
  const [flow, setFlow] = useState<Flow>({ step: "idle" });

  const total = entries.reduce((s, e) => s + e.protein_g, 0);
  const ratio = goal && goal > 0 ? Math.min(total / goal, 1) : 0;
  const reached = goal != null && goal > 0 && total >= goal;

  async function analyze(imageBase64: string, mimeType: string) {
    setFlow({ step: "analyzing" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlow({ step: "result", result: data.result, saving: false });
      } else {
        setFlow({ step: "error", message: data.message ?? "분석에 실패했어요." });
      }
    } catch {
      setFlow({ step: "error", message: "네트워크 문제로 분석하지 못했어요." });
    }
  }

  async function save(
    base: AnalysisResult,
    edited: { name: string; protein_g: number },
  ) {
    const isManual = base === MANUAL_SEED;
    setFlow(
      isManual
        ? { step: "manual", saving: true }
        : { step: "result", result: base, saving: true },
    );
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner,
          date,
          name: edited.name,
          protein_g: edited.protein_g,
          kind: base.kind,
          confidence: base.confidence,
          basis: base.basis,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlow({ step: "idle" });
        onChanged();
      } else {
        setFlow({ step: "error", message: data.message ?? "저장하지 못했어요." });
      }
    } catch {
      setFlow({ step: "error", message: "네트워크 문제로 저장하지 못했어요." });
    }
  }

  async function remove(id: string) {
    const res = await fetch(
      `/api/entries?id=${id}&owner=${encodeURIComponent(owner)}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) onChanged();
  }

  async function editGrams(entry: Entry) {
    const input = window.prompt(`"${entry.name}" 단백질(g)`, String(entry.protein_g));
    if (input == null) return;
    const g = Number(input);
    if (!Number.isFinite(g) || g < 0) return;
    const res = await fetch(
      `/api/entries?id=${entry.id}&owner=${encodeURIComponent(owner)}`,
      {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ protein_g: g }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (data.ok) onChanged();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{dateLabel}</div>
        <button onClick={onClose} className="btn btn-secondary" style={{ width: "auto", padding: "8px 14px" }}>
          ← 달력
        </button>
      </div>

      {/* 합계 + 목표 진행바 */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="hero-number" style={{ fontSize: 48 }}>
            {Math.round(total)}
          </span>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>
            g{goal ? ` / 목표 ${Math.round(goal)}g` : ""}
          </span>
        </div>
        {goal != null && goal > 0 && (
          <div
            style={{
              marginTop: 12,
              height: 8,
              borderRadius: 999,
              background: "var(--card-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${ratio * 100}%`,
                height: "100%",
                background: reached ? "var(--accent)" : "rgba(198,255,0,0.6)",
                transition: "width 0.3s",
              }}
            />
          </div>
        )}
      </div>

      {/* 기록 리스트 */}
      {entries.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "8px 0" }}>
          아직 기록이 없어요. 아래에서 사진으로 추가해보세요.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((e) => (
            <div
              key={e.id}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.name}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {timeLabel(e.created_at)} · {e.confidence === "exact" ? "정확" : "추정"}
                </div>
              </div>
              <button
                onClick={() => editGrams(e)}
                style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: 16 }}
              >
                {e.protein_g}g
              </button>
              <button
                onClick={() => remove(e.id)}
                aria-label="삭제"
                style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 18 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 추가 플로우 */}
      {flow.step === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CameraButton
            onCapture={analyze}
            onError={() =>
              setFlow({ step: "error", message: "사진을 읽지 못했어요. 다시 찍어볼까요?" })
            }
          />
          <button
            className="btn btn-secondary"
            onClick={() => setFlow({ step: "manual", saving: false })}
          >
            ✏️ 직접 입력
          </button>
        </div>
      )}
      {flow.step === "analyzing" && (
        <button className="btn" disabled>
          분석 중… 🔎
        </button>
      )}
      {flow.step === "result" && (
        <ResultCard
          result={flow.result}
          saving={flow.saving}
          onSave={(edited) => save(flow.result, edited)}
          onCancel={() => setFlow({ step: "idle" })}
        />
      )}
      {flow.step === "manual" && (
        <ResultCard
          result={MANUAL_SEED}
          saving={flow.saving}
          manual
          onSave={(edited) => save(MANUAL_SEED, edited)}
          onCancel={() => setFlow({ step: "idle" })}
        />
      )}
      {flow.step === "error" && (
        <ErrorRetry
          message={flow.message}
          onRetry={() => setFlow({ step: "idle" })}
          onManual={() => setFlow({ step: "manual", saving: false })}
          onDismiss={() => setFlow({ step: "idle" })}
        />
      )}
    </div>
  );
}
