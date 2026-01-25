"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

interface Props {
  onClose: () => void;
  onSubmit: (password: string) => Promise<boolean> | boolean;
  title?: string;
}

export default function StudentPasswordModal({ onClose, onSubmit, title = "문제 비밀번호 입력" }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const ok = await onSubmit(password);
      if (!ok) {
        setError("비밀번호가 일치하지 않습니다.");
        return;
      }
      onClose();
    } catch (e) {
      setError("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-4">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-md p-1"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" isLoading={isSubmitting} onClick={handleSubmit}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

