"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/gemini";

interface Props {
  result: AnalysisResult;
  saving: boolean;
  onSave: (edited: { name: string; protein_g: number }) => void;
  onCancel: () => void;
}

// 분석 결과: 단백질 숫자가 히어로. 이름/그램은 저장 전 수정 가능.
export default function ResultCard({ result, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(result.name);
  const [grams, setGrams] = useState(String(result.proteinGrams));

  const gramsNum = Number(grams);
  const valid = name.trim().length > 0 && Number.isFinite(gramsNum) && gramsNum >= 0;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center" }}>
        <div className="hero-number">{grams || 0}</div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          단백질 (g)
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        <span
          className={`badge ${result.confidence === "exact" ? "badge-exact" : "badge-estimate"}`}
        >
          {result.confidence === "exact" ? "정확" : "추정"}
        </span>
        <span className="badge badge-estimate">
          {result.kind === "label"
            ? "영양성분표"
            : result.kind === "product"
              ? "포장제품"
              : "음식"}
        </span>
      </div>

      <label style={lbl}>
        이름
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />
      </label>

      <label style={lbl}>
        단백질 (g) · {result.servingDesc || "1회 제공량"}
        <input
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          inputMode="decimal"
          style={input}
        />
      </label>

      {result.basis && (
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          근거: {result.basis}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button
          className="btn"
          disabled={!valid || saving}
          onClick={() => onSave({ name: name.trim(), protein_g: gramsNum })}
        >
          {saving ? "저장 중…" : "이 날짜에 저장"}
        </button>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  color: "var(--muted)",
  fontWeight: 600,
};

const input: React.CSSProperties = {
  background: "var(--card-2)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 14px",
  color: "var(--text)",
  fontSize: 16,
  fontFamily: "inherit",
};
