"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

type AnswerItem = {
  questionId: string;
  questionText: string;
  text: string;
};

type ActivityAnswerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  activityContent?: string;
  onAnswered: (eventId: string, hasAnswers: boolean) => void;
};

export default function ActivityAnswerModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  activityContent,
  onAnswered,
}: ActivityAnswerModalProps) {
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [materials, setMaterials] = useState<
    { filePath: string; originalFileName: string; fileSize?: number | null; mimeType?: string | null }[]
  >([]);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    setIsLoading(true);
    fetch(`/api/calendar-events/${eventId}/activity-answers`)
      .then((res) => res.json())
      .then((data) => {
        const qs = (data.questions || []) as Array<{ id: string; text: string }>;
        const as = (data.answers || []) as Array<{
          questionId: string;
          text: string;
        }>;
        const answerMap: Record<string, string> = {};
        as.forEach((a) => {
          answerMap[a.questionId] = a.text;
        });
        const merged: AnswerItem[] = qs.map((q) => ({
          questionId: q.id,
          questionText: q.text,
          text: answerMap[q.id] ?? "",
        }));
        setAnswers(merged);

        const mats = (data.materials || []) as Array<{
          filePath: string;
          originalFileName: string;
          fileSize?: number | null;
          mimeType?: string | null;
        }>;
        setMaterials(Array.isArray(mats) ? mats : []);
      })
      .catch(() => {
        showToast("활동 응답을 불러오는 데 실패했습니다.", "error");
        setAnswers([]);
        setMaterials([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, eventId, showToast]);

  const handleChange = (questionId: string, text: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, text } : a
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const trimmed = answers.map((a) => ({
        questionId: a.questionId,
        text: a.text.trim(),
      }));
      const hasNonEmpty = trimmed.some((a) => a.text.length > 0);
      const res = await fetch(
        `/api/calendar-events/${eventId}/activity-answers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: trimmed }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "활동 응답을 저장하는 중 오류가 발생했습니다."
        );
      }
      showToast("활동 응답이 저장되었습니다.", "success");
      onAnswered(eventId, hasNonEmpty);
    } catch (error: any) {
      showToast(
        error.message || "활동 응답을 저장하는 중 오류가 발생했습니다.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-6xl rounded-xl bg-white shadow-xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">활동 응답</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        </div>

        {eventTitle && (
          <p
            className="text-lg font-semibold text-gray-900 mb-3 truncate shrink-0"
            title={eventTitle}
          >
            {eventTitle}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            활동 질문과 응답을 불러오는 중...
          </p>
        ) : answers.length === 0 ? (
          <>
            {activityContent && (
              <div className="mb-4 p-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
                {activityContent}
              </div>
            )}
            <p className="text-sm text-gray-500 py-8 text-center border-t border-gray-100 pt-4">
              교사가 등록한 활동 질문이 없습니다.
            </p>
          </>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0 border-t border-gray-100 pt-4"
          >
            <div className="flex flex-1 min-h-0 gap-6">
              {/* 활동 내용 영역 (읽기 전용) */}
              <div className="flex-1 flex flex-col min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  활동 내용
                </label>
                <div className="flex-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap overflow-y-auto min-h-[120px]">
                  {activityContent
                    ? activityContent
                    : "교사가 등록한 활동 내용이 없습니다."}
                </div>

                {materials.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        활동 자료 파일
                      </span>
                      <span className="text-xs text-gray-400">
                        교사가 첨부한 자료를 클릭하면 새 창에서 열립니다.
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {materials.map((file, index) => (
                        <li key={`${file.filePath}-${index}`}>
                          <a
                            href={file.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {file.originalFileName || file.filePath}
                          </a>
                          {typeof file.fileSize === "number" && (
                            <span className="ml-1 text-[11px] text-gray-400">
                              ({(file.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 질문/응답 영역 */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    활동 질문에 응답
                  </label>
                  <span className="text-xs text-gray-400">
                    각 질문에 대해 서술형으로 답변하세요.
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {answers.map((a, index) => (
                    <div key={a.questionId} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 mt-1.5 shrink-0 w-6">
                          {index + 1}.
                        </span>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {a.questionText}
                        </p>
                      </div>
                      <textarea
                        value={a.text}
                        onChange={(e) =>
                          handleChange(a.questionId, e.target.value)
                        }
                        rows={3}
                        maxLength={500}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 resize-none"
                        placeholder="여기에 답변을 입력하세요."
                      />
                      <div className="flex justify-end">
                        <span className="text-xs text-gray-400">
                          {a.text.length}/500
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                저장
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

