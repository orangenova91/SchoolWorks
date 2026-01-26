"use client";

import { useEffect, useState } from "react";

interface Props {
  courseId: string;
  evaluationId: string;
}

export default function TeacherSubmissionGrader({ courseId, evaluationId }: Props) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${courseId}/evaluation-questions/${evaluationId}/submissions`);
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, [courseId, evaluationId]);

  const handleGrade = async (submissionId: string, scores: Array<{ index: number; score: number }>) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/evaluation-questions/${evaluationId}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      });
      if (!res.ok) throw new Error("채점 실패");
      await fetchSubs();
      alert("채점 저장됨");
    } catch (e) {
      console.error(e);
      alert("채점 중 오류");
    }
  };

  if (loading) return <div>로딩중...</div>;
  if (submissions.length === 0) return <div>채점할 제출물이 없습니다.</div>;

  return (
    <div className="space-y-4">
      {submissions.map((sub) => {
        const answers = Array.isArray(sub.answers) ? sub.answers : JSON.parse(sub.answers || "[]");
        return (
          <div key={sub.id} className="rounded-lg border p-4 bg-white">
            <div className="flex items-center justify-between">
              <div>                
              <div className="text-sm font-medium">
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    학생: {sub.studentNumber ? sub.studentNumber + ' ' + sub.studentName : `- ${sub.studentName}`}
                  </span>
                  <span className="text-xs text-gray-500"> 제출일: {new Date(sub.createdAt).toLocaleString()}</span>
              </div>                
              
              </div>
              <div className="text-sm font-semibold">총점: {sub.totalScore ?? "—"}</div>
            </div>
            <div className="mt-3 space-y-3">
              {answers.map((a: any) => {
                const isMC = a.type === "객관식";
                const pointsTotal = Number(a.points ?? 0);
                const earned = isMC ? (a.isCorrect ? pointsTotal : 0) : (a.score ?? null);
                return (
                  <div
                    key={a.index}
                    className="p-3 border rounded flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{a.type} 문항 {a.index + 1}</div>
                        
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                          응답
                          {isMC && typeof a.correctAnswer !== "undefined" && (
                            <span className="text-xs text-gray-500">
                              (정답: {String(a.correctAnswer)})
                            </span>
                          )}
                          : {String(a.answer)}

                          {isMC && typeof a.correctAnswer !== "undefined" && (
                            <span className="ml-2 font-semibold">
                              {String(a.correctAnswer) === String(a.answer) ? (
                                <span className="text-green-600">(O)</span>
                              ) : (
                                <span className="text-red-500">(X)</span>
                              )}
                            </span>
                          )}
                        </div>
                    </div>

                    

                    <div className="flex-shrink-0 mt-1 md:mt-0 md:ml-4 flex flex-col items-end gap-2">
                      {isMC ? (
                        <div className="text-sm font-semibold text-gray-800">
                          점수: {earned}/{pointsTotal}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">채점 입력</label>
                          <input
                            type="number"
                            defaultValue={a.score ?? ""}
                            className="w-20 rounded border px-2 py-1"
                            onChange={(e) => {
                              (a as any)._pendingScore = Number(e.target.value);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/courses/${courseId}/evaluation-questions/${evaluationId}/release-scores`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ released: true }),
                        }
                      );
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err?.error || "점수 공개 실패");
                      }
                      alert("점수 공개 완료");
                    } catch (e) {
                      console.error(e);
                      alert("점수 공개 중 오류");
                    }
                  }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm"
                >
                  점수 공개
                </button>
                <button
                  onClick={() => {
                    const scores = answers
                      .filter((a: any) => a.type === "서술형" && typeof a._pendingScore === "number")
                      .map((a: any) => ({ index: a.index, score: a._pendingScore }));
                    handleGrade(sub.id, scores);
                  }}
                  className="rounded bg-indigo-600 text-white px-3 py-1"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

