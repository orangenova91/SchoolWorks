"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import { Plus, Trash2 } from "lucide-react";

type QuestionItem = { text: string };

type ActivityFileItem = {
  id?: string;
  name: string;
  size: number;
};

type ActivityBuilderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  initialActivityContent?: string;
  onActivitySaved: (eventId: string, activityContent: string) => void;
  onQuestionsSaved: (eventId: string, questionCount: number) => void;
};

export default function ActivityBuilderModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  initialActivityContent = "",
  onActivitySaved,
  onQuestionsSaved,
}: ActivityBuilderModalProps) {
  const { showToast } = useToastContext();

  const [activityContent, setActivityContent] = useState(initialActivityContent);
  const [questions, setQuestions] = useState<QuestionItem[]>([{ text: "" }]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<ActivityFileItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActivityContent(initialActivityContent);
      if (eventId) {
        setIsLoadingQuestions(true);
        fetch(`/api/calendar-events/${eventId}/activity-questions`)
          .then((res) => res.json())
          .then((data) => {
            if (data.questions?.length) {
              setQuestions(
                data.questions.map((q: { text: string }) => ({ text: q.text }))
              );
            } else {
              setQuestions([{ text: "" }]);
            }
          })
          .catch(() => setQuestions([{ text: "" }]))
          .finally(() => setIsLoadingQuestions(false));
      }
    }
  }, [isOpen, eventId, initialActivityContent]);

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: ActivityFileItem[] = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activityContent.length > 500) {
      showToast("활동 내용은 500자 이하여야 합니다.", "error");
      return;
    }

    const trimmedQuestions = questions
      .map((q) => q.text.trim())
      .filter(Boolean);
    const hasLongQuestion = trimmedQuestions.some((t) => t.length > 500);
    if (hasLongQuestion) {
      showToast("각 질문은 500자 이하여야 합니다.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) 활동 내용 저장
      const activityRes = await fetch(`/api/calendar-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityContent: activityContent.trim() || null,
        }),
      });
      const activityData = await activityRes.json();
      if (!activityRes.ok) {
        throw new Error(
          activityData.error || "활동 내용 저장 중 오류가 발생했습니다."
        );
      }

      onActivitySaved(eventId, activityContent.trim());

      // 2) 질문 저장
      const questionsRes = await fetch(
        `/api/calendar-events/${eventId}/activity-questions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: trimmedQuestions.map((text) => ({ text })),
          }),
        }
      );
      const questionsData = await questionsRes.json();
      if (!questionsRes.ok) {
        throw new Error(
          questionsData.error || "활동지 질문 저장 중 오류가 발생했습니다."
        );
      }

      onQuestionsSaved(eventId, trimmedQuestions.length);

      showToast("활동 내용과 질문이 저장되었습니다.", "success");
      onClose();
    } catch (error: any) {
      showToast(
        error.message ||
          "활동 내용/질문을 저장하는 중 오류가 발생했습니다.",
        "error"
      );
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
        className="relative w-full max-w-4xl rounded-xl bg-white shadow-xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">활동 제작</h2>
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
            className="text-sm text-gray-600 mb-3 truncate shrink-0"
            title={eventTitle}
          >
            {eventTitle}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 border-t border-gray-100 pt-4"
        >
          <div className="flex flex-1 min-h-0 gap-6">
            {/* 활동 내용 영역 */}
            <div className="flex-1 flex flex-col min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                활동 내용
              </label>
              <textarea
                value={activityContent}
                onChange={(e) => setActivityContent(e.target.value)}
                rows={8}
                maxLength={500}
                className="flex-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 resize-none"
                placeholder="활동할 내용을 입력하세요"
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {activityContent.length}/500
              </p>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    활동 자료 파일
                  </span>
                  <span className="text-xs text-gray-400">
                    활동에 사용할 자료(예: PDF, 이미지)를 첨부하세요.
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {files.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      첨부된 파일이 없습니다.
                    </p>
                  ) : (
                    files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between text-xs text-gray-700"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-gray-400 hover:text-red-600 text-[11px]"
                        >
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFilesSelected}
                    className="block w-full text-xs text-gray-500
                               file:mr-2 file:py-1 file:px-2
                               file:rounded-md file:border-0
                               file:text-xs file:font-medium
                               file:bg-gray-100 file:text-gray-700
                               hover:file:bg-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* 질문 생성 영역 */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  활동 질문
                </label>
                <span className="text-xs text-gray-400">
                  학생이 답변할 서술형 질문을 추가하세요.
                </span>
              </div>

              {isLoadingQuestions ? (
                <p className="text-sm text-gray-500 py-4">
                  질문을 불러오는 중...
                </p>
              ) : (
                <>
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {questions.map((q, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <span className="text-xs text-gray-400 mt-2.5 shrink-0 w-6">
                          {index + 1}.
                        </span>
                        <textarea
                          value={q.text}
                          onChange={(e) =>
                            updateQuestion(index, e.target.value)
                          }
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
                  <div className="mt-3 flex flex-wrap gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addQuestion}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      질문 추가
                    </Button>
                  </div>
                </>
              )}
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
      </div>
    </div>
  );
}

