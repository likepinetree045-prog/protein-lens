"use client";

import { useRef } from "react";

interface Props {
  label?: string;
  disabled?: boolean;
  onCapture: (imageBase64: string, mimeType: string) => void;
  onError: () => void;
}

const MAX_DIM = 1024; // 긴 변 기준 리사이즈 (업로드 용량/비용 절감)

// 카메라 촬영 또는 갤러리 업로드 → 클라에서 리사이즈 → base64 콜백.
export default function CameraButton({
  label = "📷 사진으로 추가",
  disabled,
  onCapture,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    try {
      const { base64, mime } = await resizeToBase64(file);
      onCapture(base64, mime);
    } catch {
      onError();
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // 같은 파일 재선택 허용
          if (f) void handleFile(f);
        }}
      />
      <button
        className="btn"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
    </>
  );
}

function resizeToBase64(
  file: File,
): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else if (height >= width && height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas unavailable"));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) return reject(new Error("encode failed"));
      resolve({ base64, mime: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}
