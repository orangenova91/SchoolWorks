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
  description?: string | null;
  classroom?: string | null;
  capacity?: number | string | null;
}

export default function MyAfterSchoolEnrollments() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [sessionRes, coursesRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/after-school/courses"),
        ]);
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
        setCurrentUserId(sessionData?.user?.id ?? null);

        if (!coursesRes.ok) {
          const errorData = await coursesRes.json().catch(() => ({}));
          throw new Error(errorData.error || "강의 목록을 불러오는 데 실패했습니다.");
        }
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "데이터를 불러오는 데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const enrolledCourses = courses.filter((course) => {
    if (!currentUserId || !course.firstClassGroupId) return false;
    const ids = course.firstClassGroupStudentIds || [];
    return Array.isArray(ids) && ids.includes(currentUserId);
  });

  const handleCancel = async (course: Course) => {
    const classGroupId = course.firstClassGroupId;
    if (!classGroupId) return;
    const ok = window.confirm("신청을 취소하시겠습니까?");
    if (!ok) return;
    try {
      setCancellingId(course.id);
      const res = await fetch(
        `/api/courses/${course.id}/class-groups/${classGroupId}/join`,
        { method: "DELETE" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        alert(body?.error || "취소에 실패했습니다.");
        return;
      }
      alert(body?.message || "가입이 취소되었습니다.");
      await fetchCourses();
    } catch (err) {
      console.error(err);
      alert("요청 중 오류가 발생했습니다.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">수강 신청 결과</h2>
      <p className="text-sm text-gray-600">
        신청하기로 수강 신청한 방과후 강의 목록입니다. 취소는 강의 신청 탭에서도 가능합니다.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : enrolledCourses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
          신청한 강의가 없습니다. 강의 신청 탭에서 수강할 강의를 신청해 주세요.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">순</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강좌명</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">스케줄</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강사</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">상태</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">수강생 수</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">신청 취소</th>
              </tr>
            </thead>
            <tbody>
              {enrolledCourses.map((course, index) => {
                const enrolled = Array.isArray(course.firstClassGroupStudentIds)
                  ? course.firstClassGroupStudentIds.length
                  : 0;
                const cap = course.capacity != null ? Number(course.capacity) : null;
                const capacityText =
                  cap != null && !Number.isNaN(cap) ? `${enrolled}/${cap}명` : `${enrolled}명`;
                return (
                  <tr
                    key={course.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {course.subject}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {course.classGroupSchedule || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{course.instructor}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        신청완료
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{capacityText}</td>
                    <td className="py-3 px-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancellingId === course.id}
                        onClick={() => handleCancel(course)}
                        className="text-xs"
                      >
                        {cancellingId === course.id ? "처리 중..." : "취소"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
