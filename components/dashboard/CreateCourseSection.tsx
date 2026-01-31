"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import CreateClassForm from "@/components/dashboard/CreateClassForm";

type CreateCourseSectionProps = {
  instructorName: string;
};

export default function CreateCourseSection({ instructorName }: CreateCourseSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
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

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const modal = isModalOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">방과후 강의 생성</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
          <CreateClassForm
            instructorName={instructorName}
            courseType="after_school"
            onSuccess={handleClose}
            onCreated={async () => {
              await fetchCourses();
            }}
          />
          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  ) : null;

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
    <>
      <div className="space-y-6">
        {/* 강의 생성 섹션 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3" style={{ minHeight: '2.5rem' }}>
            <h2 className="text-lg font-semibold text-gray-900">강의 생성</h2>
            <Button onClick={handleOpen} className="bg-green-600 hover:bg-green-700 h-10">
              강의 생성
            </Button>
          </div>
          <p className="text-sm text-gray-600">신청 목록을 보고 교사가 강의를 생성할 수 있습니다.</p>
        </div>

        {/* 생성된 강의 목록 - 강의 생성 섹션 아래 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">생성된 강의 목록</h3>
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
                  {courses.map((c: any, idx: number) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{courses.length - idx}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{c.subject}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.instructor}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {mounted && isModalOpen && createPortal(modal, document.body)}
    </>
  );
}


