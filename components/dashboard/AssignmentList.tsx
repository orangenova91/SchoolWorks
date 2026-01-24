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
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentListProps {
  courseId: string;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: () => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export default function AssignmentList({
  courseId,
  onEdit,
  onDelete,
  showActions = true,
  emptyMessage = "등록된 자료가 없습니다. 위의 폼을 사용하여 첫 번째 자료를 생성해보세요.",
}: AssignmentListProps) {
  const { showToast } = useToastContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
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


  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAssignment(null);
      }
    };
    if (selectedAssignment) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [selectedAssignment]);

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

  const handleIncrementView = async (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, viewCount: (assignment.viewCount ?? 0) + 1 }
          : assignment
      )
    );

    try {
      await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`, {
        method: "PATCH",
        keepalive: true,
      });
    } catch (err) {
      console.error("Failed to increment view count:", err);
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
        {emptyMessage}
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
      {showActions && confirmDeleteId && assignmentToDelete && (
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
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">자료 상세</h4>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500">제목</span>
                <div className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                  {selectedAssignment.title}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">설명</span>
                <div className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedAssignment.description || "설명이 없습니다."}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3 text-xs text-gray-600">
              <div>
                <span className="font-medium text-gray-700">조회수</span>
                <div className="mt-1">{selectedAssignment.viewCount ?? 0}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">생성일</span>
                <div className="mt-1">{formatDate(selectedAssignment.createdAt)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">수정일</span>
                <div className="mt-1">
                  {selectedAssignment.updatedAt !== selectedAssignment.createdAt
                    ? formatDate(selectedAssignment.updatedAt)
                    : "-"}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900">첨부 파일</h4>
              {(selectedAssignment.attachments?.length ?? 0) > 0 ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {selectedAssignment.attachments?.map((att, index) => (
                    <li
                      key={`${att.originalFileName}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="truncate text-gray-700">
                        {att.originalFileName}
                        {att.fileSize ? ` (${formatFileSize(att.fileSize)})` : ""}
                      </span>
                      <Link
                        href={att.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleIncrementView(selectedAssignment.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        다운로드
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">첨부된 파일이 없습니다.</p>
              )}
            </div>

            {showActions && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onEdit?.(selectedAssignment);
                    setSelectedAssignment(null);
                  }}
                  className="rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(null);
                    setConfirmDeleteId(selectedAssignment.id);
                  }}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">번호</th>
                  <th className="px-4 py-3 text-left font-medium w-[36%] min-w-[240px]">제목</th>
                  <th className="px-4 py-3 text-left font-medium">첨부</th>
                  <th className="px-4 py-3 text-left font-medium">조회수</th>
                  <th className="px-4 py-3 text-left font-medium">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssignments.map((assignment, index) => {
                  const attachments = assignment.attachments ?? [];
                  return (
                    <tr
                      key={assignment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      <td className="px-4 py-3 align-top text-xs text-gray-500">
                        {filteredAssignments.length - index}
                      </td>
                      <td className="px-4 py-3 align-top w-[36%] min-w-[240px]">
                        <div className="font-medium text-gray-900">
                          {assignment.title}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {attachments.length > 0 ? (
                          <div className="space-y-1">
                            {attachments.map((att, index) => (
                              <Link
                                key={`${att.originalFileName}-${index}`}
                                href={att.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIncrementView(assignment.id);
                                }}
                                className="block text-xs font-medium text-blue-600 hover:text-blue-700 truncate"
                                title={att.originalFileName}
                              >
                                {att.originalFileName}
                                {att.fileSize ? ` (${formatFileSize(att.fileSize)})` : ""}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-500">
                        {assignment.viewCount ?? 0}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-500">
                        {formatDate(assignment.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

