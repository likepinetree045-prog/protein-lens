"use client";

interface Props {
  message: string;
  onRetry: () => void;
  onManual?: () => void;
  onDismiss?: () => void;
}

// 친구용 친절 에러 + "다시 시도" + "직접 입력". 기술 detail 은 노출하지 않는다.
export default function ErrorRetry({ message, onRetry, onManual, onDismiss }: Props) {
  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}
    >
      <div style={{ fontSize: 32 }}>😵‍💫</div>
      <p style={{ margin: 0, fontSize: 15 }}>{message}</p>
      <div style={{ display: "flex", gap: 10 }}>
        {onDismiss && (
          <button className="btn btn-secondary" onClick={onDismiss}>
            닫기
          </button>
        )}
        <button className="btn" onClick={onRetry}>
          다시 시도
        </button>
      </div>
      {onManual && (
        <button
          className="btn btn-secondary"
          onClick={onManual}
          style={{ marginTop: 2 }}
        >
          ✏️ 직접 입력하기
        </button>
      )}
    </div>
  );
}
