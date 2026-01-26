"use client";

import { useEffect, useMemo, useState } from "react";
import StudentTakeEvaluationModal from "./StudentTakeEvaluationModal";
import StudentPasswordModal from "./StudentPasswordModal";

interface StudentEvaluationStudentViewProps {
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
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function StudentEvaluationStudentView({
  courseId,
}: StudentEvaluationStudentViewProps) {
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedMap, setSubmittedMap] = useState<Record<string, boolean>>({});
  const [releasedMap, setReleasedMap] = useState<Record<string, boolean>>({});
  const [scoresMap, setScoresMap] = useState<Record<string, number | null>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<typeof evaluationQuestions[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<typeof evaluationQuestions[0] | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    const fetchEvaluationQuestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/courses/${courseId}/evaluation-questions`);
        const data = await response.json();

        if (response.ok) {
          setEvaluationQuestions(data.evaluationQuestions || []);
        } else {
          setEvaluationQuestions([]);
        }
      } catch {
        setEvaluationQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchEvaluationQuestions();
    }
  }, [courseId]);

  // after evaluationQuestions loaded, check per-evaluation submission status
  useEffect(() => {
    if (!evaluationQuestions || evaluationQuestions.length === 0) return;
    let mounted = true;
    const checks = async () => {
      const entries = await Promise.all(
        evaluationQuestions.map(async (eq) => {
          try {
            const [resSub, resRel] = await Promise.all([
              fetch(`/api/courses/${courseId}/evaluation-questions/${eq.id}/submissions/me`),
              fetch(`/api/courses/${courseId}/evaluation-questions/${eq.id}/release-scores`),
            ]);
            const submitted = resSub.ok;
            let totalScore: number | null = null;
            if (resSub.ok) {
              const data = await resSub.json().catch(() => ({}));
              const submission = data?.submission;
              totalScore = submission?.totalScore ?? null;
            }
            const released =
              resRel.ok && (await resRel.json().catch(() => ({})))?.released === true;
            return [eq.id, submitted, released, totalScore] as const;
          } catch {
            return [eq.id, false, false, null] as const;
          }
        })
      );
      if (!mounted) return;
      const sMap: Record<string, boolean> = {};
      const rMap: Record<string, boolean> = {};
      const scMap: Record<string, number | null> = {};
      for (const [id, submitted, released, totalScore] of entries) {
        sMap[id] = submitted;
        rMap[id] = released;
        scMap[id] = released ? totalScore ?? null : null;
      }
      setSubmittedMap(sMap);
      setReleasedMap(rMap);
      setScoresMap(scMap);
    };
    checks();
    return () => {
      mounted = false;
    };
  }, [evaluationQuestions, courseId]);

  const filteredEvaluationQuestions = useMemo(() => {
    if (!searchTerm.trim()) {
      return evaluationQuestions;
    }
    const keyword = searchTerm.trim().toLowerCase();
    return evaluationQuestions.filter((eq) => {
      const unitMatch = eq.unit.toLowerCase().includes(keyword);
      const contentMatch = eq.evaluationContent?.toLowerCase().includes(keyword) ?? false;
      return unitMatch || contentMatch;
    });
  }, [evaluationQuestions, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label htmlFor="evaluation-search-student" className="sr-only">
            평가 문항 검색
          </label>
          <input
            id="evaluation-search-student"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="평가 단원, 문제 번호, 문항 내용으로 검색..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          평가 문항을 불러오는 중...
        </div>
      ) : filteredEvaluationQuestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          표시할 평가 문항이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {filteredEvaluationQuestions.map((eq) => (
            <div
              key={eq.id}
              className="group rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 shadow-sm hover:shadow-lg transition-shadow transform hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {eq.unit}
                      </h3>
                      {eq.evaluationContent?.trim() ? (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                          {eq.evaluationContent}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">평가 내용이 없습니다.</p>
                      )}
                    </div>
                    <div className="hidden md:flex flex-shrink-0">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {eq.questions.length} 문항
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-44 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100 p-4 flex flex-col items-center justify-center gap-2">
                  <div className="text-xs text-gray-500">점수</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {releasedMap[eq.id] && typeof scoresMap[eq.id] === "number" ? (
                      <>
                        {String(scoresMap[eq.id])}/
                        {String(
                          eq.questions.reduce((s, q) => s + (Number((q as any).points) || 0), 0)
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-400">
                  생성일 · {new Date(eq.createdAt).toLocaleString("ko-KR")}
                </div>
                <div className="flex items-center gap-2">
                  {submittedMap[eq.id] ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvaluation(eq);
                          setViewOnly(true);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        문제보기
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 cursor-default"
                        disabled
                      >
                        응시완료
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (eq.questionNumber && String(eq.questionNumber).trim().length > 0) {
                          setPendingEvaluation(eq);
                          setIsPasswordModalOpen(true);
                        } else {
                          setSelectedEvaluation(eq);
                          setIsModalOpen(true);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      응시하기
                    </button>
                  )}
                </div>
              </div>
            </div>
            ))}

            {isModalOpen && selectedEvaluation && (
              <StudentTakeEvaluationModal
                courseId={courseId}
                evaluation={selectedEvaluation}
                readOnly={viewOnly}
                onClose={() => {
                  setIsModalOpen(false);
                  setSelectedEvaluation(null);
                  setViewOnly(false);
                }}
                onSubmitted={() => {
                  // mark as submitted locally
                  setSubmittedMap((prev) => ({ ...prev, [selectedEvaluation.id]: true }));
                }}
              />
            )}
            {isPasswordModalOpen && pendingEvaluation && (
              <StudentPasswordModal
                onClose={() => {
                  setIsPasswordModalOpen(false);
                  setPendingEvaluation(null);
                }}
                onSubmit={async (password) => {
                  try {
                    const res = await fetch(
                      `/api/courses/${courseId}/evaluation-questions/${pendingEvaluation?.id}/verify-password`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password }),
                      }
                    );
                    if (!res.ok) {
                      return false;
                    }
                    // success
                    setSelectedEvaluation(pendingEvaluation);
                    setIsModalOpen(true);
                    return true;
                  } catch (e) {
                    return false;
                  } finally {
                    setIsPasswordModalOpen(false);
                    setPendingEvaluation(null);
                  }
                }}
              />
            )}
          </div>

          
        </div>
      )}
    </div>
  );
}

