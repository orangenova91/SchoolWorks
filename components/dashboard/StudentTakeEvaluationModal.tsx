 "use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";

interface QuestionItem {
  questionType: "객관식" | "서술형";
  questionText: string;
  imageUrl?: string;
  points: number;
  options?: Array<{ text: string }>;
}

interface EvaluationQuestion {
  id: string;
  unit: string;
  evaluationContent?: string;
  questionNumber: string;
  questions: QuestionItem[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  courseId: string;
  evaluation: EvaluationQuestion;
  onClose: () => void;
  onSubmitted?: () => void;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function StudentTakeEvaluationModal({
  courseId,
  evaluation,
  onClose,
  onSubmitted,
  readOnly = false,
  onEdit,
  onDelete,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const { showToast } = useToastContext();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // check if the current student already submitted for this evaluation
    const checkSubmitted = async () => {
      try {
        const res = await fetch(
          `/api/courses/${courseId}/evaluation-questions/${evaluation.id}/submissions/me`
        );
        if (res.ok) {
          setAlreadySubmitted(true);
        } else {
          setAlreadySubmitted(false);
        }
      } catch (e) {
        // ignore network errors here
        setAlreadySubmitted(false);
      }
    };
    checkSubmitted();
  }, [courseId, evaluation.id]);

  // when readOnly, load the student's submission answers for display
  useEffect(() => {
    if (!readOnly) return;
    let mounted = true;
    const fetchSubmission = async () => {
      try {
        const res = await fetch(
          `/api/courses/${courseId}/evaluation-questions/${evaluation.id}/submissions/me`
        );
        if (!res.ok) return;
        const data = await res.json();
        const submission = data.submission;
        const ansArr = Array.isArray(submission?.answers) ? submission.answers : JSON.parse(submission?.answers || "[]");
        const map: Record<number, number | string> = {};
        for (const a of ansArr) {
          const idx = Number(a.index);
          if (a.type === "객관식") {
            map[idx] = typeof a.answer === "number" ? a.answer : Number(a.answer);
          } else {
            map[idx] = String(a.answer ?? "");
          }
        }
        if (mounted) setAnswers(map);
      } catch (e) {
        // ignore
      }
    };
    fetchSubmission();
    return () => {
      mounted = false;
    };
  }, [readOnly, courseId, evaluation.id]);

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleWriteAnswer = (qIndex: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: text }));
  };

  const handleSubmit = async () => {
    if (alreadySubmitted) {
      showToast("이미 제출하셨습니다.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      // build answers array
      const payloadAnswers = evaluation.questions.map((q, qi) => {
        const ans = answers[qi];
        return {
          index: qi,
          type: q.questionType,
          answer: q.questionType === "객관식" ? (typeof ans === "number" ? ans : null) : (typeof ans === "string" ? ans : ""),
        };
      });

      const res = await fetch(
        `/api/courses/${courseId}/evaluation-questions/${evaluation.id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payloadAnswers }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // handle already-submitted race condition
        if (res.status === 409) {
          showToast(err?.error || "이미 제출했습니다.", "error");
          onClose();
          return;
        }
        throw new Error(err?.error || "제출에 실패했습니다.");
      }

      const data = await res.json();
      showToast("제출이 저장되었습니다.", "success");
      onSubmitted?.();
      onClose();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "제출 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] rounded-xl bg-white shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">평가 응시: {evaluation.unit}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 rounded-md p-1"
              aria-label="모달 닫기"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {evaluation.evaluationContent?.trim() && (
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {evaluation.evaluationContent}
            </div>
          )}

          {evaluation.questions.map((q, qi) => (
            <div key={qi} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-800">문항 {qi + 1}</div>
                <div className="text-xs text-gray-500">{q.points}점</div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{q.questionText}</div>
              {q.imageUrl && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                  <img
                    src={q.imageUrl}
                    alt="문항 이미지"
                    className="max-h-64 w-full rounded-md object-contain"
                  />
                </div>
              )}
              {q.questionType === "객관식" && q.options && (
                <div className="mt-2 space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => {
                          if (readOnly) return;
                          handleSelectOption(qi, oi);
                        }}
                        disabled={readOnly}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === "서술형" && (
                <textarea
                  rows={4}
                  value={typeof answers[qi] === "string" ? (answers[qi] as string) : ""}
                  onChange={(e) => {
                    if (readOnly) return;
                    handleWriteAnswer(qi, e.target.value);
                  }}
                  readOnly={readOnly}
                  disabled={readOnly}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-4">
         
        <div>
    {readOnly && (
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          const ok = window.confirm(
            "정말로 이 평가 문항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          );
          if (!ok) return;

          try {
            const res = await fetch(
              `/api/courses/${courseId}/evaluation-questions/${evaluation.id}`,
              { method: "DELETE" }
            );

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err?.error || "삭제 실패");
            }

            showToast("평가 문항이 삭제되었습니다.", "success");
            onDelete?.();
            onClose();
          } catch (e) {
            console.error(e);
            const message =
              e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.";
            showToast(message, "error");
          }
        }}
        className="border-red-300 text-red-600 hover:bg-red-50"
      >
        삭제
      </Button>
    )}
  </div>

  {/* 오른쪽: 수정 / 닫기 / 제출 */}
  <div className="flex items-center gap-3">
    {readOnly && onEdit && (
      <Button
        type="button"
        variant="outline"
        onClick={onEdit}
        className="border-amber-300 text-amber-600 hover:bg-amber-50"
      >
        수정
      </Button>
    )}

    <Button type="button" variant="outline" onClick={onClose}>
      닫기
    </Button>

    {!readOnly && (
      <Button
        type="button"
        isLoading={isSubmitting}
        onClick={handleSubmit}
        disabled={alreadySubmitted || isSubmitting}
      >
        {alreadySubmitted ? "이미 제출됨" : "제출하기"}
      </Button>
    )}
  </div>



        </div>
      </div>
    </div>,
    document.body
  );
}

