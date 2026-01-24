"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useToastContext } from "@/components/providers/ToastProvider";
import EvaluationQuestionForm from "./EvaluationQuestionForm";

interface StudentEvaluationProps {
  courseId: string;
}

interface EvaluationQuestion {
  id: string;
  unit: string;
  questionNumber: string;
  questions: Array<{
    questionType: "객관식" | "서술형";
    questionText: string;
    points: number;
    options?: Array<{ text: string }>;
    correctAnswer?: number;
    modelAnswer?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function StudentEvaluation({ courseId }: StudentEvaluationProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [selectedEvaluationQuestion, setSelectedEvaluationQuestion] = useState<EvaluationQuestion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const { showToast } = useToastContext();

  const fetchEvaluationQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/courses/${courseId}/evaluation-questions`);
      const data = await response.json();
      
      if (response.ok) {
        console.log("평가 문항 조회 성공:", data);
        setEvaluationQuestions(data.evaluationQuestions || []);
      } else {
        console.error("평가 문항 조회 실패:", data);
        setEvaluationQuestions([]);
      }
    } catch (error) {
      console.error("평가 문항 조회 오류:", error);
      setEvaluationQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchEvaluationQuestions();
    }
  }, [courseId]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`[data-eval-menu-id="${openMenuId}"]`)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isPanelOpen]);

  const handleSuccess = () => {
    setIsPanelOpen(false);
    setPanelMode("create");
    setSelectedEvaluationQuestion(null);
    fetchEvaluationQuestions();
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setPanelMode("create");
    setSelectedEvaluationQuestion(null);
    setOpenMenuId(null);
  };

  const openCreatePanel = () => {
    setPanelMode("create");
    setSelectedEvaluationQuestion(null);
    setIsPanelOpen(true);
  };

  const openEditPanel = (evaluationQuestion: EvaluationQuestion) => {
    setPanelMode("edit");
    setSelectedEvaluationQuestion(evaluationQuestion);
    setIsPanelOpen(true);
  };

  const handleDelete = async (evaluationQuestionId: string) => {
    const confirmed = window.confirm("정말로 이 평가 문항을 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(evaluationQuestionId);
      const response = await fetch(
        `/api/courses/${courseId}/evaluation-questions/${evaluationQuestionId}`,
        {
          method: "DELETE",
        }
      );

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch (error) {
        console.warn("평가 문항 삭제 응답 파싱 실패:", error);
      }

      if (!response.ok) {
        let errorMessage = "평가 문항 삭제 중 오류가 발생했습니다.";
        if (
          responseBody &&
          typeof responseBody === "object" &&
          "error" in responseBody &&
          typeof (responseBody as { error?: unknown }).error === "string"
        ) {
          errorMessage = (responseBody as { error: string }).error;
        }
        throw new Error(errorMessage);
      }

      showToast("평가 문항이 삭제되었습니다.", "success");
      setOpenMenuId(null);
      fetchEvaluationQuestions();
    } catch (error) {
      console.error("평가 문항 삭제 오류:", error);
      const message =
        error instanceof Error ? error.message : "평가 문항 삭제 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const panelTitle = panelMode === "edit" ? "평가 문항 수정하기" : "평가 문항 만들기";
  const initialFormData = useMemo(() => {
    if (!selectedEvaluationQuestion) {
      return undefined;
    }
    return {
      unit: selectedEvaluationQuestion.unit,
      questionNumber: selectedEvaluationQuestion.questionNumber,
      questions: selectedEvaluationQuestion.questions,
    };
  }, [selectedEvaluationQuestion]);

  const filteredEvaluationQuestions = useMemo(() => {
    if (!searchTerm.trim()) {
      return evaluationQuestions;
    }
    const keyword = searchTerm.trim().toLowerCase();
    return evaluationQuestions.filter((eq) => {
      const unitMatch = eq.unit.toLowerCase().includes(keyword);
      const numberMatch = eq.questionNumber.toLowerCase().includes(keyword);
      const questionMatch = eq.questions.some(
        (question) =>
          question.questionText.toLowerCase().includes(keyword) ||
          (question.questionType === "서술형" && question.modelAnswer?.toLowerCase().includes(keyword)) ||
          (question.questionType === "객관식" &&
            question.options?.some((option) => option.text.toLowerCase().includes(keyword)))
      );
      return unitMatch || numberMatch || questionMatch;
    });
  }, [evaluationQuestions, searchTerm]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex-1">
          <label htmlFor="evaluation-search" className="sr-only">
            평가 문항 검색
          </label>
          <input
            id="evaluation-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="평가 단원, 문제 번호, 문항 내용으로 검색..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={openCreatePanel}
          >
            평가 문항 만들기
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          평가 문항을 불러오는 중...
        </div>
      ) : filteredEvaluationQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          검색 결과가 없어요. 다른 키워드를 입력해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvaluationQuestions.map((eq) => (
            <div
              key={eq.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm h-full flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">평가 단원: {eq.unit}</h3>
                  <p className="text-sm text-gray-500 mt-1">문제 주문번호: {eq.questionNumber}</p>
                </div>
                <div
                  className="flex items-center gap-2 text-xs text-gray-400 relative"
                  data-eval-menu-id={eq.id}
                >
                  <span>생성일: {new Date(eq.createdAt).toLocaleString("ko-KR")}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === eq.id ? null : eq.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                    aria-label="문항 옵션 더보기"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>
                  {openMenuId === eq.id && (
                    <div className="absolute right-0 top-full mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            openEditPanel(eq);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleDelete(eq.id);
                          }}
                          disabled={deletingId === eq.id}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                        >
                          {deletingId === eq.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 flex-1 px-6 py-6">
                {eq.questions.map((question, index) => (
                  <div
                    key={index}
                    className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          문항 {index + 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {question.questionType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.points}점
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                      {question.questionText}
                    </p>
                    {question.questionType === "객관식" && question.options && (
                      <div className="mt-2 space-y-1">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`text-sm pl-4 ${
                              question.correctAnswer === optIndex
                                ? "text-blue-700 font-medium"
                                : "text-gray-600"
                            }`}
                          >
                            {optIndex + 1}. {option.text}
                            {question.correctAnswer === optIndex && (
                              <span className="ml-2 text-xs text-blue-600">(정답)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {question.questionType === "서술형" && question.modelAnswer && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-medium text-gray-500 mb-1">모범답안:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {question.modelAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isMounted && isPanelOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-4"
          role="dialog"
          aria-modal="true"
        >
          <div
          className="relative w-full max-w-2xl min-h-[93vh] rounded-xl bg-white shadow-xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{panelTitle}</h3>
              <button
                type="button"
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md p-1"
                aria-label="모달 닫기"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <EvaluationQuestionForm
                courseId={courseId}
                mode={panelMode}
                evaluationQuestionId={selectedEvaluationQuestion?.id}
                initialData={initialFormData}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
