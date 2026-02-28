"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

type ActivityInputModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  initialValue?: string;
  onSaved: (eventId: string, activityContent: string) => void;
};

export default function ActivityInputModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  initialValue = "",
  onSaved,
}: ActivityInputModalProps) {
  const { showToast } = useToastContext();
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (value.length > 500) {
      showToast("활동 내용은 500자 이하여야 합니다.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/calendar-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityContent: value.trim() || null }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "활동 내용 저장 중 오류가 발생했습니다.");
      }

      onSaved(eventId, value.trim());
      showToast("활동 내용이 저장되었습니다.", "success");
      onClose();
    } catch (error: any) {
      showToast(error.message || "활동 내용 저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">활동 내용 입력</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        </div>
        {eventTitle && (
          <p className="text-sm text-gray-600 mb-3 truncate" title={eventTitle}>
            {eventTitle}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              활동 내용
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              maxLength={500}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              placeholder="활동할 내용을 입력하세요"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500 text-right">{value.length}/500</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
