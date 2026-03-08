"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { MoreVertical, X } from "lucide-react";

interface CourseRequest {
  id: string;
  courseName: string;
  desiredContent: string;
  notes: string | null;
  studentName: string;
  authorStudentId?: string | null; // 작성자 학번 (studentProfile.studentId)
  companionStudents?: string | null; // display string: "학번 이름, 학번 이름"
  companionStudentUserIds?: string[];
  status: string;
  createdAt: string;
  studentId?: string | null;
}

export default function StudentCourseRequestSection({ showApplyButton = true }: { showApplyButton?: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    courseName: "",
    desiredContent: "",
    notes: "",
    companionStudents: "",
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserStudentId, setCurrentUserStudentId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CourseRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [detailForm, setDetailForm] = useState({
    courseName: "",
    desiredContent: "",
    notes: "",
    companionStudents: "",
  });
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [periodLoading, setPeriodLoading] = useState(false);
  // Period state helpers (derive early so other code can use)
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPeriodSet = Boolean(periodStart && periodEnd);
  const isPeriodOpen = isPeriodSet && periodStart <= todayStr && todayStr <= periodEnd;

  const fetchPeriod = async () => {
    try {
      const res = await fetch("/api/after-school/periods/student_requests");
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

  useEffect(() => {
    setMounted(true);
    fetchRequests();
    // fetch current session info for client-side checks
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        setCurrentUserId(data?.user?.id || null);
        setCurrentUserRole(data?.user?.role || null);
        setCurrentUserName(data?.user?.name || data?.user?.email || null);
        setCurrentUserStudentId(data?.user?.studentId || null);
      } catch (e) {
        // ignore
      }
    })();
    // fetch configured period (teacher-set) - key: student_requests
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

  useEffect(() => {
    if (!openMenuId) return;
    const onWindowClick = () => setOpenMenuId(null);
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [openMenuId]);

  const parseNames = (value: string | null | undefined) =>
    (value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const openDetail = (request: CourseRequest, options?: { startEditing?: boolean }) => {
    setSelectedRequest(request);
    setDetailForm({
      courseName: request.courseName,
      desiredContent: request.desiredContent,
      notes: request.notes || "",
      companionStudents: request.companionStudents || "",
    });
    setIsEditingDetail(Boolean(options?.startEditing));
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedRequest(null);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetailForm((p) => ({ ...p, [name]: value }));
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("정말 이 신청을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/after-school/requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      await fetchRequests();
      closeDetail();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/after-school/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "수정 실패");
      }
      await fetchRequests();
      setIsEditingDetail(false);
      closeDetail();
    } catch (err) {
      console.error(err);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  const fetchRequests = async (): Promise<any[]> => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/after-school/requests");
      if (!response.ok) {
        throw new Error("신청 목록을 불러오는데 실패했습니다.");
      }
      const data = await response.json();
      const parsed = data.requests || [];
      setRequests(parsed);
      // if a detail is open, refresh selectedRequest and detailForm
      if (selectedRequest) {
        const updated = parsed.find((p: any) => p.id === selectedRequest.id);
        if (updated) {
          setSelectedRequest(updated);
          setDetailForm({
            courseName: updated.courseName,
            desiredContent: updated.desiredContent,
            notes: updated.notes || "",
            companionStudents: updated.companionStudents || "",
          });
        }
      }
      return parsed;
    } catch (err: any) {
      console.error("Fetch requests error:", err);
      setError(err.message || "신청 목록을 불러오는데 실패했습니다.");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({
      courseName: "",
      desiredContent: "",
      notes: "",
      companionStudents: "",
    });
    setError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/after-school/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "신청 중 오류가 발생했습니다.");
      }

      // 성공 시 목록 새로고침
      await fetchRequests();
      handleClose();
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const modalContent = isModalOpen ? (
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
          <h2 className="text-lg font-semibold text-gray-900">강의 신청</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-6">
            {/* 희망 강좌명 + 작성자 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="courseName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  희망 강좌명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="courseName"
                  name="courseName"
                  value={formData.courseName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="희망하는 강좌명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작성자
                </label>
                <input
                  type="text"
                  readOnly
                  aria-readonly="true"
                  value={
                    `${(currentUserStudentId || "").trim()} ${(currentUserName || "").trim()}`.trim() ||
                    "정보 없음"
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 shadow-sm"
                />
              </div>
            </div>

            {/* 듣고 싶은 내용 */}
            <div>
              <label
                htmlFor="desiredContent"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                듣고 싶은 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="desiredContent"
                name="desiredContent"
                value={formData.desiredContent}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="듣고 싶은 내용을 자세히 입력하세요"
              />
            </div>

            {/* 비고 */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비고
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="추가로 전달하고 싶은 내용이 있으면 입력하세요"
              />
            </div>

            {/* 함께 신청하는 학생 */}
            <div>
              <label
                htmlFor="companionStudents"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                함께 신청하는 학생
              </label>
              <input
                type="text"
                id="companionStudents"
                name="companionStudents"
                value={formData.companionStudents}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="신청 목록에서 <함께 신청> 버튼으로 수강 희망 학생이 직접 신청가능합니다."
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
                disabled={isSubmitting || (currentUserRole !== "teacher" && !isPeriodOpen)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (currentUserRole !== "teacher" && !isPeriodOpen)}
              title={
                currentUserRole !== "teacher" && !isPeriodSet
                  ? "교사가 신청 기간을 설정하지 않았습니다."
                  : currentUserRole !== "teacher" && !isPeriodOpen
                  ? "현재는 신청 기간이 아닙니다."
                  : undefined
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "신청 중..." : "신청하기"}
            </Button>
          </div>
        </form>
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "대기중", className: "bg-yellow-100 text-yellow-800 whitespace-nowrap" },
      approved: { label: "승인", className: "bg-green-100 text-green-800 whitespace-nowrap" },
      rejected: { label: "거절", className: "bg-red-100 text-red-800 whitespace-nowrap" },
      ended: { label: "수강 종료", className: "bg-gray-100 text-gray-700 whitespace-nowrap" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const handleTeacherStatusUpdate = async (requestId: string, nextStatus: "pending" | "approved" | "rejected" | "ended") => {
    const prevRequests = requests;
    try {
      // optimistic update (UI only)
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: nextStatus } : r))
      );
      const res = await fetch(`/api/after-school/requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "상태 변경에 실패했습니다.");
      // If server returns normalized status, sync it (no full refresh)
      const serverStatus = data?.request?.status as ("pending" | "approved" | "rejected" | "ended" | undefined);
      if (serverStatus && serverStatus !== nextStatus) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: serverStatus } : r))
        );
      }
    } catch (err: any) {
      console.error(err);
      // rollback optimistic update
      setRequests(prevRequests);
      alert(err?.message || "상태 변경 중 오류가 발생했습니다.");
    }
  };

  const renderStatusCell = (request: CourseRequest) => {
    const current = (request.status as "pending" | "approved" | "rejected" | "ended") || "pending";
    if (currentUserRole !== "teacher") {
      return getStatusBadge(current);
    }

    return (
      <div
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="p-0 border-0 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            // cycle status: pending -> approved -> rejected -> ended -> pending
            const next =
              current === "pending"
                ? "approved"
                : current === "approved"
                ? "rejected"
                : current === "rejected"
                ? "ended"
                : "pending";
            handleTeacherStatusUpdate(request.id, next);
          }}
          title="클릭하여 상태 변경"
        >
          {getStatusBadge(current)}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3" style={{ minHeight: '2.5rem' }}>
            <h2 className="text-lg font-semibold text-gray-900">희망 강의 신청</h2>

            <div className="flex items-center gap-3">
              {/* If teacher, show editable inputs + save button. Otherwise show read-only text. */}
              {currentUserRole === "teacher" ? (
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-700 mr-1 hidden sm:block">{/*기간 적었던 곳*/}</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPeriodStart(v);
                      if (periodEnd && new Date(v) > new Date(periodEnd)) {
                        setPeriodEnd("");
                      }
                    }}
                    max={periodEnd || undefined}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                    aria-label="기간 시작일"
                    title="기간 시작일"
                  />
                  <span className="text-sm text-gray-500">~</span>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (periodStart && new Date(v) < new Date(periodStart)) {
                        setPeriodEnd(periodStart);
                      } else {
                        setPeriodEnd(v);
                      }
                    }}
                    min={periodStart || undefined}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                    aria-label="기간 종료일"
                    title="기간 종료일"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setPeriodLoading(true);
                        const res = await fetch("/api/after-school/periods/student_requests", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ start: periodStart || null, end: periodEnd || null }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          alert(data?.error || "기간 저장에 실패했습니다.");
                          return;
                        }
                        alert("기간이 저장되었습니다.");
                      } catch (err) {
                        console.error(err);
                        alert("기간 저장 중 오류가 발생했습니다.");
                      } finally {
                        setPeriodLoading(false);
                      }
                    }}
                    disabled={periodLoading || Boolean(periodStart && periodEnd && new Date(periodEnd) < new Date(periodStart))}
                    className="inline-flex items-center px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
                  >
                    {periodLoading ? "저장중..." : "저장"}
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">신청 기간</span>
                  <span className="mx-2 w-px h-3 bg-gray-300" /> {/* 수직 구분선 추가 (선택사항) */}
                  <span className="text-sm font-medium text-gray-800">
                    {periodStart || "미설정"}
                    {periodEnd ? ` ~ ${periodEnd}` : ""}
                  </span>
                </span>
              )}

              {showApplyButton ? (
                <Button
                  onClick={handleOpen}
                  className="bg-blue-600 hover:bg-blue-700 h-10 whitespace-nowrap"
                  disabled={currentUserRole !== "teacher" && !isPeriodOpen}
                  title={
                    currentUserRole !== "teacher" && !isPeriodSet
                      ? "교사가 신청 기간을 설정하지 않았습니다."
                      : currentUserRole !== "teacher" && !isPeriodOpen
                      ? "현재는 신청 기간이 아닙니다."
                      : undefined
                  }
                >
                  신청
                </Button>
              ) : (
                <div className="h-10" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            원하는 강의를 신청할 수 있습니다.(
              <span className="ml-1 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                수강 신청
              </span>
              은 별개)
          </p>
        </div>

        {/* 신청 목록 게시판 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">희망 강의 신청 목록</h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">신청 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">번호</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">희망 강좌명</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">학생명</th>
                    {currentUserRole !== "teacher" && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">함께 신청</th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">총 신청 인원</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">상태</th>
                    {currentUserRole === "teacher" && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">편집</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request, index) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(request)}>
                      <td className="py-3 px-4 text-sm text-gray-600">{requests.length - index}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{request.courseName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{request.studentName}</td>
                      {currentUserRole !== "teacher" && (
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {/* 함께 신청 버튼: only allow if current user is student and not the same user and not already included */}
                          {currentUserRole === "student" &&
                          currentUserId &&
                          currentUserName &&
                          request.studentId &&
                          request.studentId !== currentUserId ? (
                            <button
                            type="button"
                            disabled={!isPeriodOpen}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!isPeriodOpen) {
                                alert(!isPeriodSet ? "교사가 신청 기간을 설정하지 않았습니다." : "현재는 신청 기간이 아닙니다.");
                                return;
                              }
                              const ids = Array.isArray(request.companionStudentUserIds) ? request.companionStudentUserIds : [];
                              const already = ids.includes(currentUserId);
                              if (already) {
                                const confirmCancel = window.confirm("신청을 취소하시겠습니까?");
                                if (!confirmCancel) return;
                                try {
                                  const res = await fetch(`/api/after-school/requests/${request.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ companionAction: "remove" }),
                                  });
                                  if (!res.ok) throw new Error("취소 실패");
                                  await fetchRequests();
                                } catch (err) {
                                  console.error(err);
                                  alert("취소 중 오류가 발생했습니다.");
                                }
                              } else {
                                const confirmAdd = window.confirm("이 강의를 함께 신청하시겠습니까?");
                                if (!confirmAdd) return;
                                try {
                                  const res = await fetch(`/api/after-school/requests/${request.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ companionAction: "add" }),
                                  });
                                  if (!res.ok) throw new Error("추가 실패");
                                  await fetchRequests();
                                } catch (err) {
                                  console.error(err);
                                  alert("추가 중 오류가 발생했습니다.");
                                }
                              }
                            }}
                            title={
                              !isPeriodSet
                                ? "교사가 신청 기간을 설정하지 않았습니다."
                                : !isPeriodOpen
                                ? "현재는 신청 기간이 아닙니다."
                                : undefined
                            }
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap border ${
                              !isPeriodOpen
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" // period closed
                                : (Array.isArray(request.companionStudentUserIds) ? request.companionStudentUserIds : []).includes(currentUserId)
                                ? "bg-gray-100 text-gray-400 border-gray-200" // already added
                                : "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" // can add
                            }`}
                          >
                            {(Array.isArray(request.companionStudentUserIds) ? request.companionStudentUserIds : []).includes(currentUserId)
                              ? "추가됨"
                              : "함께 신청"}
                          </button>
                          ) : (
                            <span className="text-sm text-gray-400">신청자</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap text-center">
                        {(Array.isArray(request.companionStudentUserIds) ? request.companionStudentUserIds.length : 0) + 1}
                      </td>
                      <td className="py-3 px-4">{renderStatusCell(request)}</td>
                      {currentUserRole === "teacher" && (
                        <td className="py-3 px-4">
                          <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((prev) => (prev === request.id ? null : request.id));
                              }}
                              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                              aria-label="편집 메뉴"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === request.id && (
                              <div className="absolute right-0 top-full mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      openDetail(request, { startEditing: true });
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
                                      handleDeleteRequest(request.id);
                                    }}
                                    disabled={deletingId === request.id}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {deletingId === request.id ? "삭제 중..." : "삭제"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* 상세 모달 (신청 모달과 동일한 스타일) */}
        {isDetailOpen && selectedRequest && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 py-8 sm:py-8"
            role="dialog"
            aria-modal="true"
            onClick={closeDetail}
          >
            <div
              className="relative w-full max-w-2xl max-h-[92vh] rounded-xl bg-white shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">신청 상세</h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    selectedRequest &&
                    (currentUserRole === "teacher" || currentUserId === selectedRequest.studentId)
                  ) {
                    handleUpdateRequest(selectedRequest.id);
                  }
                }}
                className="px-6 py-6 overflow-y-auto flex-1 min-h-0"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        희망 강좌명 <span className="text-red-500">*</span>
                      </label>
                      {/*
                        Read-only inputs should look disabled (gray background) when the user cannot edit.
                        Editable state: author + isEditingDetail
                      */}
                      {(() => {
                        const canEdit =
                          isEditingDetail &&
                          (currentUserRole === "teacher" || currentUserId === selectedRequest?.studentId);
                        const inputClass = canEdit
                          ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700";
                        return (
                          <input
                            name="courseName"
                            value={detailForm.courseName}
                            onChange={handleDetailChange}
                            readOnly={!canEdit}
                            required
                            className={inputClass}
                          />
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">작성자</label>
                      <input
                        type="text"
                        readOnly
                        aria-readonly="true"
                        value={
                          `${(selectedRequest.authorStudentId || "").trim()} ${(selectedRequest.studentName || "").trim()}`.trim() ||
                          "정보 없음"
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      듣고 싶은 내용 <span className="text-red-500">*</span>
                    </label>
                    {(() => {
                      const canEdit =
                        isEditingDetail &&
                        (currentUserRole === "teacher" || currentUserId === selectedRequest?.studentId);
                      const inputClass = canEdit
                        ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                        : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 resize-none";
                      return (
                    <textarea
                      name="desiredContent"
                      value={detailForm.desiredContent}
                      onChange={handleDetailChange}
                      readOnly={!canEdit}
                      required
                      rows={5}
                      className={inputClass}
                    />
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
                    {(() => {
                      const canEdit =
                        isEditingDetail &&
                        (currentUserRole === "teacher" || currentUserId === selectedRequest?.studentId);
                      const inputClass = canEdit
                        ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                        : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 resize-none";
                      return (
                    <textarea
                      name="notes"
                      value={detailForm.notes}
                      onChange={handleDetailChange}
                      readOnly={!canEdit}
                      rows={3}
                      className={inputClass}
                    />
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">함께 신청하는 학생</label>
                    <input
                      name="companionStudents"
                      value={detailForm.companionStudents}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  {currentUserRole === "teacher" || currentUserId === selectedRequest.studentId ? (
                    <>
                      {!isEditingDetail ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTimeout(() => {
                              setIsEditingDetail(true);
                            }, 0);
                          }}
                        >
                          수정
                        </Button>
                      ) : (
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          저장
                        </Button>
                      )}
                      <Button type="button" variant="danger" onClick={() => handleDeleteRequest(selectedRequest.id)}>
                        삭제
                      </Button>
                    </>
                  ) : null}
                  <Button type="button" variant="outline" onClick={closeDetail}>
                    닫기
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {mounted && isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
}

