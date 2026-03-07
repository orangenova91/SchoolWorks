"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { CounselingRecordItem } from "./CounselingRecordList";

const COUNSELING_TYPES = [
  { value: "학습", label: "학습" },
  { value: "생활", label: "생활" },
  { value: "진로", label: "진로" },
  { value: "학부모", label: "학부모" },
  { value: "기타", label: "기타" },
];

type CounselingRecordEditModalProps = {
  record: CounselingRecordItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function toDateTimeLocal(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CounselingRecordEditModal({
  record,
  isOpen,
  onClose,
  onSuccess,
}: CounselingRecordEditModalProps) {
  const { showToast } = useToastContext();
  const [counseledAt, setCounseledAt] = useState("");
  const [type, setType] = useState("학습");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) return;
    setCounseledAt(toDateTimeLocal(record.counseledAt));
    setType(record.type ?? "학습");
    setSummary(record.summary ?? "");
    setContent(record.content);
    setIsPrivate(record.isPrivate ?? false);
  }, [isOpen, record]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!content.trim()) {
      showToast("상담 내용을 입력해주세요.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/teacher/counseling-records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counseledAt: new Date(counseledAt).toISOString(),
          type,
          summary: summary.trim() || undefined,
          content: content.trim(),
          isPrivate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "수정에 실패했습니다.");
      }
      showToast("상담기록이 수정되었습니다.", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message ?? "수정에 실패했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="counseling-edit-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="counseling-edit-title" className="text-lg font-semibold text-gray-900">
            상담기록 수정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <p className="text-sm text-gray-600">
            학생: {record.studentName ?? "-"} {record.studentNumber && `(${record.studentNumber})`}
          </p>
          <Input
            label="상담 일시"
            type="datetime-local"
            value={counseledAt}
            onChange={(e) => setCounseledAt(e.target.value)}
            required
          />
          <Select
            label="상담 유형"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={COUNSELING_TYPES}
          />
          <Input
            label="요약 (선택)"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="한 줄 요약"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              상담 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상담 내용을 입력하세요"
              required
              rows={5}
              className="flex w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">비공개</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
