"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Course {
  id: string;
  subject: string;
  instructor: string;
  createdAt: string;
  grade?: string | null;
  classGroupSchedule?: string;
  firstClassGroupId?: string | null;
  firstClassGroupStudentIds?: string[];
  enrollmentOpen?: boolean;
}

function isCourseVisibleForStudentGrade(course: Course, studentGrade: string | null) {
  if (!studentGrade) return true;

  const g = (course.grade ?? "").toString().trim();

  // grade 미설정 또는 무학년제는 모든 학년에 노출
  if (!g || g === "무학년제") return true;

  return g === studentGrade;
}

export default function AfterSchoolCourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  // Period state helpers (derive early so other code can use)
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPeriodSet = Boolean(periodStart && periodEnd);
  const isPeriodOpen = isPeriodSet && periodStart <= todayStr && todayStr <= periodEnd;

  const fetchPeriod = async () => {
    try {
      const res = await fetch("/api/after-school/periods/course_creation");
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const p = data?.period;
      if (p) {
        setPeriodStart(p.start ? new Date(p.start).toISOString().slice(0, 10) : "");
        setPeriodEnd(p.end ? new Date(p.end).toISOString().slice(0, 10) : "");
      } else {
        // If no period data, reset to empty
        setPeriodStart("");
        setPeriodEnd("");
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const res = await fetch("/api/student/profile");
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const grade = data?.profile?.grade ?? null;
      setStudentGrade(typeof grade === "string" ? (grade.trim() || null) : null);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCourses();
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        const role = data?.user?.role || null;
        setCurrentUserId(data?.user?.id || null);
        setCurrentUserRole(role);
        if (role === "student") {
          fetchStudentProfile();
        }
      } catch (e) {
        // ignore
      }
    })();
    // fetch configured period (course_creation) for display
    fetchPeriod();
  }, []);

  // Refetch period when page becomes visible (e.g., user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPeriod();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Periodically refetch period to ensure it stays up-to-date (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPeriod();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/after-school/courses");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "강의 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error("Fetch courses error:", err);
      setError(err instanceof Error ? err.message : "강의 목록을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const visibleCourses =
    currentUserRole === "student"
      ? courses.filter((course) => isCourseVisibleForStudentGrade(course, studentGrade))
      : courses;

  return (
    <div className="space-y-6">
      {/* 강의 생성 섹션 (버튼 없음) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3" style={{ minHeight: '2.5rem' }}>
          <h2 className="text-lg font-semibold text-gray-900">강의 생성</h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">강의 생성 기간</span>
            <span className="mx-2 w-px h-3 bg-gray-300" /> {/* 수직 구분선 추가 (선택사항) */}
            <span className="text-sm font-medium text-gray-800">
              {periodStart || "미설정"}
              {periodEnd ? ` ~ ${periodEnd}` : ""}
            </span>
          </span>
        </div>
        <p className="text-sm text-gray-600">신청 목록을 보고 교사가 강의를 생성할 수 있습니다.</p>
      </div>

      {/* 생성된 강의 목록 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">생성된 강의 목록</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : visibleCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">생성된 강의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">순</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강좌명</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">스케줄</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강사</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">수강 신청</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">수강생 수</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.map((course, idx) => (
                  <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{idx + 1}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{course.subject}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{course.classGroupSchedule || "-"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{course.instructor}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {currentUserRole === "student" && course.firstClassGroupId ? (
                        (() => {
                          const joined =
                            Array.isArray((course as any).firstClassGroupStudentIds) &&
                            currentUserId &&
                            (course as any).firstClassGroupStudentIds.includes(currentUserId);
                          const open = course.enrollmentOpen ?? true;
                          // If enrollment is closed, show disabled "강의 닫힘"
                          if (!open) {
                            return (
                              <button
                                type="button"
                                disabled
                                className="flex items-center justify-center px-1 h-6 rounded-sm text-xs bg-gray-200 text-gray-500 cursor-not-allowed whitespace-nowrap"
                                title="신청이 종료된 강의입니다."
                              >
                                강의 닫힘
                              </button>
                            );
                          }
                          return (
                            <Button
                              type="button"
                              disabled={!isPeriodOpen}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!isPeriodOpen) {
                                  alert(!isPeriodSet ? "교사가 강의 생성 기간을 설정하지 않았습니다." : "현재는 강의 생성 기간이 아닙니다.");
                                  return;
                                }
                                try {
                                  if (!joined) {
                                    const res = await fetch(
                                      `/api/courses/${course.id}/class-groups/${(course as any).firstClassGroupId}/join`,
                                      { method: "POST" }
                                    );
                                    const body = await res.json().catch(() => null);
                                    if (!res.ok) {
                                      alert(body?.error || "가입에 실패했습니다.");
                                      return;
                                    }
                                    alert(body?.message || "가입되었습니다.");
                                  } else {
                                    // confirm before unjoining
                                    const confirmed = window.confirm("신청을 취소하시겠습니까?");
                                    if (!confirmed) {
                                      return;
                                    }
                                    const res = await fetch(
                                      `/api/courses/${course.id}/class-groups/${(course as any).firstClassGroupId}/join`,
                                      { method: "DELETE" }
                                    );
                                    const body = await res.json().catch(() => null);
                                    if (!res.ok) {
                                      alert(body?.error || "취소에 실패했습니다.");
                                      return;
                                    }
                                    alert(body?.message || "가입이 취소되었습니다.");
                                  }
                                  await fetchCourses();
                                } catch (err) {
                                  console.error(err);
                                  alert("요청 중 오류가 발생했습니다.");
                                }
                              }}
                              title={
                                !isPeriodSet
                                  ? "교사가 강의 생성 기간을 설정하지 않았습니다."
                                  : !isPeriodOpen
                                  ? "현재는 강의 생성 기간이 아닙니다."
                                  : undefined
                              }
                              className={`flex items-center justify-center px-1 h-6 rounded-sm text-xs ${
                                // style difference if joined or disabled
                                !isPeriodOpen
                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : joined
                                  ? "bg-gray-200 text-gray-700 cursor-pointer"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {joined ? "신청완료" : "신청하기"}
                            </Button>
                          );
                        })()
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            const ok = window.confirm("해당 강좌에 신청하시겠습니까? (학생 계정으로 신청해야 합니다.)");
                            if (!ok) return;
                            window.alert("신청 기능은 학생 계정에서 진행해야 합니다. (추후 구현 예정)");
                          }}
                          className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-1 h-6 rounded-sm text-xs whitespace-nowrap"
                        >
                          신청하기
                        </Button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {Array.isArray(course.firstClassGroupStudentIds) ? `${course.firstClassGroupStudentIds.length}명` : "0명"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

