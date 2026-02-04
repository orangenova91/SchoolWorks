 "use client";

 import { useEffect, useState } from "react";
 import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/components/providers/ToastProvider";
 import { MoreVertical, X } from "lucide-react";
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [detailLocalCourse, setDetailLocalCourse] = useState<any | null>(null);
  const [detailClassGroupId, setDetailClassGroupId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const { showToast } = useToastContext();
  const [showClassGroup, setShowClassGroup] = useState(true);
  const [cgName, setCgName] = useState("");
  const [cgPeriod, setCgPeriod] = useState("1");
  const [cgSchedules, setCgSchedules] = useState<Array<{ day: string; period: string }>>([{ day: "", period: "" }]);
  const [cgErrors, setCgErrors] = useState<{ name?: string; period?: string; schedules?: string }>({});
  const [detailForm, setDetailForm] = useState({
    subject: "",
    classroom: "",
    description: "",
    academicYear: "",
    semester: "",
  });
  const semesterOptions = [
    { value: "", label: "학기 선택" },
    { value: "1학기", label: "1학기" },
    { value: "2학기", label: "2학기" },
  ];

  useEffect(() => {
    setMounted(true);
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    const onWindowClick = () => setOpenMenuId(null);
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [openMenuId]);

  const fetchCourses = async (options?: { force?: boolean }) => {
    try {
      // If user is actively editing a detail, skip fetching to avoid interfering with edit session.
      if (isEditingDetail && !options?.force) {
        console.log("fetchCourses skipped because isEditingDetail === true");
        return;
      }
      setIsLoading(true);
      const res = await fetch("/api/after-school/courses");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "강의 목록을 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      const newCourses = data.courses || [];
      setCourses(newCourses);
      // If a detail modal is open and NOT in editing mode, refresh selectedCourse/detailForm.
      // If editing, skip syncing to avoid interrupting the user's edits.
      if (detailLocalCourse && !isEditingDetail) {
        const updated = newCourses.find((c: any) => c.id === detailLocalCourse.id);
        if (updated) {
          setDetailLocalCourse(updated);
          setSelectedCourse(updated);
          setDetailForm({
            subject: updated.subject || "",
            classroom: updated.classroom || "",
            description: updated.description || "",
            academicYear: updated.academicYear || "",
            semester: updated.semester || "",
          });
        } else {
          // If the course was deleted/removed, close the detail modal
          closeDetail();
        }
      }
    } catch (err) {
      console.error("Fetch courses error:", err);
      setError(err instanceof Error ? err.message : "강의 목록을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    // Open the detail-style modal in "create" mode using a local blank course.
    const blankCourse = {
      id: "new",
      subject: "",
      classroom: "",
      description: "",
      academicYear: `${new Date().getFullYear()}`,
      semester: "",
      instructor: instructorName,
    };
    openDetail(blankCourse, { startEditing: true });
  };
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
              // After class created, refresh list. Do not auto-open class-group modal.
              await fetchCourses();
            }}
          />
          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  ) : null;

  // Rendered course used by the detail modal. Use local kept copy first to avoid unmounts during editing.
  const renderedCourse = detailLocalCourse ?? selectedCourse ?? null;

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

  const handleApplyClick = (courseId: string) => {
    const ok = window.confirm("해당 강좌에 신청하시겠습니까? (학생 계정으로 신청해야 합니다.)");
    if (!ok) return;
    // Placeholder behavior: real apply flow should be implemented for student users.
    window.alert("신청 기능은 학생 계정에서 진행해야 합니다. (추후 구현 예정)");
    console.log("Apply requested for course:", courseId);
  };

  const openDetail = (course: any, options?: { startEditing?: boolean }) => {
    setSelectedCourse(course);
    setDetailLocalCourse(course);
    setDetailForm({
      subject: course.subject || "",
      classroom: course.classroom || "",
      description: course.description || "",
      academicYear: course.academicYear || "",
      semester: course.semester || "",
    });
    setIsEditingDetail(Boolean(options?.startEditing));
    // Initialize class-group fields.
    setCgName("");
    setCgPeriod("1");
    setCgSchedules([{ day: "", period: "" }]);
    setCgErrors({});

    // If opening an existing course, fetch its class-groups and populate the fields
    if (course && course.id && course.id !== "new") {
      (async () => {
        try {
          const res = await fetch(`/api/courses/${course.id}/class-groups`);
          if (!res.ok) return;
          const data = await res.json().catch(() => null);
          const groups = data?.classGroups || [];
          if (Array.isArray(groups) && groups.length > 0) {
            const g = groups[0];
            setDetailClassGroupId(g.id || null);
            setCgName(g.name || "");
            setCgPeriod((g.period as string) || "1");
            setCgSchedules(Array.isArray(g.schedules) && g.schedules.length > 0 ? g.schedules : [{ day: "", period: "" }]);
            setCgErrors({});
          } else {
            setDetailClassGroupId(null);
          }
        } catch (err) {
          console.error("Failed to fetch class-groups:", err);
        }
      })();
    }
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    // Trace who/what called closeDetail to help debug unexpected closes.
    console.trace("closeDetail called");
    setIsDetailOpen(false);
    setSelectedCourse(null);
    setDetailLocalCourse(null);
    setIsEditingDetail(false);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDetailForm((p) => ({ ...p, [name]: value }));
  };

  const handleCgPeriodChange = (value: string) => {
    setCgPeriod(value);
    const periodCount = parseInt(value, 10) || 0;
    if (periodCount > 0) {
      setCgSchedules((prev) => {
        const newSchedules = Array.from({ length: periodCount }, (_, index) => {
          return prev[index] || { day: "", period: "" };
        });
        return newSchedules;
      });
    }
  };

  const handleCgScheduleChange = (index: number, field: "day" | "period", value: string) => {
    setCgSchedules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("정말 이 강좌를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      await fetchCourses({ force: true });
      closeDetail();
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateCourse = async (id: string) => {
    try {
      let createdCourseId: string | undefined = undefined;
      if (id === "new") {
        // Create new after-school course using the full classes endpoint so fields persist
        const payload = {
          courseType: "after_school",
          academicYear: detailForm.academicYear || "",
          semester: detailForm.semester || "",
          subjectGroup: "-",
          subjectArea: "-",
          careerTrack: "-",
          subject: detailForm.subject || "",
          grade: "",
          classroom: detailForm.classroom || "",
          description: detailForm.description || "",
          instructor: instructorName || "",
        };
        const res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const responseBody = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(responseBody?.error || "생성 실패");
        }
        createdCourseId = responseBody?.class?.id;
        // If user requested class-group creation, attempt to create it as well
        if (showClassGroup && createdCourseId) {
          // validate class-group inputs
          const periodNum = parseInt(cgPeriod, 10) || 0;
          const incomplete = cgSchedules.slice(0, periodNum).some((s) => !s.day || !s.period);
          const errors: { name?: string; period?: string; schedules?: string } = {};
          if (!cgName.trim()) errors.name = "학반명을 입력해주세요.";
          if (!periodNum || periodNum < 1) errors.period = "차시 수를 올바르게 입력하세요.";
          if (periodNum > 0 && incomplete) errors.schedules = "모든 차시의 요일과 교시를 입력해주세요.";
          if (Object.keys(errors).length > 0) {
            setCgErrors(errors);
            showToast?.("학반 정보를 확인하세요.", "error");
          } else {
            try {
              const cgRes = await fetch(`/api/courses/${createdCourseId}/class-groups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: cgName.trim(),
                  period: cgPeriod.trim() || null,
                  schedules: cgSchedules.slice(0, periodNum).filter((s) => s.day && s.period),
                  studentIds: [],
                }),
              });
              if (!cgRes.ok) {
                showToast?.("수업은 생성되었으나 학반 정보 등록에 실패했습니다. 수동으로 등록해 주세요.", "warning");
              } else {
                showToast?.("학반이 함께 생성되었습니다.", "success");
              }
            } catch (err) {
              console.error("class-group create error:", err);
              showToast?.("수업은 생성되었으나 학반 정보 등록에 실패했습니다. 수동으로 등록해 주세요.", "warning");
            }
          }
        }
      } else {
        const res = await fetch(`/api/courses/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailForm),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "수정 실패");
        }
      }

      // Determine courseId to use for class-group operations
      const courseIdToUse = createdCourseId ?? (id === "new" ? undefined : id);

      // If class-group inputs present, attempt to create or update class-group
      if (cgName.trim() && courseIdToUse) {
        setCgErrors({});
        const periodNum = parseInt(cgPeriod, 10) || 0;
        const incomplete = cgSchedules.slice(0, periodNum).some((s) => !s.day || !s.period);
        const errors: { name?: string; period?: string; schedules?: string } = {};
        if (!cgName.trim()) errors.name = "학반명을 입력해주세요.";
        if (!periodNum || periodNum < 1) errors.period = "차시(교시 수)를 올바르게 입력하세요.";
        if (periodNum > 0 && incomplete) errors.schedules = "모든 차시의 요일과 교시를 입력해주세요.";
        if (Object.keys(errors).length > 0) {
          setCgErrors(errors);
          showToast?.("학반 정보를 확인하세요.", "error");
        } else {
          try {
            if (detailClassGroupId) {
              // update existing
              const cgRes = await fetch(`/api/courses/${courseIdToUse}/class-groups/${detailClassGroupId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: cgName.trim(),
                  period: cgPeriod.trim() || null,
                  schedules: cgSchedules.slice(0, periodNum).filter((s) => s.day && s.period),
                  studentIds: [],
                }),
              });
              if (!cgRes.ok) {
                showToast?.("학반 수정에 실패했습니다. 수동으로 확인해 주세요.", "warning");
              } else {
                showToast?.("학반이 수정되었습니다.", "success");
              }
            } else {
              // create new
              const cgRes = await fetch(`/api/courses/${courseIdToUse}/class-groups`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: cgName.trim(),
                  period: cgPeriod.trim() || null,
                  schedules: cgSchedules.slice(0, periodNum).filter((s) => s.day && s.period),
                  studentIds: [],
                }),
              });
              if (!cgRes.ok) {
                showToast?.("수업은 생성되었으나 학반 정보 등록에 실패했습니다. 수동으로 등록해 주세요.", "warning");
              } else {
                showToast?.("학반이 함께 생성되었습니다.", "success");
              }
            }
          } catch (err) {
            console.error("class-group create/update error:", err);
            showToast?.("학반 정보 등록 중 오류가 발생했습니다.", "warning");
          }
        }
      }

      await fetchCourses({ force: true });
      setIsEditingDetail(false);
      closeDetail();
    } catch (err) {
      console.error(err);
      alert((err instanceof Error && err.message) ? err.message : "수정 중 오류가 발생했습니다.");
    }
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
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">스케줄</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">강사</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">수강 신청</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">수강생 수</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">편집</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c: any, idx: number) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(c);
                      }}
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">{courses.length - idx}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{c.subject}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.classGroupSchedule || "-"}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.instructor}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <Button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const payload = { open: !(c.enrollmentOpen ?? true) };
                              // Try PUT first; if server/hosting blocks PUT (405), fallback to POST
                              let res = await fetch(`/api/courses/${c.id}/enrollment`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload),
                              }).catch(() => null);

                              if (!res || res.status === 405) {
                                res = await fetch(`/api/courses/${c.id}/enrollment`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload),
                                });
                              }

                              const data = await res.json().catch(() => null);
                              if (!res.ok) {
                                alert(data?.error || "상태 변경에 실패했습니다.");
                                return;
                              }
                              // refresh list to reflect change
                              await fetchCourses({ force: true });
                            } catch (err) {
                              console.error(err);
                              alert("상태 변경 중 오류가 발생했습니다.");
                            }
                          }}
                          className={`flex items-center justify-center px-2 h-7 rounded-md text-sm ${
                            c.enrollmentOpen ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {c.enrollmentOpen ? "신청 받기" : "신청 닫음"}
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {Array.isArray(c.firstClassGroupStudentIds) ? `${c.firstClassGroupStudentIds.length}명` : "0명"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((prev) => (prev === c.id ? null : c.id));
                            }}
                            className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                            aria-label="편집 메뉴"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === c.id && (
                            <div className="absolute right-0 top-full mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    openDetail(c, { startEditing: true });
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
                                    handleDeleteCourse(c.id);
                                  }}
                                  disabled={deletingId === c.id}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === c.id ? "삭제 중..." : "삭제"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* 상세 모달: 강의 정보 보기/수정 */}
        {/* detail modal is rendered via portal at the end to avoid unmounts during list re-renders */}
        {/* Placeholder here; actual portal rendering happens after return */}
      </div>
      {mounted && isModalOpen && createPortal(modal, document.body)}
      {mounted && isDetailOpen &&
        createPortal(
          <div
            key="course-detail-modal"
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
                <h2 className="text-lg font-semibold text-gray-900">강의 상세</h2>
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
                  // Only allow submitting when in editing mode to avoid accidental submits
                  if (!isEditingDetail) return;
                  const courseId = (detailLocalCourse?.id ?? selectedCourse?.id) as string | undefined;
                  if (courseId) {
                    handleUpdateCourse(courseId);
                  }
                }}
                // Prevent Enter from submitting the form unless we're actively editing.
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isEditingDetail) {
                    e.preventDefault();
                  }
                }}
                className="px-6 py-6 overflow-y-auto flex-1 min-h-0"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      const canEdit = isEditingDetail;
                      const inputClass = canEdit
                        ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700";
                      return (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              학년도 <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="academicYear"
                              value={detailForm.academicYear}
                              onChange={handleDetailChange}
                              readOnly={!canEdit}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              학기 <span className="text-red-500">*</span>
                            </label>
                            <Select
                              name="semester"
                              value={detailForm.semester}
                              onChange={handleDetailChange}
                              options={semesterOptions}
                              placeholder="학기 선택"
                              disabled={!canEdit}
                              className={canEdit ? undefined : "bg-gray-50 text-gray-700"}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        강좌명 <span className="text-red-500">*</span>
                      </label>
                      {(() => {
                        const canEdit = isEditingDetail;
                        const inputClass = canEdit
                          ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700";
                        return (
                          <input
                            name="subject"
                            value={detailForm.subject}
                            onChange={handleDetailChange}
                            readOnly={!canEdit}
                            required
                            className={inputClass}
                          />
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">강사</label>
                      <input
                        type="text"
                        readOnly
                        aria-readonly="true"
                        value={renderedCourse?.instructor || ""}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* description comes next; class-group section moved below description */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">강의실</label>
                    {(() => {
                      const canEdit = isEditingDetail;
                      const inputClass = canEdit
                        ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700";
                      return (
                        <input
                          name="classroom"
                          value={detailForm.classroom}
                          onChange={handleDetailChange}
                          readOnly={!canEdit}
                          className={inputClass}
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      강의소개 <span className="text-red-500">*</span>
                    </label>
                    {(() => {
                      const canEdit = isEditingDetail;
                      const inputClass = canEdit
                        ? "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                        : "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 resize-none";
                      return (
                        <textarea
                          name="description"
                          value={detailForm.description}
                          onChange={handleDetailChange}
                          readOnly={!canEdit}
                          rows={4}
                          className={inputClass}
                        />
                      );
                    })()}
                  </div>

                  {/* Class-group section moved here (after description) */}
                  <div>
                    <div className="mt-4 space-y-4">
                      

                      <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">학반명 <span className="text-red-500">*</span></label>
                            <Input
                              value={cgName}
                              onChange={(e) => isEditingDetail && setCgName(e.target.value)}
                              placeholder="예: 1반"
                              readOnly={!isEditingDetail}
                              aria-readonly={!isEditingDetail}
                            />
                            {cgErrors.name && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.name}</p>}
                          </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">차시(교시 수) <span className="text-red-500">*</span></label>
                              <Input
                                value={cgPeriod}
                                onChange={(e) => isEditingDetail && handleCgPeriodChange(e.target.value)}
                                readOnly={!isEditingDetail}
                                aria-readonly={!isEditingDetail}
                              />
                              {cgErrors.period && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.period}</p>}
                            </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">스케줄 <span className="text-red-500">*</span></label>
                            <div className="space-y-2">
                              {cgSchedules.map((s, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Select
                                      options={[
                                        { value: "", label: "요일 선택" },
                                        { value: "월", label: "월요일" },
                                        { value: "화", label: "화요일" },
                                        { value: "수", label: "수요일" },
                                        { value: "목", label: "목요일" },
                                        { value: "금", label: "금요일" },
                                      ]}
                                      value={s.day}
                                      onChange={(e) => isEditingDetail && handleCgScheduleChange(idx, "day", e.target.value)}
                                      className="flex-1"
                                      disabled={!isEditingDetail}
                                    />
                                    <Select
                                      options={[{ value: "", label: "교시 선택" }, ...Array.from({ length: 10 }, (_, i) => ({ value: `${i+1}`, label: `${i+1}교시` }))]}
                                      value={s.period}
                                      onChange={(e) => isEditingDetail && handleCgScheduleChange(idx, "period", e.target.value)}
                                      className="flex-1"
                                      disabled={!isEditingDetail}
                                    />
                                </div>
                              ))}
                            </div>
                            {cgErrors.schedules && <p className="mt-1 text-sm text-red-600" role="alert">{cgErrors.schedules}</p>}
                          </div>
                        </div>
                      </>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  {!isEditingDetail ? (
                    <Button
                      type="button"
                      variant="outline"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Defer switching to editing mode to avoid click turning into submit
                        setTimeout(() => {
                          setIsEditingDetail(true);
                        }, 0);
                      }}
                    >
                      수정
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      저장
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse((detailLocalCourse?.id ?? selectedCourse?.id) as string);
                    }}
                  >
                    삭제
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDetail();
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      
    </>
  );
}


