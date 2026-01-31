"use client";

import { useEffect, useState } from "react";

interface Course {
  id: string;
  subject: string;
  instructor: string;
  createdAt: string;
}

export default function AfterSchoolCourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
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

  return (
    <div className="space-y-6">
      {/* 강의 생성 섹션 (버튼 없음) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3" style={{ minHeight: '2.5rem' }}>
          <h2 className="text-lg font-semibold text-gray-900">강의 생성</h2>
          <div className="h-10"></div>
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
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">생성된 강의가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">번호</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강좌명</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강사</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">생성일시</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, idx) => (
                  <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{courses.length - idx}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{course.subject}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{course.instructor}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(course.createdAt)}</td>
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

