"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Plus, Trash2 } from "lucide-react";

type QuestionItem = { id?: string; text: string };

type ActivitySheetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onSaved: (eventId: string, questionCount: number) => void;
};

export default function ActivitySheetModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSaved,
}: ActivitySheetModalProps) {
  const { showToast } = useToastContext();
  const [questions, setQuestions] = useState<QuestionItem[]>([{ text: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      fetch(`/api/calendar-events/${eventId}/activity-questions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.questions?.length) {
            setQuestions(data.questions.map((q: { text: string }) => ({ text: q.text })));
          } else {
            setQuestions([{ text: "" }]);
          }
        })
        .catch(() => setQuestions([{ text: "" }]))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, eventId]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { text: "" }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ text: "" }];
    });
  };

  const updateQuestion = (index: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toSave = questions.map((q) => q.text.trim()).filter(Boolean);
    const hasLong = toSave.some((t) => t.length > 500);
    if (hasLong) {
      showToast("각 질문은 500자 이하여야 합니다.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/calendar-events/${eventId}/activity-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: toSave.map((text) => ({ text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
      onSaved(eventId, toSave.length);
      showToast("활동지 질문이 저장되었습니다.", "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "활동지 질문 저장에 실패했습니다.", "error");
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">활동지 질문</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        </div>
        {eventTitle && (
          <p className="text-sm text-gray-600 mb-3 truncate shrink-0" title={eventTitle}>
            {eventTitle}
          </p>
        )}
        <p className="text-xs text-gray-500 mb-3 shrink-0">
          서술형 질문을 추가하세요. 추후 학생이 이 질문에 답변할 수 있습니다.
        </p>

        {isLoading ? (
          <p className="text-sm text-gray-500 py-4">질문을 불러오는 중...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {questions.map((q, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-xs text-gray-400 mt-2.5 shrink-0 w-6">
                    {index + 1}.
                  </span>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    placeholder="질문 내용 입력"
                    rows={2}
                    maxLength={500}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded mt-0.5 shrink-0"
                    aria-label="질문 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                질문 추가
              </Button>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
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
    </div>
  );
}
