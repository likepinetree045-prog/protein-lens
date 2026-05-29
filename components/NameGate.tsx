"use client";

import { useState } from "react";

interface Props {
  onAuthed: (owner: string, token: string) => void;
  onCancel?: () => void; // 기존 세션이 있을 때만(이름 바꾸기 취소)
}

type Step = "name" | "login" | "register";
const PIN_RE = /^\d{4,6}$/;

// 이름 → 비밀번호(숫자 4~6자리) 흐름.
// 처음 쓰는 이름이면 비번 설정(확인까지), 있는 이름이면 비번 입력.
export default function NameGate({ onAuthed, onCancel }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const owner = name.trim();
  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  // 이름 다음 → 처음인지(register) 아닌지(login) 판별
  async function nextFromName() {
    if (!owner) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth?owner=${encodeURIComponent(owner)}`);
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setPin("");
      setPin2("");
      setStep(json.exists ? "login" : "register");
    } catch {
      setError("네트워크 문제예요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(mode: "login" | "register") {
    if (!PIN_RE.test(pin)) {
      setError("비밀번호는 숫자 4~6자리예요.");
      return;
    }
    if (mode === "register" && pin !== pin2) {
      setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, pin, mode }),
      });
      const json = await res.json();
      if (json.ok && json.token) {
        onAuthed(owner, json.token);
        return;
      }
      if (json.code === "taken") {
        // 등록하려 했는데 이미 있으면 로그인으로 전환
        setPin("");
        setPin2("");
        setStep("login");
        setError("이미 있는 이름이에요. 비밀번호로 로그인해주세요.");
        return;
      }
      setError(json.message ?? "다시 시도해주세요.");
      if (json.code === "bad_pin") setPin("");
    } catch {
      setError("네트워크 문제예요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  function backToName() {
    setStep("name");
    setPin("");
    setPin2("");
    setError("");
  }

  return (
    <main
      className="app-shell"
      style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "82dvh" }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.1em" }}>
          PROTEIN LENS
        </div>
        {step === "name" && (
          <>
            <h1 style={h1}>이름을 알려주세요</h1>
            <p style={sub}>
              이 이름 + 비밀번호로 내 기록이 저장돼요.
              <br />다음에 같은 이름으로 들어오면 그대로 이어집니다.
            </p>
          </>
        )}
        {step === "login" && (
          <>
            <h1 style={h1}>{owner}님, 다시 오셨네요</h1>
            <p style={sub}>비밀번호(숫자 4~6자리)를 입력해주세요.</p>
          </>
        )}
        {step === "register" && (
          <>
            <h1 style={h1}>처음이시네요!</h1>
            <p style={sub}>
              {owner}님이 쓸 비밀번호를 만들어요.
              <br />숫자 4~6자리 (잊어버리면 기록을 볼 수 없어요)
            </p>
          </>
        )}
      </div>

      {/* 이름 단계 */}
      {step === "name" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 대인"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && owner && !busy && nextFromName()}
          style={field}
        />
      )}

      {/* 비밀번호 단계 (로그인/등록 공통) */}
      {step !== "name" && (
        <>
          <input
            value={pin}
            onChange={(e) => setPin(onlyDigits(e.target.value))}
            placeholder="비밀번호 (숫자 4~6자리)"
            inputMode="numeric"
            type={showPin ? "text" : "password"}
            autoFocus
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !busy &&
              step === "login" &&
              submitPin("login")
            }
            style={field}
          />
          {step === "register" && (
            <input
              value={pin2}
              onChange={(e) => setPin2(onlyDigits(e.target.value))}
              placeholder="비밀번호 확인"
              inputMode="numeric"
              type={showPin ? "text" : "password"}
              onKeyDown={(e) => e.key === "Enter" && !busy && submitPin("register")}
              style={{ ...field, marginTop: 10 }}
            />
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13, margin: "10px 2px 0" }}>
            <input type="checkbox" checked={showPin} onChange={(e) => setShowPin(e.target.checked)} />
            비밀번호 보기
          </label>
        </>
      )}

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "12px 2px 0", textAlign: "center" }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {step === "name" && (
          <button className="btn" disabled={!owner || busy} onClick={nextFromName}>
            {busy ? "확인 중…" : "다음"}
          </button>
        )}
        {step === "login" && (
          <button className="btn" disabled={busy} onClick={() => submitPin("login")}>
            {busy ? "로그인 중…" : "로그인"}
          </button>
        )}
        {step === "register" && (
          <button className="btn" disabled={busy} onClick={() => submitPin("register")}>
            {busy ? "만드는 중…" : "시작하기"}
          </button>
        )}

        {step !== "name" && (
          <button className="btn btn-secondary" onClick={backToName} disabled={busy}>
            ← 이름 바꾸기
          </button>
        )}
        {step === "name" && onCancel && (
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            취소
          </button>
        )}
      </div>
    </main>
  );
}

const h1: React.CSSProperties = { fontSize: 24, fontWeight: 800, margin: "12px 0 6px" };
const sub: React.CSSProperties = { color: "var(--muted)", fontSize: 14, margin: 0, lineHeight: 1.5 };
const field: React.CSSProperties = {
  background: "var(--card-2)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "16px",
  color: "var(--text)",
  fontSize: 18,
  fontFamily: "inherit",
  textAlign: "center",
};
