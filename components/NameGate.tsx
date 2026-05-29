"use client";

import { useState } from "react";

interface Props {
  initial?: string;
  onSubmit: (name: string) => void;
  onCancel?: () => void; // 이름 변경 모드일 때 취소
}

// 첫 진입(또는 이름 변경) 시 이름을 받는 화면.
// 로그인은 아니지만 "이 이름이 내 기록 공간" 이라는 감각을 준다.
export default function NameGate({ initial = "", onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial);
  const valid = name.trim().length > 0;

  return (
    <main className="app-shell" style={{ justifyContent: "center", display: "flex", flexDirection: "column", minHeight: "80dvh" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.1em" }}>
          PROTEIN LENS
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "12px 0 6px" }}>
          이름을 알려주세요
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
          이 이름으로 기록이 저장되고, 다음에 같은 이름으로 들어오면
          <br />그대로 이어집니다. (비밀번호 없음)
        </p>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예: 대인"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid) onSubmit(name.trim());
        }}
        style={{
          background: "var(--card-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "16px 16px",
          color: "var(--text)",
          fontSize: 18,
          fontFamily: "inherit",
          textAlign: "center",
          marginBottom: 16,
        }}
      />

      <button className="btn" disabled={!valid} onClick={() => onSubmit(name.trim())}>
        시작하기
      </button>
      {onCancel && (
        <button
          className="btn btn-secondary"
          style={{ marginTop: 10 }}
          onClick={onCancel}
        >
          취소
        </button>
      )}
    </main>
  );
}
