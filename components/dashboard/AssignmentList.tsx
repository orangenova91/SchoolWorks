"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToastContext } from "@/components/providers/ToastProvider";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  attachments?: {
    filePath: string;
    originalFileName: string;
    fileSize: number | null;
    mimeType: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface AssignmentListProps {
  courseId: string;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: () => void;
}

export default function AssignmentList({ courseId, onEdit, onDelete }: AssignmentListProps) {
  const { showToast } = useToastContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/courses/${courseId}/assignments`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "자료 목록을 불러오는데 실패했습니다.");
      }

      setAssignments(data.assignments || []);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
      setError(err instanceof Error ? err.message : "자료 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);


  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const target = event.target as HTMLElement;
        if (!target.closest(`[data-menu-id="${openMenuId}"]`)) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openMenuId]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const handleDelete = async (assignmentId: string) => {
    try {
      setDeletingId(assignmentId);
      const response = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "자료 삭제에 실패했습니다.");
      }

      showToast("자료가 삭제되었습니다.", "success");
      setConfirmDeleteId(null);
      fetchAssignments(); // 목록 새로고침
      onDelete?.(); // 부모 컴포넌트에 알림
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      const message =
        err instanceof Error ? err.message : "자료 삭제 중 오류가 발생했습니다.";
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        자료 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
        등록된 자료가 없습니다. 위의 폼을 사용하여 첫 번째 자료를 생성해보세요.
      </div>
    );
  }

  const assignmentToDelete = assignments.find((a) => a.id === confirmDeleteId);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredAssignments = normalizedQuery
    ? assignments.filter((a) => {
        const inTitle = a.title.toLowerCase().includes(normalizedQuery);
        const inDesc = (a.description || "").toLowerCase().includes(normalizedQuery);
        const inAttachments = (a.attachments || []).some((att) =>
          (att.originalFileName || "").toLowerCase().includes(normalizedQuery)
        );
        return inTitle || inDesc || inAttachments;
      })
    : assignments;

  return (
    <>
      <div className="mb-3">
        <label htmlFor="material-search" className="sr-only">
          자료 검색
        </label>
        <input
          id="material-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 설명, 첨부 파일명으로 검색..."
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        />
      </div>
      {confirmDeleteId && assignmentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              과제 삭제 확인
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              정말로 {assignmentToDelete.title} 과제를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === confirmDeleteId ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          검색 결과가 없습니다.
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssignments.map((assignment) => (
        <article
          key={assignment.id}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4">
            <header className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {assignment.title}
                </h3>
                {assignment.description && (
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                )}
              </div>
              {/* 마감일 UI 제거 */}
            </header>

            {(assignment.attachments && assignment.attachments.length > 0) && (
              <div className="space-y-2">
                {assignment.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {att.originalFileName}
                      </p>
                      {att.fileSize && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(att.fileSize)}
                        </p>
                      )}
                    </div>
                    <Link
                      href={att.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      다운로드
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <footer className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-4">
                <span>생성일: {formatDate(assignment.createdAt)}</span>
                {assignment.updatedAt !== assignment.createdAt && (
                  <span>수정일: {formatDate(assignment.updatedAt)}</span>
                )}
              </div>
              <div className="relative" data-menu-id={assignment.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === assignment.id ? null : assignment.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                  aria-label="메뉴 열기"
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
                {openMenuId === assignment.id && (
                  <div className="absolute right-0 bottom-full mb-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          onEdit?.(assignment);
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
                          setConfirmDeleteId(assignment.id);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </footer>
          </div>
        </article>
      ))}
      </div>
      )}
    </>
  );
}

