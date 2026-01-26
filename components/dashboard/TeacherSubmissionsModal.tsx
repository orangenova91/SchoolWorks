"use client";

import { createPortal } from "react-dom";
import TeacherSubmissionGrader from "./TeacherSubmissionGrader";
import { Button } from "@/components/ui/Button";

interface Props {
  courseId: string;
  evaluationId: string;
  unit?: string;
  onClose: () => void;
}

export default function TeacherSubmissionsModal({ courseId, evaluationId, unit, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-4">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">응시자 보기 — 평가단원: {unit ?? ""}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-md p-1"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <TeacherSubmissionGrader courseId={courseId} evaluationId={evaluationId} />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

