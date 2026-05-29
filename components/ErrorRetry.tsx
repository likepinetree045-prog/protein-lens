"use client";

interface Props {
  message: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

// 친구용 친절 에러 + "다시 시도". 기술 detail 은 노출하지 않는다.
export default function ErrorRetry({ message, onRetry, onDismiss }: Props) {
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
    </div>
  );
}
