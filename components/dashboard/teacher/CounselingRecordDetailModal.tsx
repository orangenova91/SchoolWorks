"use client";

import { useEffect } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import type { CounselingRecordItem } from "./CounselingRecordList";

type CounselingRecordDetailModalProps = {
  record: CounselingRecordItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdated?: () => void;
};

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CounselingRecordDetailModal({
  record,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: CounselingRecordDetailModalProps) {
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

  if (!isOpen || !record) return null;

  const handleDeleteClick = () => {
    if (confirm("이 상담기록을 삭제하시겠습니까?")) {
      onDelete();
      onClose();
    }
  };

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
        aria-labelledby="counseling-detail-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="counseling-detail-title" className="text-lg font-semibold text-gray-900">
            상담기록 상세
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
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-500">학생</span>
              <p className="mt-0.5 text-gray-900">
                {record.studentName ?? "-"}
                {record.studentNumber && (
                  <span className="ml-2 text-gray-500">({record.studentNumber})</span>
                )}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-500">상담 일시</span>
              <p className="mt-0.5 text-gray-900">{formatDateTime(record.counseledAt)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">유형</span>
              <p className="mt-0.5 text-gray-900">{record.type ?? "-"}</p>
            </div>
            {record.summary && (
              <div>
                <span className="font-medium text-gray-500">요약</span>
                <p className="mt-0.5 text-gray-900">{record.summary}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-500">상담 내용</span>
              <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-gray-900">
                {record.content}
              </p>
            </div>
            {record.isPrivate && (
              <p className="text-xs text-amber-600">비공개 기록입니다.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={handleDeleteClick}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Pencil className="h-4 w-4" />
            수정
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
