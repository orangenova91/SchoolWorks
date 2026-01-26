"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import TeacherSubmissionsModal from "./TeacherSubmissionsModal";
import StudentTakeEvaluationModal from "./StudentTakeEvaluationModal";
import { useToastContext } from "@/components/providers/ToastProvider";
import EvaluationQuestionForm from "./EvaluationQuestionForm";

interface StudentEvaluationProps {
  courseId: string;
}

interface EvaluationQuestion {
  id: string;
  unit: string;
  evaluationContent?: string;
  questionNumber: string;
  questions: Array<{
    questionType: "객관식" | "서술형";
    questionText: string;
    imageUrl?: string;
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
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [submissionsEvaluation, setSubmissionsEvaluation] = useState<EvaluationQuestion | null>(null);
  const { showToast } = useToastContext();
  const [previewEvaluation, setPreviewEvaluation] = useState<EvaluationQuestion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
      evaluationContent: selectedEvaluationQuestion.evaluationContent,
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
      const contentMatch = eq.evaluationContent?.toLowerCase().includes(keyword) ?? false;
      const numberMatch = eq.questionNumber.toLowerCase().includes(keyword);
      const questionMatch = eq.questions.some(
        (question) =>
          question.questionText.toLowerCase().includes(keyword) ||
          (question.questionType === "서술형" && question.modelAnswer?.toLowerCase().includes(keyword)) ||
          (question.questionType === "객관식" &&
            question.options?.some((option) => option.text.toLowerCase().includes(keyword)))
      );
      return unitMatch || contentMatch || numberMatch || questionMatch;
    });
  }, [evaluationQuestions, searchTerm]);

  return (
    <>
      {/* 검색 + 생성 버튼 */}
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
          <Button type="button" variant="primary" onClick={openCreatePanel}>
            평가 문항 만들기
          </Button>
        </div>
      </div>
  
      {/* 상태 분기 */}
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
              {/* ===== 카드 헤더 ===== */}
              <div className="relative bg-gray-50 border-b border-gray-200 px-6 py-4">
                {/* 오른쪽 상단 버튼 영역 */}
                <div
                  className="absolute top-4 right-4 flex items-center gap-2"
                  data-eval-menu-id={eq.id}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewEvaluation(eq);
                        setIsPreviewOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      문제 보기
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmissionsEvaluation(eq);
                        setSubmissionsModalOpen(true);
                      }}
                      className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      응시자 보기
                    </button>
                  </div>
  
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
                    <div className="absolute right-0 top-full mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            openEditPanel(eq);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          {deletingId === eq.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
  
                {/* 왼쪽 텍스트 영역 (버튼 영역과 겹치지 않게 padding) */}
                <div className="pr-24">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-sm font-semibold text-blue-700">
                    평가 단원
                  </span>
                  <span>{eq.unit}</span>
                </h3>

  
                  {eq.evaluationContent?.trim() && (
                    <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                      {eq.evaluationContent}
                    </p>
                  )}
  
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                      문제 비밀번호
                    </span>
                      <span className={eq.questionNumber?.trim() ? "text-gray-500" : "text-gray-400 italic"}>
                        {eq.questionNumber?.trim() ? eq.questionNumber : "<비번 없음>"}
                      </span>
                  </div>

                </div>
  
                <div className="absolute right-4 bottom-2 text-xs text-gray-500">
                  생성일: {new Date(eq.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
  
              {/* ===== 카드 본문 요약 ===== */}
              <div className="flex-1 px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-600">문항 수</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {eq.questions.length}개
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">총 배점</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {eq.questions.reduce(
                        (s, q) => s + (Number(q.points) || 0),
                        0
                      )}
                      점
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">유형 분포</div>
                    <div className="text-sm text-gray-700">
                      객관식{" "}
                      {
                        eq.questions.filter(
                          (q) => q.questionType === "객관식"
                        ).length
                      }
                      개 · 서술형{" "}
                      {
                        eq.questions.filter(
                          (q) => q.questionType === "서술형"
                        ).length
                      }
                      개
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
  
      {/* 생성/수정 패널 */}
      {isMounted &&
        isPanelOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {panelTitle}
                </h3>
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
  
      {/* 응시자 모달 */}
      {submissionsModalOpen && submissionsEvaluation && (
        <TeacherSubmissionsModal
          courseId={courseId}
          evaluationId={submissionsEvaluation.id}
          unit={submissionsEvaluation.unit}
          onClose={() => {
            setSubmissionsModalOpen(false);
            setSubmissionsEvaluation(null);
          }}
        />
      )}
      {isPreviewOpen && previewEvaluation && (
        <StudentTakeEvaluationModal
          courseId={courseId}
          evaluation={previewEvaluation}
          readOnly={true}
          onEdit={() => {
            // close preview and open edit panel for this evaluation
            setIsPreviewOpen(false);
            const ev = previewEvaluation;
            setPreviewEvaluation(null);
            if (ev) {
              openEditPanel(ev);
            }
          }}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewEvaluation(null);
          }}
          onDelete={() => {
            // refresh list after deletion
            fetchEvaluationQuestions();
          }}
        />
      )}
    </>
  );
  
}
